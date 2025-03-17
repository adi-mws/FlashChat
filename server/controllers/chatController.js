
import Chat from "../models/chat.js";
import Admin from "../models/admin.js";
import { json } from "express";
import { io, users } from "../server.js"; // Import WebSocket server


export const createChat = async (req, res) => {
    try {
        const { user1Id, user2Email } = req.body; // Get user1 ID and user2 email from request
        // Find user2 by email
        // console.log(user1Id, user2Email)
        const user2 = await Admin.findOne({ email: user2Email });
        if (!user2) {
            return res.status(404).json({ message: "User2 not found" });
        }

        // Check if a chat already exists
        const existingChat = await Chat.findOne({
            $or: [
                { user1: user1Id, user2: user2._id },
                { user1: user2._id, user2: user1Id },
            ],
        });

        if (existingChat) {
            return res.status(200).json({ message: "Chat already exists", chat: existingChat });
        }

        // Create a new chat
        const newChat = new Chat({
            user1: user1Id,
            user2: user2._id,
            messages: [],
        });

        await newChat.save();

        res.status(201).json({ message: "Chat created successfully", user: { chatId: newChat._id, name: user2.name, email: user2.email, _id: user2._id } });
    }
    catch (error) {
        res.status(500).json({ message: "Error creating chat", error });
    }
};


export const showAllChatsOfUser = async (req, res) => {
    try {
        const { _id } = req.params; // User ID from request

        // Find all chats where the user is either user1 or user2
        const chats = await Chat.find({
            $or: [{ user1: _id }, { user2: _id }]
        }).populate("user1 user2", "name email"); // Populate user details
        // console.log(_id)
        if (chats.length === 0) {
            return res.status(404).json({ message: "No chats found for this user" });
        }

        // Extract only the corresponding user (exclude messages)
        const userList = chats.map(chat => {
            return chat.user1._id.toString() === _id
                ? { chatId: chat._id, _id: chat.user2._id, name: chat.user2.name, email: chat.user2.email }
                : { chatId: chat._id, _id: chat.user1._id, name: chat.user1.name, email: chat.user1.email };
        });

        res.status(200).json({ message: "Chats retrieved successfully", users: userList });
    } catch (error) {
        res.status(500).json({ message: "Error fetching chats", error });
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
        const { chatId, senderId, message } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(404).json({ message: 'Chat not found!' });
        }

        // Ensure ObjectId comparison works correctly
        const receiverId = chat.user1.equals(senderId) ? chat.user2 : chat.user1;

        // Create a new message
        const newMessage = {
            sender: senderId,
            content: message
        };

        // Push to chat messages array
        chat.messages.push(newMessage);

        // Save chat and ensure it is stored in MongoDB
        await chat.save();

        // Get the saved message (MongoDB assigns _id automatically)
        const savedMessage = chat.messages[chat.messages.length - 1];

        // Emit message to receiver if they are online
        if (receiverId && users[receiverId]) {
            io.to(users[receiverId]).emit("receiveMessage", {
                chatId: chatId,
                senderId: savedMessage.sender,
                _id: savedMessage._id, // Now `_id` is defined
                message: savedMessage.content
            });
        }

        res.status(201).json({ message: "Message sent successfully", newMessage: savedMessage });
    } catch (error) {
        console.error("Error sending message:", error);
        res.status(500).json({ message: "Error sending message", error: error.message });
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