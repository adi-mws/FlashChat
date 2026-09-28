import express from 'express';
import authenticateJWT, { authorizeRole, optionalAuthenticateJWT } from '../middlewares/auth.js';
import {
  adminLogin,
  adminRegister,
  adminLogout,
  getAdminMe,
  getAdminBootstrapStatus,
} from '../controllers/adminAuthController.js';

const router = express.Router();

/**
 * Super Admin Bootstrap Status
 * GET /api/admin/auth/bootstrap-status
 */
router.get('/bootstrap-status', getAdminBootstrapStatus);

/**
 * Administrator Login (Strictly for admin & superadmin roles)
 * POST /api/admin/auth/login
 */
router.post('/login', adminLogin);

/**
 * Administrator Registration / Bootstrap Claim
 * Flow 1: If no superadmin exists, initial bootstrap with Master Passkey
 * Flow 2: If superadmin exists, authenticated superadmin creates secondary admin
 * POST /api/admin/auth/register
 */
router.post('/register', optionalAuthenticateJWT, adminRegister);

/**
 * Administrator Logout (Clears session & cookies)
 * POST /api/admin/auth/logout
 */
router.post('/logout', adminLogout);

/**
 * Current Administrator Profile Verification
 * GET /api/admin/auth/me
 */
router.get('/me', authenticateJWT, authorizeRole('admin'), getAdminMe);

export default router;
