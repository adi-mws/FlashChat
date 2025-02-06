import express from 'express';
import connectDB from './db/connectDb.js';
const app = express(); 
const PORT = process.env.PORT || 5000; 
import dotenv from 'dotenv';
import adminRoutes from './routes/adminRoutes.js';
import cors from 'cors';
import path from 'path'
dotenv.config();

//cors configuration 
app.use(cors({
    origin: [process.env.CLIENT_URL],
    credentials: true,

}));
app.use(express.json()); // For parsing application/json

connectDB();

//routes for admin dashboard
app.use('/api/admin', adminRoutes);

app.listen((PORT, ()=> {
    console.log(`Server is running on port ${PORT}`);
}))