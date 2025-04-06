import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();


import { registerUser, loginUser, logoutUser, verifyUserDetails, googleAuth, isUsernameExists, googleAuthPreCheck } from '../controllers/authController.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/google-check', googleAuthPreCheck);
router.get('/verify-user', verifyUserDetails);
router.post('/logout', logoutUser); 
router.get('/check-username/:username', isUsernameExists);

export default router;
