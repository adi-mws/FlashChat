import { Server } from "socket.io";
import socketAuth from "../middlewares/socketAuth.js";
import { addUser, removeUser, getOnlineUsers, getSocketId } from "./store.js";
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

    socket.on("join", (userId) => {
      if (!userId) return;
      addUser(userId, socket.id);
      console.log(`User ${userId} joined`);

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

    socket.on("sendMessage", async ({ chatId, message, receiverId }) => {
      try {
        const newMessage = await Message.create({
          chat: chatId,
          sender: socket.user.id,
          content: message,
          readBy: [socket.user.id],
        });

        await Chat.findByIdAndUpdate(chatId, { lastMessage: newMessage._id });

        const populatedMsg = await newMessage.populate("sender", "_id name username pfp");

        io.to(chatId).emit("newMessage", populatedMsg);
      } catch (error) {
        console.error("sendMessage error:", error);
      }
    });

    socket.on("seenMessage", async ({ messageId, chatId, senderId }) => {
      try {
        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { readBy: socket.user.id },
        });

        const senderSocket = getSocketId(senderId);
        if (senderSocket) {
          io.to(senderSocket).emit("receiverSeenMessage", {
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
      const userId = removeUser(socket.id);
      if (userId) {
        console.log(`User ${userId} disconnected`);
        const updateOnlineStatus = async () => {
          await User.findByIdAndUpdate(userId, { lastOnline: Date.now() });
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
