import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();


import { registerAdmin, loginAdmin, logoutAdmin, verifyUserDetails } from '../controllers/adminController.js';

router.post('/register-admin', registerAdmin);
router.post('/login-admin', loginAdmin);
router.post('/verify-admin', verifyUserDetails);
router.post('/logout-admin', authenticateJWT, logoutAdmin)

export default router;
