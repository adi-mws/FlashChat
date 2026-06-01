const users = new Map();       // userId (string) -> socketId (string)
const socketUserMap = new Map(); // socketId (string) -> userId (string)

export const addUser = (userId, socketId) => {
  if (!userId || !socketId) return;
  users.set(userId.toString(), socketId);
  socketUserMap.set(socketId, userId.toString());
};

export const removeUser = (socketId) => {
  const userId = socketUserMap.get(socketId);
  if (userId) {
    users.delete(userId);
    socketUserMap.delete(socketId);
  }
  return userId;
};

export const getSocketId = (userId) => {
  if (!userId) return null;
  return users.get(userId.toString());
};

export const getUserId = (socketId) => {
  return socketUserMap.get(socketId);
};

export const getOnlineUsers = () => {
  return [...users.keys()];
};

export { users, socketUserMap };
