import express from 'express';
import authenticateJWT, { authorizeRole, optionalAuthenticateJWT } from '../middlewares/auth.js';
import {
  getAdminMetrics,
  getAdminUsers,
  toggleUserStatus,
  updateUserRole,
  claimAdminAccess,
  getBootstrapStatus,
  clearAllMessages,
  clearAllUploads,
  deleteNonAdminUsers,
  purgeSystemEverything,
} from '../controllers/adminController.js';

const router = express.Router();

// Check if initial Supreme Admin bootstrap has already been performed
router.get('/bootstrap-status', getBootstrapStatus);

// One-time admin claim (strictly disabled once an admin already exists)
router.post('/claim-admin', optionalAuthenticateJWT, claimAdminAccess);

// Supreme Admin-Only Endpoints
router.get('/metrics', authenticateJWT, authorizeRole('admin'), getAdminMetrics);
router.get('/users', authenticateJWT, authorizeRole('admin'), getAdminUsers);
router.put('/users/:userId/toggle-status', authenticateJWT, authorizeRole('admin'), toggleUserStatus);
router.put('/users/:userId/role', authenticateJWT, authorizeRole('admin'), updateUserRole);

// Supreme Danger / Delete Zones (System Purge & Factory Reset for new version)
router.post('/danger/clear-messages', authenticateJWT, authorizeRole('admin'), clearAllMessages);
router.post('/danger/clear-uploads', authenticateJWT, authorizeRole('admin'), clearAllUploads);
router.post('/danger/delete-users', authenticateJWT, authorizeRole('admin'), deleteNonAdminUsers);
router.post('/danger/purge-all', authenticateJWT, authorizeRole('admin'), purgeSystemEverything);

export default router;

