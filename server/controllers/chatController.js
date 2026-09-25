
import Chat from "../models/chat.js";
import User from "../models/user.js";
import { io } from "../socket/index.js";
import crypto from "crypto";
import Message from "../models/message.js";
import mongoose from "mongoose";
import multer from "multer";
import path from "path";
import fs from "fs";

// Multer config: store encrypted blobs  
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
        const { id } = req.params;

        // Find all chats for this user (both direct 1-on-1 and group chats)
        const chats = await Chat.find({
            participants: { $in: [id] }
        })
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
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
                const unreadCount = await Message.countDocuments({
                    chat: chat._id,
                    sender: { $ne: id }, // Sent by other
                    readBy: { $ne: id }  // Not read by this user
                });

                if (chat.isGroupChat) {
                    return {
                        _id: chat._id,
                        isGroupChat: true,
                        groupName: chat.groupName || "",
                        groupDescription: chat.groupDescription || "",
                        groupPhoto: chat.groupPhoto || "",
                        groupAdmins: chat.groupAdmins || [],
                        inviteCode: chat.inviteCode || "",
                        allowMembersToInvite: chat.allowMembersToInvite ?? true,
                        memberLimit: chat.memberLimit || 100,
                        participants: chat.participants || [],
                        lastMessage: chat.lastMessage || null,
                        unreadCount,
                        updatedAt: chat.updatedAt
                    };
                }

                const otherParticipant = chat.participants.find(
                    (user) => user._id.toString() !== id
                );

                return {
                    _id: chat._id,
                    participant: otherParticipant || null,
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
        // Optional: Check if chat exists
        const chat = await Chat.findById(_id);
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
    const { chatId, userId } = req.body;
    try {
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

// Group Chat Controller Functions 

export const createGroupChat = async (req, res) => {
    try {
        const { groupName, groupDescription, initialMembers } = req.body;
        const creatorId = req.user.id;

        if (!groupName || groupName.trim() === "") {
            return res.status(400).json({ success: false, message: "Group name is required" });
        }

        // Generate a random unique invite code
        const inviteCode = crypto.randomBytes(8).toString("hex");

        // Participants initially include the creator
        const participants = [creatorId];

        // Add other selected contacts
        if (Array.isArray(initialMembers)) {
            initialMembers.forEach(memberId => {
                if (memberId && !participants.includes(memberId)) {
                    participants.push(memberId);
                }
            });
        }

        const newGroup = new Chat({
            participants,
            isGroupChat: true,
            groupName: groupName.trim(),
            groupDescription: (groupDescription || "").trim(),
            groupAdmins: [creatorId],
            inviteCode,
            allowMembersToInvite: true,
            memberLimit: 100
        });

        await newGroup.save();

        // Populate participants
        const populatedGroup = await Chat.findById(newGroup._id)
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
            });

        // Notify via socket to other participants
        populatedGroup.participants.forEach(member => {
            if (member._id.toString() !== creatorId) {
                io.to(member._id.toString()).emit("chatCreated", {
                    _id: populatedGroup._id,
                    isGroupChat: true,
                    groupName: populatedGroup.groupName,
                    groupDescription: populatedGroup.groupDescription,
                    groupPhoto: populatedGroup.groupPhoto,
                    groupAdmins: populatedGroup.groupAdmins,
                    inviteCode: populatedGroup.inviteCode,
                    allowMembersToInvite: populatedGroup.allowMembersToInvite,
                    memberLimit: populatedGroup.memberLimit,
                    participants: populatedGroup.participants,
                    lastMessage: null,
                    unreadCount: 0,
                    updatedAt: populatedGroup.updatedAt
                });
            }
        });

        res.status(201).json({
            success: true,
            message: "Group chat created successfully",
            group: {
                _id: populatedGroup._id,
                isGroupChat: true,
                groupName: populatedGroup.groupName,
                groupDescription: populatedGroup.groupDescription,
                groupPhoto: populatedGroup.groupPhoto,
                groupAdmins: populatedGroup.groupAdmins,
                inviteCode: populatedGroup.inviteCode,
                allowMembersToInvite: populatedGroup.allowMembersToInvite,
                memberLimit: populatedGroup.memberLimit,
                participants: populatedGroup.participants,
                lastMessage: null,
                unreadCount: 0,
                updatedAt: populatedGroup.updatedAt
            }
        });
    } catch (err) {
        console.error("createGroupChat error:", err);
        res.status(500).json({ success: false, message: "Server error creating group chat", error: err.message });
    }
};

export const joinGroupByInviteCode = async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const userId = req.user.id;

        if (!inviteCode) {
            return res.status(400).json({ success: false, message: "Invite code is required" });
        }

        const group = await Chat.findOne({ inviteCode, isGroupChat: true });

        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found for this invite code" });
        }

        // Check if user is already a member
        if (group.participants.includes(userId)) {
            return res.status(200).json({
                success: true,
                message: "You are already a member of this group",
                chatId: group._id
            });
        }

        // Check member limit
        if (group.participants.length >= (group.memberLimit || 100)) {
            return res.status(400).json({ success: false, message: "Group has reached its member limit" });
        }

        // Add member
        group.participants.push(userId);
        await group.save();

        // Populate
        const populatedGroup = await Chat.findById(group._id)
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
            })
            .populate({
                path: "lastMessage",
                select: "content sender createdAt encryption readBy type attachmentUrl fileName",
                populate: {
                    path: "sender",
                    select: "name"
                }
            });

        // Notify other group members
        group.participants.forEach(memberId => {
            io.to(memberId.toString()).emit("groupMemberJoined", {
                chatId: group._id,
                user: { _id: userId },
                participants: populatedGroup.participants
            });
        });

        res.status(200).json({
            success: true,
            message: "Successfully joined the group",
            group: {
                _id: populatedGroup._id,
                isGroupChat: true,
                groupName: populatedGroup.groupName,
                groupDescription: populatedGroup.groupDescription,
                groupPhoto: populatedGroup.groupPhoto,
                groupAdmins: populatedGroup.groupAdmins,
                inviteCode: populatedGroup.inviteCode,
                allowMembersToInvite: populatedGroup.allowMembersToInvite,
                memberLimit: populatedGroup.memberLimit,
                participants: populatedGroup.participants,
                lastMessage: populatedGroup.lastMessage || null,
                unreadCount: 0,
                updatedAt: populatedGroup.updatedAt
            }
        });
    } catch (err) {
        console.error("joinGroupByInviteCode error:", err);
        res.status(500).json({ success: false, message: "Server error joining group", error: err.message });
    }
};

export const generateGroupInviteLink = async (req, res) => {
    try {
        const { chatId } = req.body;
        const userId = req.user.id;

        const group = await Chat.findById(chatId);
        if (!group || !group.isGroupChat) {
            return res.status(404).json({ success: false, message: "Group chat not found" });
        }

        // Check if user is admin or if members are allowed to invite
        const isAdmin = group.groupAdmins.includes(userId);
        if (!isAdmin && !group.allowMembersToInvite) {
            return res.status(403).json({ success: false, message: "Only admins are allowed to generate invite links" });
        }

        // Generate a new invite code
        const inviteCode = crypto.randomBytes(8).toString("hex");
        group.inviteCode = inviteCode;
        await group.save();

        res.status(200).json({
            success: true,
            message: "Invite link generated successfully",
            inviteCode
        });
    } catch (err) {
        console.error("generateGroupInviteLink error:", err);
        res.status(500).json({ success: false, message: "Server error generating invite code", error: err.message });
    }
};

export const updateGroupSettings = async (req, res) => {
    try {
        const { chatId, groupName, groupDescription, allowMembersToInvite, memberLimit } = req.body;
        const userId = req.user.id;

        const group = await Chat.findById(chatId);
        if (!group || !group.isGroupChat) {
            return res.status(404).json({ success: false, message: "Group chat not found" });
        }

        // Only admins can change group settings
        const isAdmin = group.groupAdmins.includes(userId);
        if (!isAdmin) {
            return res.status(403).json({ success: false, message: "Only group admins can modify settings" });
        }

        if (groupName && groupName.trim() !== "") {
            group.groupName = groupName.trim();
        }
        if (groupDescription !== undefined) {
            group.groupDescription = groupDescription.trim();
        }
        if (allowMembersToInvite !== undefined) {
            group.allowMembersToInvite = !!allowMembersToInvite;
        }
        if (memberLimit !== undefined && !isNaN(memberLimit)) {
            const limit = parseInt(memberLimit);
            if (limit < group.participants.length) {
                return res.status(400).json({ success: false, message: `Member limit cannot be less than current member count (${group.participants.length})` });
            }
            group.memberLimit = limit;
        }

        await group.save();

        const populatedGroup = await Chat.findById(chatId)
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
            });

        // Notify members via socket
        group.participants.forEach(memberId => {
            io.to(memberId.toString()).emit("groupSettingsUpdated", {
                chatId: group._id,
                group: populatedGroup
            });
        });

        res.status(200).json({
            success: true,
            message: "Group settings updated successfully",
            group: populatedGroup
        });
    } catch (err) {
        console.error("updateGroupSettings error:", err);
        res.status(500).json({ success: false, message: "Server error updating settings", error: err.message });
    }
};

export const manageGroupAdmins = async (req, res) => {
    try {
        const { chatId, targetUserId, action } = req.body; // action: 'promote' | 'demote'
        const userId = req.user.id;

        const group = await Chat.findById(chatId);
        if (!group || !group.isGroupChat) {
            return res.status(404).json({ success: false, message: "Group chat not found" });
        }

        // Only existing admins can promote/demote
        const isAdmin = group.groupAdmins.some(adminId => adminId.toString() === userId.toString());
        if (!isAdmin) {
            return res.status(403).json({ success: false, message: "Only group admins can manage roles" });
        }

        if (action === 'promote') {
            if (!group.participants.some(p => p.toString() === targetUserId.toString())) {
                return res.status(400).json({ success: false, message: "Target user is not a member of this group" });
            }
            if (!group.groupAdmins.some(adminId => adminId.toString() === targetUserId.toString())) {
                group.groupAdmins.push(targetUserId);
            }
        } else if (action === 'demote') {
            // Cannot demote yourself if you are the only admin
            if (targetUserId.toString() === userId.toString() && group.groupAdmins.length === 1) {
                return res.status(400).json({ success: false, message: "Cannot demote yourself when you are the only admin" });
            }
            group.groupAdmins = group.groupAdmins.filter(adminId => adminId.toString() !== targetUserId.toString());
        } else {
            return res.status(400).json({ success: false, message: "Invalid action. Use 'promote' or 'demote'." });
        }

        await group.save();

        const populatedGroup = await Chat.findById(chatId)
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
            });

        group.participants.forEach(memberId => {
            io.to(memberId.toString()).emit("groupSettingsUpdated", {
                chatId: group._id,
                group: populatedGroup
            });
        });

        res.status(200).json({
            success: true,
            message: `User successfully ${action}d`,
            group: populatedGroup
        });
    } catch (err) {
        console.error("manageGroupAdmins error:", err);
        res.status(500).json({ success: false, message: "Server error managing admins", error: err.message });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const { chatId, targetUserId } = req.body;
        const userId = req.user.id;

        const group = await Chat.findById(chatId);
        if (!group || !group.isGroupChat) {
            return res.status(404).json({ success: false, message: "Group chat not found" });
        }

        const isLeaving = targetUserId.toString() === userId.toString();
        const isRequestorAdmin = group.groupAdmins.some(adminId => adminId.toString() === userId.toString());

        // A user can leave, or an admin can kick a member
        if (!isLeaving && !isRequestorAdmin) {
            return res.status(403).json({ success: false, message: "Only group admins can remove members" });
        }

        // If an admin is leaving, handle admin transitions
        if (isLeaving && group.groupAdmins.some(adminId => adminId.toString() === userId.toString())) {
            group.groupAdmins = group.groupAdmins.filter(adminId => adminId.toString() !== userId.toString());
            
            if (group.groupAdmins.length === 0 && group.participants.length > 1) {
                const nextMember = group.participants.find(p => p.toString() !== userId.toString());
                group.groupAdmins.push(nextMember);
            }
        }

        // Remove participant
        group.participants = group.participants.filter(p => p.toString() !== targetUserId.toString());

        // If no participants left, delete the group and messages
        if (group.participants.length === 0) {
            const messagesWithAttachments = await Message.find({
                chat: chatId,
                attachmentUrl: { $exists: true, $ne: null }
            });
            messagesWithAttachments.forEach((m) => deleteAttachmentFile(m.attachmentUrl));
            await Message.deleteMany({ chat: chatId });
            await Chat.findByIdAndDelete(chatId);

            return res.status(200).json({
                success: true,
                message: "Successfully left and deleted empty group"
            });
        }

        await group.save();

        const populatedGroup = await Chat.findById(chatId)
            .populate({
                path: "participants",
                select: "username name pfp publicKey"
            })
            .populate({
                path: "groupAdmins",
                select: "username name pfp"
            });

        // Notify all remaining members
        group.participants.forEach(memberId => {
            io.to(memberId.toString()).emit("groupMemberLeft", {
                chatId: group._id,
                targetUserId,
                participants: populatedGroup.participants
            });
        });

        // Notify the removed member
        io.to(targetUserId.toString()).emit("kickedFromGroup", {
            chatId: group._id
        });

        res.status(200).json({
            success: true,
            message: isLeaving ? "Successfully left the group" : "Member successfully removed",
            group: populatedGroup
        });
    } catch (err) {
        console.error("removeGroupMember error:", err);
        res.status(500).json({ success: false, message: "Server error removing member", error: err.message });
    }
};
