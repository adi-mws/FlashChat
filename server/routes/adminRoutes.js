import express from 'express';
import authenticateJWT, { authorizeRole, optionalAuthenticateJWT } from '../middlewares/auth.js';
import {
  getAdminMetrics,
  getAdminUsers,
  toggleUserStatus,
  updateUserRole,
  setAdminPassword,
  clearAllMessages,
  deleteAllChatsAndContacts,
  clearAllUploads,
  deleteNonAdminUsers,
  purgeSystemEverything,
} from '../controllers/adminController.js';
import {
  adminLogin,
  adminRegister,
  adminLogout,
  getAdminBootstrapStatus,
} from '../controllers/adminAuthController.js';

const router = express.Router();

// Dedicated Admin Authentication & Registration Endpoints
router.get('/bootstrap-status', getAdminBootstrapStatus);
router.post('/login', adminLogin);
router.post('/register', optionalAuthenticateJWT, adminRegister);
router.post('/claim-admin', optionalAuthenticateJWT, adminRegister);
router.post('/logout', adminLogout);

// Supreme Admin-Only Endpoints
router.get('/metrics', authenticateJWT, authorizeRole('admin'), getAdminMetrics);
router.get('/users', authenticateJWT, authorizeRole('admin'), getAdminUsers);
router.put('/users/:userId/toggle-status', authenticateJWT, authorizeRole('admin'), toggleUserStatus);
router.put('/users/:userId/role', authenticateJWT, authorizeRole('admin'), updateUserRole);
router.post('/set-password', authenticateJWT, authorizeRole('admin'), setAdminPassword);

// Supreme Danger / Delete Zones (System Purge & Factory Reset for new version)
router.post('/danger/clear-messages', authenticateJWT, authorizeRole('admin'), clearAllMessages);
router.post('/danger/delete-all-chats', authenticateJWT, authorizeRole('admin'), deleteAllChatsAndContacts);
router.post('/danger/clear-uploads', authenticateJWT, authorizeRole('admin'), clearAllUploads);
router.post('/danger/delete-users', authenticateJWT, authorizeRole('admin'), deleteNonAdminUsers);
router.post('/danger/purge-all', authenticateJWT, authorizeRole('admin'), purgeSystemEverything);

export default router;

