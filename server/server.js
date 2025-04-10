import express from 'express';
import connectDB from './lib/connectDb.js';
import dotenv from 'dotenv';
import http from 'http'
import authRoutes from './routes/authRoutes.js';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes.js';
import { Server } from "socket.io";
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

export const users = new Map(); // Map for userId -> socketId mapping

io.on("connection", (socket) => {

    socket.on("join", (userId) => {
        users.set(userId, socket.id);  //  Use .set() for Map
        console.log(`User connected: ${socket.id}, ${userId}`);

        // console.log(`User ${userId} joined with socket ID: ${socket.id}`);
    });

    socket.on("sendMessage", (message) => {
        // console.log(" Message received:", message);
        io.emit("newMessage", message); // Broadcast message to all clients
    });

    socket.on("disconnect", () => {
        // Find the user by socket ID
        for (const [userId, socketId] of users.entries()) {
            if (socketId === socket.id) {
                users.delete(userId);  //  Use .delete() to properly remove the user
                console.log(`User ${userId} disconnected`);
                break;
            }
        }
    });

    // Debugger to test the map
    
});
// setInterval(() => {
//     console.log(users)
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