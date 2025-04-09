
import Chat from "../models/chat.js";
import User from "../models/user.js";
import { json } from "express";
import { io, users } from "../server.js"; // Import WebSocket server
import Message from "../models/message.js";


export const showAllChatsOfUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Find only 1-on-1 chats involving this user
        const chats = await Chat.find({
            participants: id,
            $where: 'this.participants.length === 2'
        })
            .populate({
                path: 'participants',
                select: 'username name pfp'
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

        const chatsWithUnreadCounts = await Promise.all(
            chats.map(async chat => {
                // Filter out the current user from participants
                const otherParticipant = chat.participants.find(p => p._id.toString() !== id);

                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    readBy: { $ne: id },
                    sender: { $ne: id }
                });

                return {
                    _id: chat._id,
                    participant: otherParticipant, // Only the other user
                    lastMessage: chat.lastMessage ? {
                        _id: chat.lastMessage._id,
                        content: chat.lastMessage.content,
                        sender: chat.lastMessage.sender,
                        createdAt: chat.lastMessage.createdAt
                    } : null,
                    unreadCount,
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
                message: "Missing required fields (senderId, receiverId, or message)"
            });
        }

        // 1. Find existing chat between sender and receiver
        let chat = await Chat.findOne({
            participants: { $all: [senderId, receiverId], $size: 2 }
        });

        // 2. If no chat found, create a new one
        if (!chat) {
            chat = await Chat.create({
                participants: [senderId, receiverId],
                createdAt: new Date(),
                updatedAt: new Date(),
                lastMessage: null
            });
        }

        // 3. Create a new message
        const newMessage = await Message.create({
            chat: chat._id,
            content: message,
            sender: senderId,
            createdAt: new Date(),
            readBy: [senderId]
        });

        // 4. Update the chat with the last message
        chat.lastMessage = newMessage._id;
        chat.updatedAt = new Date();
        await chat.save();

        // 5. Populate the sender info in the saved message
        const savedMessage = await Message.findById(newMessage._id)
            .populate('sender', 'name avatar username');

        // 6. Prepare response object
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
            isRead: false // for receiver
        };

        // 7. Emit real-time message to receiver if online
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

        // 8. Send response
        res.status(200).json({
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
    const { _id } = req.params; // This is the chat ID

    try {
        // Optional: Check if chat exists
        const chat = await Chat.findById(_id);
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Fetch messages related to the chat ID
        const messages = await Message.find({ chat: _id })
            .populate('sender', 'name username pfp') // populate sender details
            .sort({ createdAt: 1 }) // you can change to -1 if you want latest first

        if (!messages || messages.length === 0) {
            return res.status(200).json({ messages: [], message: "No messages in this chat!" });
        }

        res.status(200).json({ messages, message: "Messages fetched successfully!" });
    } catch (e) {
        console.error("Error fetching messages:", e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};
