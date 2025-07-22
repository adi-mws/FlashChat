import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {
  getUserWithUsername,
  getUserById,
  updateUserProfile
} from '../controllers/userController.js';
import { uploadPfp } from '../middlewares/fileUpload.js';

router.get('/get-users', authenticateJWT, getUserWithUsername);

router.get('/:id', authenticateJWT, getUserById);

router.put('/:id', authenticateJWT, uploadPfp ,updateUserProfile);

export default router;
