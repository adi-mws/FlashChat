import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {getMessages, sendMessage, showAllChatsOfUser, readMessage } from '../controllers/chatController.js'


router.get('/get-all/:id', authenticateJWT, showAllChatsOfUser); 
router.get('/get-messages/:_id', authenticateJWT, getMessages); 
router.post('/send-message', authenticateJWT, sendMessage);
router.post('/message-read', authenticateJWT, readMessage);
export default router;
