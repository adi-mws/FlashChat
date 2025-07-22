import User from "../models/user.js";
import Chat from "../models/chat.js";

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const getUserWithUsername = async (req, res) => {
  const { username } = req.query;
  const currentUserId = req.user.id;

  if (!username) {
    return res.status(400).json({ message: "Username query parameter is required." });
  }

  try {
    // Step 1: Find all 1-on-1 chats the user is in
    const oneToOneChats = await Chat.find({
      participants: currentUserId,
      $expr: { $eq: [{ $size: "$participants" }, 2] } // Only 2 participants
    }).select("participants");

    const excludedUserIds = new Set();

    oneToOneChats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== currentUserId) {
          excludedUserIds.add(participantId.toString());
        }
      });
    });

    excludedUserIds.add(currentUserId);
    const users = await User.find({
      _id: { $nin: Array.from(excludedUserIds) },
      username: { $regex: `^${username}`, $options: "i" }
    }).select("username name pfp _id");

    // Step 4: Modify pfp field
    const modifiedUsers = users.map(user => ({
      id: user._id,
      username: user.username,
      name: user.name,
      pfp: `${process.env.BASE_URL}/${user.pfp}`
    }));

    return res.status(200).json({ users: modifiedUsers });
  } catch (error) {
    console.error("Error in getUserWithUsername:", error);
    return res.status(500).json({ message: "Server error while fetching users." });
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

