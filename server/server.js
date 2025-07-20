import express from 'express';
import connectDB from './lib/connectDb.js';
import dotenv from 'dotenv';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import path from 'path';

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

// ---- DATABASE ----
connectDB();

// ---- ROUTES ----
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/user', userRoutes);

// ---- SOCKET SETUP ----
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Authentication middleware for sockets
io.use(socketAuth);

// Store active users
const users = new Map();        // userId => socket.id
const socketUserMap = new Map(); // socket.id => userId

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
      const messages = await Message.find({ chat: chatId })
        .populate("sender", "name username pfp")
        .sort({ createdAt: 1 });

      socket.emit("chatMessages", messages);
    } catch (err) {
      console.error("joinChat error:", err);
      socket.emit("chatMessagesError", "Could not load messages.");
    }
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

      io.to(chatId).emit("newMessage", populatedMsg); // to all users in room
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
    } catch (err) {
      console.error("seenMessage error:", err);
    }
  });

  socket.on("disconnect", () => {
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      users.delete(userId);
      socketUserMap.delete(socket.id);
      console.log(`User ${userId} disconnected`);
      io.emit("onlineUsers", [...users.keys()]);
    }
  });
});

// ---- SERVER START ----
app.get('/', (_, res) => res.send("Server is running"));

server.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

export { io };
