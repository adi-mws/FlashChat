import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
import { uploadPfp } from '../middlewares/fileUpload.js';

import {
  getUserById,
  searchUsers,
  updateUserProfile,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelSentRequest,
  getFriendRequests,
  getSentRequests,
 
} from '../controllers/userController.js';



const router = express.Router();

router.get('/get-users', authenticateJWT, searchUsers);
router.get('/:id', authenticateJWT, getUserById);
router.put('/:id', authenticateJWT, uploadPfp, updateUserProfile);

router.post('/friends/request', authenticateJWT,  sendFriendRequest);
router.post('/friends/accept', authenticateJWT, acceptFriendRequest);
router.post('/friends/reject', authenticateJWT, rejectFriendRequest);
router.post('/friends/cancel', authenticateJWT, cancelSentRequest);

router.get('/friends/requests', authenticateJWT, getFriendRequests);
router.get('/friends/sent', authenticateJWT, getSentRequests);


export default router;
