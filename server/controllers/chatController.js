
import Chat from "../models/chat.js";
import Admin from "../models/user.js";
import { json } from "express";
import { io, users } from "../server.js"; // Import WebSocket server
import Message from "../models/message.js";

export const showAllChatsOfUser = async (req, res) => {
    try {
        const { _id } = req.params;

        // Find only 1-on-1 chats involving this user
        const chats = await Chat.find({
            participants: _id,
            $where: 'this.participants.length === 2'
        })
            .populate({
                path: 'participants',
                select: 'username name pfp',
                match: { _id: { $ne: _id } }
            })
            .populate({
                path: 'lastMessage',
                select: 'content sender createdAt',
                populate: {
                    path: 'sender',
                    select: 'name'
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Calculate unread counts for each chat
        const chatsWithUnreadCounts = await Promise.all(
            chats.map(async chat => {
                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    readBy: { $ne: _id }, // Not read by current user
                    sender: { $ne: _id }  // Exclude messages sent by current user
                });

                const otherParticipant = chat.participants[0];

                return {
                    _id: chat._id,
                    participant: otherParticipant,
                    lastMessage: chat.lastMessage ? {
                        _id: chat.lastMessage._id,
                        content: chat.lastMessage.content,
                        sender: chat.lastMessage.sender,
                        createdAt: chat.lastMessage.createdAt
                    } : null,
                    unreadCount, // Now with actual count
                    updatedAt: chat.updatedAt
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Chats retrieved successfully",
            chats: chatsWithUnreadCounts
        });
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching chats",
            error: error.message
        });
    }
};

export const deleteChat = async (req, res) => {
    try {
        const { _id } = req.body;

        // Find the chat by ID
        const chat = await Chat.findById(_id);
        if (!chat) {
            return res.status(404).json({ message: "Chat does not exist" });
        }

        // Delete the chat
        await Chat.findByIdAndDelete(_id);

        res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting chat", error });
    }
};



export const sendMessage = async (req, res) => {
    try {
        const { senderId, message, receiverId } = req.body;

        // Validate input
        if (!senderId || !receiverId || !message) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields (senderId, chatId, or message)"
            });
        }

        let newChat;

        // 1. Find the chat
        let chat = await Chat.findOne({
            participants: { $all: [senderId, receiverId], $size: 2 }
        })

        if (!chat) {
            chat = await Chat.create({
                createdAt: Date.now(),
                updatedAt: Data.now(),
                participants: [senderId, receiverId],
                lastMessage: null
            })
            await newChat.save();
        }

        const newMessage = await Message.create({
            chat: chat._id,
            content: message,
            createdAt: new Date(),
            readBy: [senderId]
        })
        await newMessage.save();

        newChat.lastMessage = newMessage._id;
        await newChat.save();

        // 3. Get the saved message with populated sender
        const savedMessage = await Message.findById(chat.messages[chat.messages.length - 1]._id)
            .populate('sender', 'name pfp username');

        // 4. Prepare response data
        const messageData = {
            chatId: chat._id,
            _id: savedMessage._id,
            content: savedMessage.content,
            sender: {
                _id: savedMessage.sender._id,
                name: savedMessage.sender.name,
                avatar: savedMessage.sender.avatar
            },
            createdAt: savedMessage.createdAt,
            isRead: false // For receiver
        };

        // 6. Emit real-time message to receiver if online
        if (receiverId && users[receiverId]) {
            io.to(users[receiverId]).emit("receiveMessage", {
                ...messageData,
                unreadCount: await Message.countDocuments({
                    chat: chat._id,
                    readBy: { $ne: receiverId },
                    sender: { $ne: receiverId }
                })
            });
        }

        res.status(201).json({
            success: true,
            message: "Message sent successfully",
            data: messageData
        });

    } catch (error) {
        console.error("Error in sendMessage:", error);
        res.status(500).json({
            success: false,
            message: "Failed to send message",
            error: error.message
        });
    }
};

export const getMessages = async (req, res) => {
    const { _id } = req.params;
    console.log('Get message', _id)
    try {

        const chat = await Chat.findById(_id);
        if (!chat) {
            return res.status(404).json({ message: "Chat Not Found" });
        }
        if (chat && chat.messages.length === 0) {
            return res.status(200).json({ messages: [], message: "No messages in this chat!" })
        }
        const messages = chat?.messages?.map((msg) => ({
            message: msg.content,
            read: msg.read,
            sender: msg.sender,
            _id: msg._id
        })) || [];

        res.status(200).json({ messages, message: "Messages sent successfully!" });
    } catch (e) {
        res.status(500).json({ message: 'Internal Server Error' })
    }
}