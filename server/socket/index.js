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
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);
    const userId = socket.user?.id?.toString();
    const sessionId = socket.user?.sessionId?.toString();

    if (userId && sessionId) {
      addUser(userId, sessionId, socket.id);
      socket.join(getUserRoom(userId));
      socket.join(getSessionRoom(userId, sessionId));
      io.emit("onlineUsers", getOnlineUsers());
      console.log(`User ${userId} session ${sessionId} connected`);
    }

    socket.on("join", (userId) => {
      if (!socket.user?.id || userId?.toString() !== socket.user.id?.toString()) return;
      socket.join(getUserRoom(socket.user.id));
      socket.join(getSessionRoom(socket.user.id, socket.user.sessionId));
      console.log(`User ${socket.user.id} joined`);

      io.emit("onlineUsers", getOnlineUsers());
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

    socket.on("sendMessage", async ({ chatId, message, receiverId, encryption }) => {
      try {
        const newMessage = await Message.create({
          chat: chatId,
          sender: socket.user.id,
          content: message,
          readBy: [socket.user.id],
          encryption: encryption || { isEncrypted: false },
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

        const populatedMsg = await newMessage.populate("sender", "_id name username pfp");

        let messageTarget = io.to(chatId).to(getUserRoom(socket.user.id));
        if (receiverId) {
          messageTarget = messageTarget.to(getUserRoom(receiverId));
        }
        messageTarget.emit("newMessage", populatedMsg);
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

    socket.on("disconnect", () => {
      const socketInfo = removeUser(socket.id);
      if (socketInfo?.userId) {
        const { userId } = socketInfo;
        console.log(`User ${userId} disconnected`);
        const updateOnlineStatus = async () => {
          if (!getOnlineUsers().includes(userId)) {
            await User.findByIdAndUpdate(userId, { lastOnline: Date.now() });
          }
        };
        updateOnlineStatus();

        // Leave all rooms
        for (const room of socket.rooms) {
          if (room !== socket.id) {
            socket.leave(room);
          }
        }

        io.emit("onlineUsers", getOnlineUsers());
      }
    });
  });

  return io;
};
