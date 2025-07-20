import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { Server } from 'socket.io';
import path from 'path';

import connectDB from './lib/connectDb.js';
import authRoutes from './routes/authRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import userRoutes from './routes/userRoutes.js';

import Chat from './models/chat.js';
import Message from './models/message.js';
import socketAuth from './middlewares/socketAuth.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ---- MIDDLEWARES ----
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ---- DATABASE CONNECTION ----
connectDB();

// ---- ROUTES ----
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/user', userRoutes);

// ---- SOCKET SETUP ----
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Auth middleware for sockets
io.use(socketAuth);

// Track users
const users = new Map();        // userId => socketId
const socketUserMap = new Map(); // socketId => userId

// ---- SOCKET EVENTS ----
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("join", (userId) => {
    if (!userId) return;
    users.set(userId, socket.id);
    socketUserMap.set(socket.id, userId);
    console.log(`User ${userId} joined`);

    io.emit("onlineUsers", [...users.keys()]);
  });

  socket.on("joinChat", async ({ chatId }) => {
    try {
      socket.join(chatId);
      console.log(`${socket.id} joined chat room ${chatId}`);

      const messages = await Message.find({ chat: chatId })
        .populate("sender", "name username pfp")
        .sort({ createdAt: 1 });

      socket.emit("chatMessages", messages);
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

      await Chat.findByIdAndUpdate(chatId, { latestMessage: newMessage._id });

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

      const senderSocket = users.get(senderId);
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
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      users.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`User ${userId} disconnected`);

      // Leave all rooms
      for (const room of socket.rooms) {
        if (room !== socket.id) {
          socket.leave(room);
        }
      }

      io.emit("onlineUsers", [...users.keys()]);
    }
  });
});

// ---- TEST ROUTE ----
app.get('/', (_, res) => {
  res.send("Server is up and running");
});

// ---- START SERVER ----
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export { io };
