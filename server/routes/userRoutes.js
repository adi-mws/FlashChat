import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();


import { getUserWithUsername } from '../controllers/userController.js';
import { auth } from 'google-auth-library';

router.get('/get-users', authenticateJWT, getUserWithUsername);

export default router;
