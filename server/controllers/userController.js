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
      pfp: user.pfp?.startsWith("https")
        ? user.pfp
        : `${process.env.BASE_URL}/${user.pfp}`
    }));

    return res.status(200).json({ users: modifiedUsers });
  } catch (error) {
    console.error("Error in getUserWithUsername:", error);
    return res.status(500).json({ message: "Server error while fetching users." });
  }
};


