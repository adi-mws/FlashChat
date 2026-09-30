import { Server } from "socket.io";
import socketAuth from "../middlewares/socketAuth.js";
import { addUser, removeUser, getOnlineUsers, getUserRoom, getSessionRoom } from "./store.js";
import Message from "../models/message.js";
import Chat from "../models/chat.js";
import User from "../models/user.js";

export let io = null;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    const userId = socket.user?.id?.toString();
    const sessionId = socket.user?.sessionId?.toString();

    if (socket.isPairingSocket && socket.pairingId) {
      const room = `pairing:${socket.pairingId}`;
      socket.join(room);
      console.log(`Companion device socket ${socket.id} joined ${room}`);
      return;
    }

    if (userId && sessionId) {
      addUser(userId, sessionId, socket.id);
      socket.join(getUserRoom(userId));
      socket.join(getSessionRoom(userId, sessionId));
      io.emit("onlineUsers", getOnlineUsers());
      io.emit("userStatusUpdate", { userId, isOnline: true });
      console.log(`User ${userId} session ${sessionId} connected`);
    }

    socket.on("join", (userId) => {
      if (!socket.user?.id || userId?.toString() !== socket.user.id?.toString()) return;
      socket.join(getUserRoom(socket.user.id));
      socket.join(getSessionRoom(socket.user.id, socket.user.sessionId));
      console.log(`User ${socket.user.id} joined`);

      io.emit("onlineUsers", getOnlineUsers());
      io.emit("userStatusUpdate", { userId: socket.user.id.toString(), isOnline: true });
    });

    socket.on("joinChat", async ({ chatId }) => {
      try {
        socket.join(chatId);
        console.log(`${socket.id} joined chat room ${chatId}`);

        const messages = await Message.find({ chat: chatId })
          .populate("sender", "name username pfp")
          .sort({ createdAt: 1 })
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

        socket.emit("chatMessages", formattedMessages);
      } catch (error) {
        console.error("joinChat error:", error);
        socket.emit("chatMessagesError", "Could not load messages.");
      }
    });

    socket.on("leaveChat", ({ chatId }) => {
      socket.leave(chatId);
      console.log(`${socket.id} left chat room ${chatId}`);
    });

    socket.on("typing", async ({ chatId, receiverId }) => {
      if (!chatId || !socket.user?.id) return;
      const senderId = socket.user.id.toString();

      let senderName = socket.user.name || socket.user.username || "Someone";
      try {
        const u = await User.findById(senderId).select("name username");
        if (u) senderName = u.name || u.username;
      } catch (e) {}

      const payload = {
        chatId,
        userId: senderId,
        userName: senderName,
        isTyping: true,
      };

      try {
        const chat = await Chat.findById(chatId).select("participants isGroupChat");
        if (chat && chat.participants) {
          chat.participants.forEach((pId) => {
            const pIdStr = pId?.toString();
            if (pIdStr && pIdStr !== senderId) {
              io.to(getUserRoom(pIdStr)).emit("userTyping", payload);
            }
          });
        } else if (receiverId) {
          io.to(getUserRoom(receiverId.toString())).emit("userTyping", payload);
        }
      } catch (err) {
        socket.to(chatId).emit("userTyping", payload);
      }
    });

    socket.on("stopTyping", async ({ chatId, receiverId }) => {
      if (!chatId || !socket.user?.id) return;
      const senderId = socket.user.id.toString();

      const payload = {
        chatId,
        userId: senderId,
        isTyping: false,
      };

      try {
        const chat = await Chat.findById(chatId).select("participants isGroupChat");
        if (chat && chat.participants) {
          chat.participants.forEach((pId) => {
            const pIdStr = pId?.toString();
            if (pIdStr && pIdStr !== senderId) {
              io.to(getUserRoom(pIdStr)).emit("userStoppedTyping", payload);
            }
          });
        } else if (receiverId) {
          io.to(getUserRoom(receiverId.toString())).emit("userStoppedTyping", payload);
        }
      } catch (err) {
        socket.to(chatId).emit("userStoppedTyping", payload);
      }
    });

    socket.on("sendMessage", async ({
      chatId,
      message,
      receiverId,
      encryption,
      // attachment fields (optional)
      type,
      attachmentUrl,
      fileName,
      fileSize,
      caption,
      attachmentEncryption,
      tempId,
    }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit("messageError", { message: "Chat not found" });
        }

        const isParticipant = chat.participants.some(p => p.toString() === socket.user.id.toString());
        if (!isParticipant) {
          return socket.emit("messageError", { message: "Unauthorized: not a participant of this chat" });
        }

        const msgType = type || "text";

        // Validate session-based message encryption payload
        let validatedEncryption = { isEncrypted: false };
        if (encryption && encryption.isEncrypted) {
          if (!encryption.iv || typeof encryption.iv !== "string") {
            return socket.emit("messageError", { message: "Invalid encryption payload: missing IV" });
          }
          if (!Array.isArray(encryption.encryptedKeys) || encryption.encryptedKeys.length === 0) {
            return socket.emit("messageError", { message: "Invalid encryption payload: missing encryptedKeys" });
          }

          const seenSessions = new Set();
          const validKeys = [];
          for (const entry of encryption.encryptedKeys) {
            const sId = entry.sessionId?.toString();
            if (!sId || !entry.key || typeof entry.key !== "string") continue;
            if (!seenSessions.has(sId)) {
              seenSessions.add(sId);
              validKeys.push({
                sessionId: sId,
                userId: entry.userId || undefined,
                key: entry.key
              });
            }
          }

          if (validKeys.length === 0) {
            return socket.emit("messageError", { message: "Invalid encryption payload: no valid session envelopes" });
          }

          validatedEncryption = {
            isEncrypted: true,
            iv: encryption.iv,
            encryptedKeys: validKeys
          };
        }

        // Validate session-based attachment encryption payload
        let validatedAttachmentEncryption = { isEncrypted: false };
        if (attachmentEncryption && attachmentEncryption.isEncrypted) {
          if (attachmentEncryption.iv && Array.isArray(attachmentEncryption.encryptedKeys)) {
            const seenSessions = new Set();
            const validKeys = [];
            for (const entry of attachmentEncryption.encryptedKeys) {
              const sId = entry.sessionId?.toString();
              if (!sId || !entry.key || typeof entry.key !== "string") continue;
              if (!seenSessions.has(sId)) {
                seenSessions.add(sId);
                validKeys.push({
                  sessionId: sId,
                  userId: entry.userId || undefined,
                  key: entry.key
                });
              }
            }
            validatedAttachmentEncryption = {
              isEncrypted: true,
              iv: attachmentEncryption.iv,
              encryptedKeys: validKeys
            };
          }
        }

        const newMessage = await Message.create({
          chat: chatId,
          sender: socket.user.id,
          content: message || "",
          type: msgType,
          readBy: [socket.user.id],
          encryption: validatedEncryption,
          // attachment-specific
          ...(msgType !== "text" && {
            attachmentUrl: attachmentUrl || null,
            fileName: fileName || null,
            fileSize: fileSize || null,
            attachmentEncryption: validatedAttachmentEncryption,
          }),
        });

        chat.updatedAt = Date.now();
        chat.lastMessage = newMessage._id;
        await chat.save();

        const populatedMsg = await newMessage.populate("sender", "_id name username pfp");

        let messageTarget = io.to(chatId).to(getUserRoom(socket.user.id));
        if (chat && Array.isArray(chat.participants)) {
          chat.participants.forEach(pId => {
            const pIdStr = (pId?._id || pId)?.toString();
            if (pIdStr && pIdStr !== socket.user.id.toString()) {
              messageTarget = messageTarget.to(getUserRoom(pIdStr));
            }
          });
        }
        if (receiverId) {
          messageTarget = messageTarget.to(getUserRoom(receiverId.toString()));
        }
        const msgPayload = populatedMsg.toObject ? populatedMsg.toObject() : populatedMsg;
        if (tempId) {
          msgPayload.tempId = tempId;
        }
        messageTarget.emit("newMessage", msgPayload);
      } catch (error) {
        console.error("sendMessage error:", error);
      }
    });

    socket.on("seenMessage", async ({ messageId, chatId, senderId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: socket.user.id },
        });

        if (senderId) {
          io.to(getUserRoom(senderId)).emit("receiverSeenMessage", {
            chatId,
            messageId,
            receiverId: socket.user.id,
          });
        }
      } catch (error) {
        console.error("seenMessage error:", error);
      }
    });

    const handleUserDisconnect = async () => {
      const socketInfo = removeUser(socket.id);
      if (socketInfo?.userId) {
        const { userId } = socketInfo;
        console.log(`User ${userId} disconnected`);
        const stillOnline = getOnlineUsers().includes(userId);
        if (!stillOnline) {
          const now = new Date();
          try {
            await User.findByIdAndUpdate(userId, { lastOnline: now });
          } catch (err) {
            console.error("Error updating lastOnline on disconnect:", err);
          }
          io.emit("userStatusUpdate", { userId, isOnline: false, lastOnline: now.toISOString() });
        }

        io.emit("onlineUsers", getOnlineUsers());
      }
    };

    socket.on("leave_app", handleUserDisconnect);
    socket.on("disconnect", handleUserDisconnect);
  });

  return io;
};
