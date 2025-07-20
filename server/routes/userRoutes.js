import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {
  getUserWithUsername,
  getUserById,
  updateUserProfile
} from '../controllers/userController.js';

router.get('/get-users', authenticateJWT, getUserWithUsername);

router.get('/:id', authenticateJWT, getUserById);

router.put('/:id', authenticateJWT, updateUserProfile);

export default router;
