import User from "../models/user.js";


export const getUserWithUsername = async (req, res) => {
  const { username } = req.query;

  if (!username) {
    return res.status(400).json({ message: "Username query parameter is required." });
  }

  try {
    const users = await User.find({
      username: { $regex: `^${username}`, $options: 'i' }
    }).select('username name pfp');

    // Modify pfp based on condition
    const modifiedUsers = users.map(user => ({
      username: user.username,
      name: user.name,
      pfp: user.pfp.startsWith("https")
        ? user.pfp
        : `${process.env.BASE_URL}/${user.pfp}`
    }));

    res.status(200).json({ users: modifiedUsers });
  } catch (error) {
    console.error("Error in getUserWithUsername:", error);
    res.status(500).json({ message: "Server error while fetching users." });
  }
};
