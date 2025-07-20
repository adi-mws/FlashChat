import User from "../models/user.js";
import Chat from "../models/chat.js";


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

    // Step 2: Extract other participant IDs
    const excludedUserIds = new Set();

    oneToOneChats.forEach(chat => {
      chat.participants.forEach(participantId => {
        if (participantId.toString() !== currentUserId) {
          excludedUserIds.add(participantId.toString());
        }
      });
    });

    excludedUserIds.add(currentUserId); // <-- ✅ Exclude current user too

    // Step 3: Fetch users with regex and exclude those in one-on-one chats
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



export const updateLastOnline = async (id, lastOnline) => {
  try {
    const user = await User.findByIdAndUpdate(id, {lastOnline: lastOnline});
    if (user) {
      
    }
  } catch (error) {
    console.error("Error while updating Last Online Time: ", error);
  }
}

``

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
});

export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password -googleId -type -__v -updatedAt');

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
    const { name, about, pfp, showLastMessageInList } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Apply only allowed updates
    if (typeof name === 'string') user.name = name.trim();
    if (typeof about === 'string') user.about = about.trim();
    if (typeof pfp === 'string') user.pfp = pfp;

    if (typeof showLastMessageInList === 'boolean') {
      user.showLastMessageInList = showLastMessageInList;
    }

    user.updatedAt = Date.now();
    await user.save();

    res.status(200).json({
      message: 'Profile updated successfully',
      user: formatUser(user),
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
};
