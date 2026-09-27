import express from 'express';
import authenticateJWT from '../middlewares/auth.js';
const router = express.Router();

import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  verifyUserDetails,
  googleAuth,
  isUsernameExists,
  googleAuthPreCheck,
  getLoggedInDevices,
  revokeSession,
  updateSessionPublicKey,
  initCompanionPairing,
  getCompanionPairingStatus,
  approveCompanionPairing
} from '../controllers/authController.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/google', googleAuth);
router.post('/google-check', googleAuthPreCheck);
router.get('/verify-user', verifyUserDetails);
router.get('/sessions', authenticateJWT, getLoggedInDevices);
router.delete('/sessions/:id', authenticateJWT, revokeSession);
router.put('/session/public-key', authenticateJWT, updateSessionPublicKey);
router.post('/logout', logoutUser);
router.get('/check-username/:username', isUsernameExists);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Companion Device QR Pairing Routes
router.post('/companion/init', initCompanionPairing);
router.get('/companion/status/:pairingId', getCompanionPairingStatus);
router.post('/companion/approve', authenticateJWT, approveCompanionPairing);

export default router;
