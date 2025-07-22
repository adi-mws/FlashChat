import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {getMessages, showAllChatsOfUser, readMessage, deleteMessage } from '../controllers/chatController.js'

router.get('/get-all/:id', authenticateJWT, showAllChatsOfUser); 
router.get('/get-messages/:_id', authenticateJWT, getMessages); 
router.post('/message-read', authenticateJWT, readMessage);
router.delete("/delete-message/:id", authenticateJWT, deleteMessage);

export default router;
