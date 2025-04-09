import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {getMessages, sendMessage, showAllChatsOfUser } from '../controllers/chatController.js'


router.get('/get-all/:id', authenticateJWT, showAllChatsOfUser); 
router.get('/get-messages/:_id', authenticateJWT, getMessages); 
router.post('/send-message', authenticateJWT, sendMessage)
export default router;
