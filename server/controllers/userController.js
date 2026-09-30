import User from "../models/user.js";
import Chat from "../models/chat.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Message from "../models/message.js";
import { io } from "../socket/index.js";
import { getUserRoom } from "../socket/store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const searchUsers = async (req, res) => {
  const { username } = req.query;
  const currentUserId = req.user.id;

  if (!username) {
    return res.status(400).json({ message: "Search username is required." });
  }

  try {
    const currentUser = await User.findById(currentUserId)
      .select("contacts friendRequests sentRequests");

    // Build a set of user IDs to exclude:
    const excludedUserIds = new Set();

    // Exclude self
    excludedUserIds.add(currentUserId);

    // Exclude contacts (already friends)
    currentUser.contacts.forEach(id => excludedUserIds.add(id.toString()));

    // Exclude received friend requests
    currentUser.friendRequests.forEach(req => excludedUserIds.add(req.from.toString()));

    // Exclude sent friend requests
    currentUser.sentRequests.forEach(req => excludedUserIds.add(req.to.toString()));

    // Perform search on users not in excluded list
    const foundUsers = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      $or: [
        { username: { $regex: username, $options: "i" } },
        { name: { $regex: username, $options: "i" } }
      ]
    }).select("username name pfp _id");

    const users = foundUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      name: u.name,
      pfp: isGoogleAvatarUrl(u.pfp) ? '' : u.pfp,
    }));

    res.status(200).json({ users });

  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};

const isGoogleAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('googleusercontent.com') ||
    url.includes('ggpht.com') ||
    /google\.[a-z.]+\/.*photo/i.test(url)
  );
};

// Helper function to format user data safely
const formatUser = (user) => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  about: user.about,
  pfp: isGoogleAvatarUrl(user.pfp) ? '' : user.pfp,
  lastOnline: user.lastOnline,
  showLastMessageInList: user.showLastMessageInList,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password -type -__v');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: formatUser(user) });
  } catch (error) {
    console.error("Error in getUserById:", error);
    res.status(500).json({ message: 'Failed to fetch user', error: error.message });
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.id;
    const { name, about, showLastMessageInList } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update text fields
    if (typeof name === "string") user.name = name.trim();
    if (typeof about === "string") user.about = about.trim();
    if (typeof showLastMessageInList !== "undefined") {
      user.showLastMessageInList =
        showLastMessageInList === "true" || showLastMessageInList === true;
    }

    // Handle profile image upload
    if (req.file) {
      const oldPfpPath = user.pfp
        ? path.join(__dirname, "..", "uploads", "pfps", path.basename(user.pfp))
        : null;

      user.pfp = `/uploads/pfps/${req.file.filename}`;

      // Remove old profile image
      if (oldPfpPath && fs.existsSync(oldPfpPath)) {
        fs.unlinkSync(oldPfpPath);
      }
    }

    user.updatedAt = Date.now();
    await user.save();

    // Return only safe fields
    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        _id: user._id,
        name: user.name,
        about: user.about,
        pfp: user.pfp,
        showLastMessageInList: user.showLastMessageInList,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        email: user.email, // only if it's okay to include
      },
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

export const sendFriendRequest = async (req, res) => {
  const fromUserId = req.user.id;
  const { toUserId } = req.body;
  // console.log(toUserId)
  if (fromUserId.toString() === toUserId)
    return res.status(400).json({ message: "Cannot send request to yourself" });

  const fromUser = await User.findById(fromUserId);
  const toUser = await User.findById(toUserId);

  if (!toUser) return res.status(404).json({ message: "User not found" });
  // console.log(req.originalUrl)

  // Check if already friends
  if (fromUser.contacts.includes(toUserId))
    return res.status(400).json({ message: "Already in contacts" });

  // Check if already sent
  const alreadySent = fromUser.sentRequests.find(r => r.to.toString() === toUserId);
  if (alreadySent) return res.status(400).json({ message: "Request already sent" });

  const now = new Date();
  fromUser.sentRequests.push({ to: toUserId, createdAt: now });
  toUser.friendRequests.push({ from: fromUserId, createdAt: now });

  await fromUser.save();
  await toUser.save();

  if (io) {
    io.to(getUserRoom(toUserId)).emit("incomingFriendRequest", {
      _id: fromUser._id,
      name: fromUser.name,
      username: fromUser.username,
      pfp: fromUser.pfp,
      about: fromUser.about,
      createdAt: now,
    });
  }

  res.status(200).json({ message: "Friend request sent" });

};

export const getFriendRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .select("friendRequests")
      .populate("friendRequests.from", "name username pfp about lastOnline")
      .lean();

    const requests = (user?.friendRequests || [])
      .filter(request => request?.from)
      .map(request => ({
        _id: request.from._id,
        name: request.from.name,
        username: request.from.username,
        pfp: isGoogleAvatarUrl(request.from.pfp) ? '' : request.from.pfp,
        about: request.from.about,
        lastOnline: request.from.lastOnline,
        createdAt: request.createdAt || new Date(),
      }));

    return res.status(200).json(requests);
  } catch (err) {
    console.error("Error fetching friend requests:", err);
    return res.status(500).json({ message: "Failed to fetch friend requests" });
  }
};


export const acceptFriendRequest = async (req, res) => {
  const toUserId = req.user.id;
  const { fromUserId } = req.body;

  try {
    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);

    if (!toUser || !fromUser)
      return res.status(404).json({ message: "User not found" });

    // Add each other to contacts if not already
    if (!toUser.contacts.some(c => c.toString() === fromUserId.toString())) {
      toUser.contacts.push(fromUserId);
    }
    if (!fromUser.contacts.some(c => c.toString() === toUserId.toString())) {
      fromUser.contacts.push(toUserId);
    }

    // Remove the friend request
    toUser.friendRequests = toUser.friendRequests.filter(r => r.from.toString() !== fromUserId);
    fromUser.sentRequests = fromUser.sentRequests.filter(r => r.to.toString() !== toUserId);

    await toUser.save();
    await fromUser.save();

    // Find or create the chat
    let chat = await Chat.findOne({
      participants: { $all: [toUserId, fromUserId], $size: 2 },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [toUserId, fromUserId],
        messages: [],
      });
    }

    // Populate participants and lastMessage like in showAllChatsOfUser
    await chat.populate([
      {
        path: 'participants',
        select: 'username name pfp',
      },
      {
        path: 'lastMessage',
        select: 'content sender createdAt encryption',
        populate: {
          path: 'sender',
          select: 'name',
        },
      },
    ]);

    // Build the same format used in `showAllChatsOfUser`
    const otherParticipant = chat.participants.find(
      (u) => u._id.toString() !== toUserId
    );

    const unreadCount = await Message.countDocuments({
      chat: chat._id,
      sender: { $ne: toUserId },
      readBy: { $ne: toUserId },
    });

    const formattedChat = {
      _id: chat._id,
      participant: otherParticipant,
      lastMessage: chat.lastMessage || null,
      unreadCount,
      updatedAt: chat.updatedAt,
    };

    const toUserContact = {
      _id: toUser._id,
      name: toUser.name,
      username: toUser.username,
      pfp: toUser.pfp,
      about: toUser.about,
      lastOnline: toUser.lastOnline,
    };

    const fromUserContact = {
      _id: fromUser._id,
      name: fromUser.name,
      username: fromUser.username,
      pfp: fromUser.pfp,
      about: fromUser.about,
      lastOnline: fromUser.lastOnline,
    };

    if (io) {
      io.to(getUserRoom(fromUserId)).emit("friendRequestAccepted", {
        _id: toUser._id,
        name: toUser.name,
        username: toUser.username,
        pfp: toUser.pfp,
        about: toUser.about,
        lastOnline: toUser.lastOnline,
        friend: toUserContact,
        chat: formattedChat,
      });

      io.to(getUserRoom(toUserId)).emit("contactAdded", {
        friend: fromUserContact,
        chat: formattedChat,
      });
    }

    res.status(200).json({
      message: "Friend request accepted",
      chat: formattedChat,
      friend: fromUserContact,
    });
  } catch (err) {
    console.error("Error accepting friend request:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


export const rejectFriendRequest = async (req, res) => {
  const toUserId = req.user.id;
  const { fromUserId } = req.body;

  const toUser = await User.findById(toUserId);
  const fromUser = await User.findById(fromUserId);

  toUser.friendRequests = toUser.friendRequests.filter(r => r.from.toString() !== fromUserId);
  fromUser.sentRequests = fromUser.sentRequests.filter(r => r.to.toString() !== toUserId);

  await toUser.save();
  await fromUser.save();

  if (io) {
    io.to(getUserRoom(fromUserId)).emit("friendRequestRejected", {
      _id: toUser._id,
      name: toUser.name,
      username: toUser.username,
    });
  }


  res.status(200).json({ message: "Friend request rejected" });
};


export const cancelSentRequest = async (req, res) => {
  const fromUserId = req.user.id;
  const { toUserId } = req.body;
  // console.log(fromUserId)
  try {
    const fromUser = await User.findById(fromUserId);
    const toUser = await User.findById(toUserId);

    fromUser.sentRequests = fromUser.sentRequests.filter(r => r.to.toString() !== toUserId);
    toUser.friendRequests = toUser.friendRequests.filter(r => r.from.toString() !== fromUserId);

    await fromUser.save();
    await toUser.save();

    if (io) {
      io.to(getUserRoom(toUser._id)).emit("friendRequestCancelled", {
        _id: fromUser._id,
        name: fromUser.name,
        username: fromUser.username,
      });
    }

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    res.status(500).json({ message: 'Something wrong in canceling sent request', error: error })
  }
};

export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'sentRequests.to',
        select: 'name username pfp about lastOnline',
      })
      .select('sentRequests')
      .lean();

    const sentRequests = (user?.sentRequests || [])
      .filter(request => request?.to)
      .map(request => ({
        _id: request.to._id,
        name: request.to.name,
        username: request.to.username,
        pfp: isGoogleAvatarUrl(request.to.pfp) ? '' : request.to.pfp,
        about: request.to.about,
        lastOnline: request.to.lastOnline,
        createdAt: request.createdAt || new Date(),
      }));

    res.status(200).json({
      sentRequests
    });
  } catch (err) {
    console.error('Error fetching sent requests:', err);
    res.status(500).json({ message: 'Failed to fetch sent requests' });
  }
};

export const updateUserPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.sessionId;
    const { publicKey, forceRekey = false } = req.body;

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ message: "A valid public key string is required." });
    }

    try {
      const parsed = JSON.parse(publicKey);
      if (!parsed.kty || parsed.kty !== "RSA") {
        return res.status(400).json({ message: "Invalid public key format: expected RSA JWK." });
      }
    } catch (e) {
      return res.status(400).json({ message: "Invalid public key format: not valid JSON." });
    }

    // Update Session if sessionId is available
    if (sessionId) {
      const session = await Session.findOne({
        sessionId,
        user: userId,
        expiresAt: { $gt: new Date() }
      });
      if (session) {
        if (session.publicKey && session.publicKey !== publicKey && !forceRekey) {
          return res.status(409).json({
            message: "A public key is already registered for this session. Set forceRekey: true to replace.",
            existingKey: true
          });
        }
        session.publicKey = publicKey;
        session.lastSeenAt = new Date();
        await session.save();
      }
    }

    res.status(200).json({
      message: "Public key registered successfully",
      sessionId: sessionId || null,
      publicKey
    });
  } catch (error) {
    console.error("Error in updateUserPublicKey:", error);
    res.status(500).json({ message: "Failed to update public key", error: error.message });
  }
};

export const updateUserBackupKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const { encryptedPrivateKey, backupSalt, backupIv, clearBackup } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (clearBackup) {
      user.encryptedPrivateKey = undefined;
      user.backupSalt = undefined;
      user.backupIv = undefined;
    } else {
      if (!encryptedPrivateKey || !backupSalt || !backupIv) {
        return res.status(400).json({ message: "Backup key details are required." });
      }
      user.encryptedPrivateKey = encryptedPrivateKey;
      user.backupSalt = backupSalt;
      user.backupIv = backupIv;
    }

    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: clearBackup ? "Backup key cleared successfully" : "Backup key registered successfully",
      user: {
        encryptedPrivateKey: user.encryptedPrivateKey || null,
        backupSalt: user.backupSalt || null,
        backupIv: user.backupIv || null
      }
    });
  } catch (error) {
    console.error("Error in updateUserBackupKey:", error);
    res.status(500).json({ message: "Failed to update backup key", error: error.message });
  }
};

export const getFriendsList = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId)
      .populate("contacts", "name username pfp about lastOnline")
      .select("contacts")
      .lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      friends: (user.contacts || []).map((c) => ({
        ...c,
        pfp: isGoogleAvatarUrl(c.pfp) ? '' : c.pfp,
      }))
    });
  } catch (error) {
    console.error("Error in getFriendsList:", error);
    res.status(500).json({ message: "Failed to fetch friends list" });
  }
};



