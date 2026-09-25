
import Chat from "../models/chat.js";
import User from "../models/user.js";
import { io } from "../socket/index.js";
import Message from "../models/message.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

// ─── Multer config: store encrypted blobs as-is ───────────────────────────────
const uploadDir = path.join(process.cwd(), "uploads", "attachments");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    // Keep original extension so browsers can infer MIME on download
    const ext = path.extname(file.originalname) || ".bin";
    cb(null, `${unique}${ext}`);
  },
});

export const multerUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB per file
});

/**
 * POST /api/chats/upload-attachment
 * Accepts a single `file` field (multipart/form-data).
 * The file bytes are already AES-GCM encrypted on the client side.
 * Attachment encryption metadata is passed as JSON in the `attachmentEncryption` field.
 */
export const uploadAttachment = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const fileUrl = `/uploads/attachments/${req.file.filename}`;
    return res.status(200).json({
      url: fileUrl,
      fileName: req.body.originalName || req.file.originalname,
      fileSize: req.file.size,
    });
  } catch (err) {
    console.error("uploadAttachment error:", err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
};


export const showAllChatsOfUser = async (req, res) => {
    try {
        const id = req.user.id;

        // The user identity always comes from the verified session. Keep the
        // route parameter for backwards compatibility, but never let it select
        // another user's conversations.
        if (req.params.id && req.params.id !== id) {
            return res.status(403).json({ message: "Cannot access another user's chats" });
        }

        // Find only 1-on-1 chats for this user (exactly 2 participants)
        const chats = await Chat.find({
            participants: { $in: [id] },
            $expr: { $eq: [{ $size: "$participants" }, 2] }
        })
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "lastMessage",
                select: "content sender createdAt encryption readBy type attachmentUrl fileName",
                populate: {
                    path: "sender",
                    select: "name"
                }
            })
            .sort({ updatedAt: -1 })
            .lean();

        // Add unread count and filter other participant
        const result = await Promise.all(
            chats.map(async (chat) => {
                const otherParticipant = chat.participants.find(
                    (user) => user._id.toString() !== id
                );

                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    sender: { $ne: id }, // Sent by other
                    readBy: { $ne: id }  // Not read by this user
                });

                return {
                    _id: chat._id,
                    participant: otherParticipant,
                    lastMessage: chat.lastMessage || null,
                    unreadCount,
                    updatedAt: chat.updatedAt
                };
            })
        );

        res.status(200).json({
            success: true,
            message: "Chats retrieved successfully",
            chats: result
        });
    } catch (error) {
        console.error("Error fetching chats:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong while fetching chats",
            error: error.message
        });
    }
};


export const getMessages = async (req, res) => {
    const { _id } = req.params; // This is the chat ID

    try {
        const chat = await Chat.findOne({
            _id,
            participants: req.user.id,
        });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }

        // Fetch messages related to the chat ID
        const messages = await Message.find({ chat: _id })
            .populate('sender', 'name username pfp') // populate sender details
            .sort({ createdAt: 1 }) // you can change to -1 if you want latest first
            .lean();

        const formattedMessages = (messages || []).map(msg => {
            if (!msg.sender) {
                msg.sender = {
                    _id: "deleted_user",
                    name: "Deleted User",
                    username: "deleted_user",
                    pfp: ""
                };
            }
            return msg;
        });

        if (formattedMessages.length === 0) {
            return res.status(200).json({ messages: [], message: "No messages in this chat!" });
        }

        res.status(200).json({ messages: formattedMessages, message: "Messages fetched successfully!" });
    } catch (e) {
        console.error("Error fetching messages:", e);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



export const readMessage = async (req, res) => {
    const { chatId } = req.body;
    const userId = req.user.id;
    try {
        const chat = await Chat.exists({ _id: chatId, participants: userId });
        if (!chat) return res.status(404).json({ message: "Chat not found" });

        const messages = await Message.find({ chat: chatId });
        if (!messages) return res.status(400).json({ message: "No messages not found!" });
        const user = await User.findById(userId);
        if (!user) return res.status(400).json({ message: "User not found" });

        // validation done

        const bulkOperations = [];

        messages.forEach((message) => {
            if (!message.readBy.includes(userId)) {
                bulkOperations.push({
                    updateOne: {
                        filter: { _id: message._id },
                        update: { $addToSet: { readBy: userId } }, // Ensures no  
                    },
                });
            }
        });

        if (bulkOperations.length > 0) {
            await Message.bulkWrite(bulkOperations);
        }


        return res.status(200).json({ message: "Read count updated successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "Internal Server Error", error: error });
    }

}


const deleteAttachmentFile = (attachmentUrl) => {
  if (!attachmentUrl) return;
  try {
    const relativePath = attachmentUrl.startsWith("http")
      ? new URL(attachmentUrl).pathname
      : attachmentUrl;
    const filePath = path.join(process.cwd(), relativePath.replace(/^\//, ""));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Successfully deleted file from disk: ${filePath}`);
    }
  } catch (err) {
    console.error(`Failed to delete attachment file ${attachmentUrl}:`, err);
  }
};

export const deleteMessage = async (req, res) => {
    try {
        const { id } = req.params;

        const message = await Message.findById(id);

        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        // Optional: Check if the user is the sender
        if (message.sender.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: "You can only delete your own messages" });
        }

        // Delete physical attachment file from disk if present
        if (message.attachmentUrl) {
            deleteAttachmentFile(message.attachmentUrl);
        }

        await Message.findByIdAndDelete(id);

        // console.log(io)
        io.to(message.chat.toString()).emit("message-deleted", {
            messageId: id,
            chatId: message.chat.toString(),
        });

        res.status(200).json({ success: true, message: "Message deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error", error: err.message });
    }
};

export const deleteContact = async (req, res) => {
    const currentUserId = req.user.id;
    const { chatId } = req.body;
  
    if (!chatId) {
      return res.status(400).json({ message: "Chat ID is required." });
    }
  
    try {
      // Step 1: Find the chat by ID
      const chat = await Chat.findById(chatId);
      if (!chat || chat.participants.length !== 2) {
        return res.status(404).json({ message: "Chat not found or is not a 1-on-1 chat." });
      }

      if (!chat.participants.some((id) => id.toString() === currentUserId.toString())) {
        return res.status(404).json({ message: "Chat not found or is not a 1-on-1 chat." });
      }
  
      // Step 2: Identify the contact's ID
      const contactId = chat.participants.find(id => id.toString() !== currentUserId);
      if (!contactId) {
        return res.status(400).json({ message: "Invalid chat participants." });
      }
  
      // Step 3: Remove each other from contacts
      const currentUser = await User.findById(currentUserId);
      const contactUser = await User.findById(contactId);
  
      if (!currentUser || !contactUser) {
        return res.status(404).json({ message: "User not found." });
      }
  
      currentUser.contacts = currentUser.contacts.filter(
        id => id.toString() !== contactId.toString()
      );
      contactUser.contacts = contactUser.contacts.filter(
        id => id.toString() !== currentUserId.toString()
      );
  
      await currentUser.save();
      await contactUser.save();
  
      // Step 4: Clean up attachment files from disk, then delete messages from the chat
      const messagesWithAttachments = await Message.find({
        chat: chatId,
        attachmentUrl: { $exists: true, $ne: null }
      });
      messagesWithAttachments.forEach((m) => deleteAttachmentFile(m.attachmentUrl));

      await Message.deleteMany({ chat: chatId });
  
      // Step 5: Delete the chat itself
      await Chat.findByIdAndDelete(chatId);
  
      res.status(200).json({ message: "Contact and associated chat/messages deleted successfully." });
    } catch (error) {
      console.error("Error deleting contact:", error);
      res.status(500).json({ message: "Something went wrong while deleting contact." });
    }
  };

export const deleteAllMessages = async (req, res) => {
  const { chatId } = req.body;

  if (!chatId) {
    return res.status(400).json({ message: "chatId is required." });
  }

  try {
    const chat = await Chat.exists({ _id: chatId, participants: req.user.id });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found." });
    }

    // Delete all attachment files from disk first
    const messagesWithAttachments = await Message.find({
      chat: chatId,
      attachmentUrl: { $exists: true, $ne: null }
    });
    messagesWithAttachments.forEach((m) => deleteAttachmentFile(m.attachmentUrl));

    const deleted = await Message.deleteMany({ chat: chatId });
    res.status(200).json({ message: "All messages deleted.", count: deleted.deletedCount });
  } catch (error) {
    console.error("Error deleting messages:", error);
    res.status(500).json({ message: "Failed to delete messages." });
  }
};
