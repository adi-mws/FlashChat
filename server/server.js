import express from 'express';
import connectDB from './db/connectDb.js';
import dotenv from 'dotenv';
import http from 'http'
import adminRoutes from './routes/adminRoutes.js';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.js';
import { Server } from "socket.io";
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

// Mapping the user id with the socket id
export const users = {}; // Store userId -> socketId mappin

// Handle WebSocket Connection
io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.id}`);

    socket.on("join", (userId) => {
        users[userId] = socket.id;
    })
    socket.on("sendMessage", (message) => {
        console.log("📩 Message received:", message);
        io.emit("newMessage", message); // Broadcast message to all clients
    });

    socket.on("disconnect", () => {
        const userId = Object.keys(users).find((key) => users[key] === socket.id);
        if (userId) {
            delete users[userId];
            console.log(`User ${userId} disconnected`);
        }
    });
});


app.use(express.json()); // For parsing application/json
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
connectDB();

// Routes for admin dashboard
app.use('/api/admin', adminRoutes);
app.use('/api/chats', chatRoutes);

server.listen(PORT, () => {
    app.get('/', (req, res) => {
        res.send("Server is running")
    })
    console.log(`Server is running on port ${PORT}`);
});


export { io };