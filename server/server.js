import express from 'express';
import connectDB from './db/connectDb.js';
const app = express(); 
const PORT = process.env.PORT || 5000; 
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'
dotenv.config();

app.use(express.json()); // For parsing application/json

//  connectDB();

app.listen((PORT, ()=> {
    console.log(`Server is running on port ${PORT}`);
}))