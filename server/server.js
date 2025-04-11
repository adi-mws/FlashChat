import express from 'express';
import connectDB from './lib/connectDb.js';
import dotenv from 'dotenv';
import http from 'http'
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.js';
import { Server } from "socket.io";
import Chat from './models/chat.js';
import userRoutes from './routes/userRoutes.js'
import path from 'path';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;


const server = http.createServer(app); // Create HTTP server
// CORS configuration
app.use(cors({
    origin: [process.env.CLIENT_URL],
    credentials: true,
}));
// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // React frontend URL
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const users = new Map(); // userId -> socketId
const socketUserMap = new Map(); // socketId -> userId

io.on("connection", (socket) => {
    socket.on("join", (userId) => {
        if (!userId || typeof userId !== "string") {
            console.warn("Invalid userId received");
            return;
        }

        users.set(userId, socket.id);
        socketUserMap.set(socket.id, userId);
        console.log(`User joined: ${userId}`);

        // Broadcast updated online users
        io.emit("onlineUsers", [...users.keys()]);
    });

    socket.on("disconnect", () => {
        const userId = socketUserMap.get(socket.id);
        if (userId) {
            users.delete(userId);
            socketUserMap.delete(socket.id);
            console.log(`User ${userId} disconnected`);

            // Broadcast updated online users
            io.emit("onlineUsers", [...users.keys()]);
        }
    });
});


// Debugger to check the map
// setInterval(() => {
//     console.log()
// }, 5000)

app.set("io", io);
app.set("users", users);


app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use(express.json()); // For parsing application/json
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());
connectDB();

// Routes for users authentication and profile management settings
app.use('/api/auth', authRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/user', userRoutes);

server.listen(PORT, () => {
    app.get('/', (req, res) => {
        res.send("Server is running")
    })
    console.log(`Server is running on port ${PORT}`);
});


export { io };