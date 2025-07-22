import User from "../models/user.js";
import Chat from "../models/chat.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Message from "../models/message.js";

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
    const users = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      $or: [
        { username: { $regex: username, $options: "i" } },
        { name: { $regex: username, $options: "i" } }
      ]
    }).select("username name pfp _id");

    res.status(200).json({ users });

  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Failed to search users" });
  }
};




// Helper function to format user data safely
const formatUser = (user) => ({
  _id: user._id,
  username: user.username,
  name: user.name,
  email: user.email,
  about: user.about,
  pfp: user.pfp,
  lastOnline: user.lastOnline,
  showLastMessageInList: user.showLastMessageInList,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt
});

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password -googleId -type -__v');

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

  // Push request into both users
  fromUser.sentRequests.push({ to: toUserId });
  toUser.friendRequests.push({ from: fromUserId });

  await fromUser.save();
  await toUser.save();

  res.status(200).json({ message: "Friend request sent" });
};




export const getFriendRequests = async (req, res) => {
  const userId = req.user.id;
  const user = await User.findById(userId).populate('friendRequests.from', 'name username pfp');
  res.status(200).json({ requests: user.friendRequests });
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
    if (!toUser.contacts.includes(fromUserId)) toUser.contacts.push(fromUserId);
    if (!fromUser.contacts.includes(toUserId)) fromUser.contacts.push(toUserId);

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
        select: 'content sender createdAt',
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

    res.status(200).json({
      message: "Friend request accepted",
      chat: formattedChat,
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

    res.status(200).json({ message: "Friend request cancelled" });
  } catch (error) {
    res.status(500).json({message: 'Something wrong in canceling sent request', error: error})
  }
};






export const getSentRequests = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate({
        path: 'sentRequests.to',
        select: 'name username pfp',
      })
      .select('sentRequests');

    res.status(200).json({
      sentRequests: user.sentRequests.map(r => r.to)
    });
  } catch (err) {
    console.error('Error fetching sent requests:', err);
    res.status(500).json({ message: 'Failed to fetch sent requests' });
  }
};



