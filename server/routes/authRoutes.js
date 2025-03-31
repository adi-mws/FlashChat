import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();


import { registerUser, loginUser, logoutUser, verifyUserDetails, googleAuth } from '../controllers/authController.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.get('/verify-user', verifyUserDetails);
router.post('/logout', authenticateJWT, logoutUser)

export default router;
