import User from '../models/user.js';
import Message from '../models/message.js';
import Chat from '../models/chat.js';
import Session from '../models/session.js';
import Account from '../models/account.js';
import CompanionPairing from '../models/companionPairing.js';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { buildSession } from '../lib/session.js';
import { getCookieOptions } from './authController.js';
import { io } from '../socket/index.js';
import { getUserRoom, socketUserMap } from '../socket/store.js';

/**
 * Format bytes to readable string (KB, MB, GB)
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * GET /api/admin/metrics
 * Comprehensive system telemetry: traffic, message volume, storage sizes, and live users.
 */
export const getAdminMetrics = async (req, res) => {
  try {
    // 1. Users Breakdown
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isDeactivated: { $ne: true } });
    const deactivatedUsers = await User.countDocuments({ isDeactivated: true });
    const adminCount = await User.countDocuments({ role: 'admin' });

    // Active sockets / live online count
    const liveOnlineCount = socketUserMap?.size || 0;

    // 2. Messages Volume & Types
    const totalMessages = await Message.countDocuments();
    const textMessagesCount = await Message.countDocuments({ type: 'text' });
    const imageMessagesCount = await Message.countDocuments({ type: 'image' });
    const fileMessagesCount = await Message.countDocuments({ type: 'file' });

    // 3. Storage & Text Size Aggregations
    const attachmentAggregation = await Message.aggregate([
      { $match: { attachmentUrl: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: { $ifNull: ["$fileSize", 0] } },
          count: { $sum: 1 }
        }
      }
    ]);
    const totalUploadBytes = attachmentAggregation[0]?.totalBytes || 0;
    const totalUploadsCount = attachmentAggregation[0]?.count || 0;

    // Approximate text footprint (sum of characters encoded as UTF-8)
    const textAggregation = await Message.aggregate([
      { $match: { content: { $exists: true, $ne: "" } } },
      {
        $group: {
          _id: null,
          totalChars: { $sum: { $strLenCP: "$content" } }
        }
      }
    ]);
    const totalTextChars = textAggregation[0]?.totalChars || 0;
    const estimatedTextBytes = totalTextChars * 2; // rough UTF-16/JSON character footprint

    // 4. Chats & Sessions
    const totalChats = await Chat.countDocuments();
    const directChatsCount = await Chat.countDocuments({ isGroupChat: false });
    const groupChatsCount = await Chat.countDocuments({ isGroupChat: true });
    const activeSessionsCount = await Session.countDocuments({ expiresAt: { $gt: new Date() } });

    // 5. 7-Day Traffic Velocity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const trafficAggregation = await Message.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          total: { $sum: 1 },
          media: {
            $sum: { $cond: [{ $in: ["$type", ["image", "file"]] }, 1, 0] }
          },
          text: {
            $sum: { $cond: [{ $eq: ["$type", "text"] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Map 7-day array guaranteed
    const trafficDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const found = trafficAggregation.find(item => item._id === key);
      trafficDays.push({
        date: key,
        displayDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        total: found ? found.total : 0,
        text: found ? found.text : 0,
        media: found ? found.media : 0,
      });
    }

    return res.status(200).json({
      success: true,
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          deactivated: deactivatedUsers,
          admins: adminCount,
          liveOnline: liveOnlineCount,
        },
        messages: {
          total: totalMessages,
          text: textMessagesCount,
          images: imageMessagesCount,
          files: fileMessagesCount,
          mediaTotal: imageMessagesCount + fileMessagesCount,
        },
        storage: {
          totalUploadBytes,
          formattedUploadSize: formatBytes(totalUploadBytes),
          totalUploadsCount,
          estimatedTextBytes,
          formattedTextSize: formatBytes(estimatedTextBytes),
          combinedBandwidth: formatBytes(totalUploadBytes + estimatedTextBytes),
        },
        network: {
          totalChats,
          directChats: directChatsCount,
          groupChats: groupChatsCount,
          activeSessions: activeSessionsCount,
        },
        trafficTimeline: trafficDays,
      }
    });
  } catch (error) {
    console.error("Error in getAdminMetrics:", error);
    return res.status(500).json({ success: false, message: "Failed to generate system metrics", error: error.message });
  }
};

/**
 * GET /api/admin/users
 * Paginated and searchable users list with session counts and moderation states.
 */
export const getAdminUsers = async (req, res) => {
  try {
    const { search = '', status = 'all', page = 1, limit = 50 } = req.query;

    const query = {};
    if (search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { username: regex }, { email: regex }];
    }

    if (status === 'active') {
      query.isDeactivated = { $ne: true };
    } else if (status === 'deactivated') {
      query.isDeactivated = true;
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const totalMatching = await User.countDocuments(query);

    const users = await User.find(query)
      .select('name username email pfp role isDeactivated deactivatedReason deactivatedAt createdAt lastOnline')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Enrich each user with active session count and sent message count
    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const [activeSessions, messageCount] = await Promise.all([
          Session.countDocuments({ user: u._id, expiresAt: { $gt: new Date() } }),
          Message.countDocuments({ sender: u._id })
        ]);
        const isOnline = socketUserMap?.has(u._id.toString());
        return {
          ...u,
          activeSessions,
          messageCount,
          isOnline: !!isOnline,
        };
      })
    );

    return res.status(200).json({
      success: true,
      users: enrichedUsers,
      pagination: {
        total: totalMatching,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalMatching / parseInt(limit)) || 1
      }
    });
  } catch (error) {
    console.error("Error in getAdminUsers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch users directory", error: error.message });
  }
};

/**
 * PUT /api/admin/users/:userId/toggle-status
 * Supreme moderation action: Deactivates / Reactivates a user account.
 * When deactivated, all active sessions and live sockets are instantly revoked.
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isDeactivated, reason } = req.body;
    const adminId = req.user.id;

    if (userId.toString() === adminId.toString()) {
      return res.status(400).json({ message: "You cannot deactivate your own admin account." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.isDeactivated = Boolean(isDeactivated);
    user.deactivatedReason = isDeactivated ? (reason || "Violating FlashChat terms of service and acceptable use.") : "";
    user.deactivatedAt = isDeactivated ? new Date() : null;
    await user.save();

    if (isDeactivated) {
      // 1. Invalidate all active sessions in DB
      await Session.deleteMany({ user: userId });

      // 2. Kill all live sockets for this user
      const userRoom = getUserRoom(userId.toString());
      io?.to(userRoom).emit("session_revoked", {
        reason: user.deactivatedReason
      });
      io?.to(userRoom).emit("account_deactivated", {
        reason: user.deactivatedReason
      });

      setTimeout(() => {
        io?.to(userRoom).disconnectSockets(true);
      }, 200);
    }

    return res.status(200).json({
      success: true,
      message: isDeactivated ? "User account has been deactivated and banned." : "User account reactivated.",
      user: {
        _id: user._id,
        isDeactivated: user.isDeactivated,
        deactivatedReason: user.deactivatedReason,
        deactivatedAt: user.deactivatedAt,
      }
    });
  } catch (error) {
    console.error("Error in toggleUserStatus:", error);
    return res.status(500).json({ success: false, message: "Failed to update user moderation status", error: error.message });
  }
};

/**
 * PUT /api/admin/users/:userId/role
 * Promotes or demotes a user role ('admin' | 'user').
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be 'admin' or 'user'." });
    }

    if (userId.toString() === adminId.toString() && role === 'user') {
      return res.status(400).json({ message: "You cannot demote yourself from admin." });
    }

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('name username email role');
    if (!user) return res.status(404).json({ message: "User not found." });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${role}.`,
      user
    });
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return res.status(500).json({ success: false, message: "Failed to update role", error: error.message });
  }
};

/**
 * GET /api/admin/bootstrap-status
 * Checks if the system has already been initialized with a Supreme Admin.
 */
export const getBootstrapStatus = async (req, res) => {
  try {
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    return res.status(200).json({
      success: true,
      isBootstrapped: totalAdmins > 0
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to check bootstrap status" });
  }
};

/**
 * POST /api/admin/claim-admin
 * One-time initial administrator bootstrap with master secret.
 * Once an admin exists in the system, master key claim is PERMANENTLY DISABLED.
 */
export const claimAdminAccess = async (req, res) => {
  try {
    const userId = req.user.id;
    const { masterKey } = req.body;

    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // Permanently disable once an admin already exists
    if (totalAdmins > 0) {
      return res.status(403).json({
        message: "Supreme Admin has already been initialized. Master key option is permanently disabled."
      });
    }

    const MASTER_SECRET = process.env.ADMIN_MASTER_KEY || "FLASHCHAT_SUPREME_2026";
    if (masterKey !== MASTER_SECRET) {
      return res.status(403).json({ message: "Invalid Master Passkey." });
    }

    const user = await User.findByIdAndUpdate(userId, { role: 'admin' }, { new: true });
    return res.status(200).json({
      success: true,
      message: "Supreme Admin privileges granted successfully!",
      role: user.role
    });
  } catch (error) {
    console.error("Error in claimAdminAccess:", error);
    return res.status(500).json({ message: "Failed to grant admin privileges." });
  }
};

/**
 * Safely purge all files inside a directory without removing the directory itself.
 */
function cleanDirectoryContents(dirPath) {
  let fileCount = 0;
  let bytesFreed = 0;
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return { fileCount, bytesFreed };
  }

  try {
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile()) {
          bytesFreed += stat.size;
          fs.unlinkSync(fullPath);
          fileCount++;
        } else if (stat.isDirectory()) {
          fs.rmSync(fullPath, { recursive: true, force: true });
        }
      } catch (err) {
        console.error(`Failed to delete ${fullPath}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dirPath}:`, err.message);
  }

  return { fileCount, bytesFreed };
}

/**
 * POST /api/admin/danger/clear-messages
 * Completely clears ALL messages from all chats in the database and resets chat pointers.
 */
export const clearAllMessages = async (req, res) => {
  try {
    const { confirmPhrase } = req.body;
    if (confirmPhrase !== "CLEAR_ALL_MESSAGES") {
      return res.status(400).json({
        message: 'Invalid confirmation phrase. Please confirm with "CLEAR_ALL_MESSAGES".'
      });
    }

    const deleteResult = await Message.deleteMany({});
    await Chat.updateMany({}, { lastMessage: null });

    // Broadcast real-time event to all connected clients
    io?.emit("all_messages_purged", {
      purgedAt: new Date(),
      purgedBy: req.user?.username || "Supreme Admin"
    });

    return res.status(200).json({
      success: true,
      message: `Successfully wiped all ${deleteResult.deletedCount} messages across all chats.`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error("Error in clearAllMessages:", error);
    return res.status(500).json({ success: false, message: "Failed to purge messages", error: error.message });
  }
};

/**
 * POST /api/admin/danger/clear-uploads
 * Completely deletes all uploaded files (attachments & media) across all chats from disk.
 */
export const clearAllUploads = async (req, res) => {
  try {
    const { confirmPhrase } = req.body;
    if (confirmPhrase !== "CLEAR_ALL_UPLOADS") {
      return res.status(400).json({
        message: 'Invalid confirmation phrase. Please confirm with "CLEAR_ALL_UPLOADS".'
      });
    }

    const attachmentsDir = path.join(process.cwd(), 'uploads', 'attachments');
    const mediaDir = path.join(process.cwd(), 'uploads', 'media');

    const resAttachments = cleanDirectoryContents(attachmentsDir);
    const resMedia = cleanDirectoryContents(mediaDir);

    const totalFiles = resAttachments.fileCount + resMedia.fileCount;
    const totalBytes = resAttachments.bytesFreed + resMedia.bytesFreed;

    // Remove attachment metadata on message documents if any remain
    await Message.updateMany(
      { attachmentUrl: { $exists: true, $ne: null } },
      { $unset: { attachmentUrl: 1, originalName: 1, fileSize: 1, mimeType: 1 } }
    );

    return res.status(200).json({
      success: true,
      message: `Purged ${totalFiles} uploaded file(s), freeing ${formatBytes(totalBytes)} of disk space.`,
      deletedFiles: totalFiles,
      freedBytes: totalBytes,
      formattedFreed: formatBytes(totalBytes)
    });
  } catch (error) {
    console.error("Error in clearAllUploads:", error);
    return res.status(500).json({ success: false, message: "Failed to purge uploaded files", error: error.message });
  }
};

/**
 * POST /api/admin/danger/delete-users
 * Deletes all registered users EXCEPT accounts with the 'admin' role.
 * Cleans up their sessions, accounts, contacts, and non-admin chats.
 */
export const deleteNonAdminUsers = async (req, res) => {
  try {
    const { confirmPhrase } = req.body;
    if (confirmPhrase !== "DELETE_NON_ADMIN_USERS") {
      return res.status(400).json({
        message: 'Invalid confirmation phrase. Please confirm with "DELETE_NON_ADMIN_USERS".'
      });
    }

    // 1. Fetch non-admin users
    const nonAdminUsers = await User.find({ role: { $ne: 'admin' } }).select('_id pfp username');
    const nonAdminIds = nonAdminUsers.map((u) => u._id);

    if (nonAdminIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No non-admin users found to delete.",
        deletedCount: 0
      });
    }

    // 2. Delete non-admin user profile pictures from disk
    const pfpsDir = path.join(process.cwd(), 'uploads', 'pfps');
    for (const u of nonAdminUsers) {
      if (u.pfp && u.pfp.startsWith('/uploads/pfps/')) {
        const filename = u.pfp.replace('/uploads/pfps/', '');
        const fullPath = path.join(pfpsDir, filename);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
        }
      }
    }

    // 3. Notify and immediately terminate all active socket connections for non-admin users
    for (const uId of nonAdminIds) {
      const room = getUserRoom(uId.toString());
      io?.to(room).emit("account_deleted", { reason: "System database reset by Supreme Administrator." });
      io?.to(room).emit("session_revoked", { reason: "System database reset." });
      setTimeout(() => {
        io?.to(room).disconnectSockets(true);
      }, 100);
    }

    // 4. Delete sessions, companion pairing requests, and authentication accounts
    const [deletedSessions, deletedAccounts] = await Promise.all([
      Session.deleteMany({ user: { $in: nonAdminIds } }),
      Account.deleteMany({ user: { $in: nonAdminIds } }),
      CompanionPairing.deleteMany({ userId: { $in: nonAdminIds } }),
    ]);

    // 5. Delete direct 1-on-1 chats involving non-admin users
    await Chat.deleteMany({ isGroupChat: false, participants: { $in: nonAdminIds } });

    // 6. Remove non-admins from group chats, prune empty groups
    await Chat.updateMany(
      { isGroupChat: true },
      {
        $pull: {
          participants: { $in: nonAdminIds },
          groupAdmins: { $in: nonAdminIds }
        }
      }
    );
    await Chat.deleteMany({ isGroupChat: true, participants: { $size: 0 } });

    // 7. Clean up admin contacts, friend requests, and sent requests
    await User.updateMany(
      { role: 'admin' },
      {
        $pull: {
          contacts: { $in: nonAdminIds },
          friendRequests: { from: { $in: nonAdminIds } },
          sentRequests: { to: { $in: nonAdminIds } }
        }
      }
    );

    // 8. Delete all non-admin user records
    const deleteResult = await User.deleteMany({ _id: { $in: nonAdminIds } });

    return res.status(200).json({
      success: true,
      message: `Deleted ${deleteResult.deletedCount} non-admin user(s), ${deletedSessions.deletedCount} active session(s), and ${deletedAccounts.deletedCount} credential account(s).`,
      deletedUsersCount: deleteResult.deletedCount,
      deletedSessionsCount: deletedSessions.deletedCount,
      deletedAccountsCount: deletedAccounts.deletedCount
    });
  } catch (error) {
    console.error("Error in deleteNonAdminUsers:", error);
    return res.status(500).json({ success: false, message: "Failed to delete users", error: error.message });
  }
};

/**
 * POST /api/admin/danger/purge-all
 * Master Danger Zone: Wipes all messages, purges all uploaded files,
 * removes all non-admin users, and resets chats to a completely clean slate.
 */
export const purgeSystemEverything = async (req, res) => {
  try {
    const { confirmPhrase } = req.body;
    if (confirmPhrase !== "PURGE_EVERYTHING_EXCEPT_ADMINS") {
      return res.status(400).json({
        message: 'Invalid confirmation phrase. Please confirm with "PURGE_EVERYTHING_EXCEPT_ADMINS".'
      });
    }

    // 1. Wipe all messages
    const deleteMessagesRes = await Message.deleteMany({});

    // 2. Wipe all chat uploads
    const attachmentsDir = path.join(process.cwd(), 'uploads', 'attachments');
    const mediaDir = path.join(process.cwd(), 'uploads', 'media');
    const resAttachments = cleanDirectoryContents(attachmentsDir);
    const resMedia = cleanDirectoryContents(mediaDir);
    const totalFreedFiles = resAttachments.fileCount + resMedia.fileCount;
    const totalFreedBytes = resAttachments.bytesFreed + resMedia.bytesFreed;

    // 3. Find and purge non-admin users
    const nonAdminUsers = await User.find({ role: { $ne: 'admin' } }).select('_id pfp');
    const nonAdminIds = nonAdminUsers.map((u) => u._id);

    // Delete non-admin pfps
    const pfpsDir = path.join(process.cwd(), 'uploads', 'pfps');
    for (const u of nonAdminUsers) {
      if (u.pfp && u.pfp.startsWith('/uploads/pfps/')) {
        const filename = u.pfp.replace('/uploads/pfps/', '');
        const fullPath = path.join(pfpsDir, filename);
        if (fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch (e) { /* ignore */ }
        }
      }
    }

    // Disconnect non-admin sockets
    for (const uId of nonAdminIds) {
      const room = getUserRoom(uId.toString());
      io?.to(room).emit("account_deleted", { reason: "Complete system reset by Supreme Administrator." });
      io?.to(room).emit("session_revoked", { reason: "Complete system reset." });
      setTimeout(() => {
        io?.to(room).disconnectSockets(true);
      }, 100);
    }

    // Delete non-admin sessions, accounts, companion pairings
    await Promise.all([
      Session.deleteMany({ user: { $in: nonAdminIds } }),
      Account.deleteMany({ user: { $in: nonAdminIds } }),
      CompanionPairing.deleteMany({ userId: { $in: nonAdminIds } }),
    ]);

    // Delete non-admin users
    const deleteUsersRes = await User.deleteMany({ _id: { $in: nonAdminIds } });

    // Clean up admin contacts, friend requests, and reset all chats
    await User.updateMany(
      { role: 'admin' },
      {
        $set: { contacts: [], friendRequests: [], sentRequests: [] }
      }
    );
    await Chat.deleteMany({});

    // Notify all remaining sockets (admins)
    io?.emit("all_messages_purged", { purgedAt: new Date() });

    return res.status(200).json({
      success: true,
      message: `Complete system reset accomplished! Wiped ${deleteMessagesRes.deletedCount} messages, purged ${totalFreedFiles} uploaded files (${formatBytes(totalFreedBytes)}), and deleted ${deleteUsersRes.deletedCount} user(s). The system is now primed for the new version.`,
      purgedMessages: deleteMessagesRes.deletedCount,
      freedUploadsCount: totalFreedFiles,
      freedBytes: totalFreedBytes,
      formattedFreed: formatBytes(totalFreedBytes),
      deletedUsersCount: deleteUsersRes.deletedCount
    });
  } catch (error) {
    console.error("Error in purgeSystemEverything:", error);
    return res.status(500).json({ success: false, message: "System purge failed", error: error.message });
  }
};



