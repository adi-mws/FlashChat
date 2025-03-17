import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import { createChat, getMessages, sendMessage, showAllChatsOfUser } from '../controllers/chatController.js'


router.post('/create', authenticateJWT, createChat);
router.get('/:_id', authenticateJWT, showAllChatsOfUser); 
router.get('/get-messages/:_id', authenticateJWT, getMessages); 
router.post('/send-message', authenticateJWT, sendMessage)
export default router;
