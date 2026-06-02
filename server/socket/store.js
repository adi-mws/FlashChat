const users = new Map(); // userId -> Map(sessionId -> Set(socketId))
const socketUserMap = new Map(); // socketId -> { userId, sessionId }

export const getUserRoom = (userId) => `user:${userId?.toString()}`;
export const getSessionRoom = (userId, sessionId) => `user:${userId?.toString()}:session:${sessionId}`;

export const addUser = (userId, sessionId, socketId) => {
  if (!userId || !sessionId || !socketId) return;

  const normalizedUserId = userId.toString();
  const normalizedSessionId = sessionId.toString();

  if (!users.has(normalizedUserId)) {
    users.set(normalizedUserId, new Map());
  }

  const sessions = users.get(normalizedUserId);
  if (!sessions.has(normalizedSessionId)) {
    sessions.set(normalizedSessionId, new Set());
  }

  sessions.get(normalizedSessionId).add(socketId);
  socketUserMap.set(socketId, {
    userId: normalizedUserId,
    sessionId: normalizedSessionId,
  });
};

export const removeUser = (socketId) => {
  const socketInfo = socketUserMap.get(socketId);
  if (!socketInfo) return null;

  const { userId, sessionId } = socketInfo;
  const sessions = users.get(userId);
  const sockets = sessions?.get(sessionId);

  sockets?.delete(socketId);
  if (sockets && sockets.size === 0) {
    sessions.delete(sessionId);
  }
  if (sessions && sessions.size === 0) {
    users.delete(userId);
  }

  socketUserMap.delete(socketId);
  return { userId, sessionId };
};

export const removeSession = (userId, sessionId) => {
  if (!userId || !sessionId) return [];

  const normalizedUserId = userId.toString();
  const normalizedSessionId = sessionId.toString();
  const sessions = users.get(normalizedUserId);
  const sockets = sessions?.get(normalizedSessionId);
  const socketIds = sockets ? [...sockets] : [];

  socketIds.forEach((socketId) => socketUserMap.delete(socketId));
  sessions?.delete(normalizedSessionId);
  if (sessions && sessions.size === 0) {
    users.delete(normalizedUserId);
  }

  return socketIds;
};

export const getSocketIds = (userId, sessionId = null) => {
  if (!userId) return [];

  const sessions = users.get(userId.toString());
  if (!sessions) return [];

  if (sessionId) {
    return [...(sessions.get(sessionId.toString()) || [])];
  }

  return [...sessions.values()].flatMap((sockets) => [...sockets]);
};

export const isSessionOnline = (userId, sessionId) => {
  return getSocketIds(userId, sessionId).length > 0;
};

export const getSocketId = (userId) => {
  return getSocketIds(userId)[0] || null;
};

export const getUserId = (socketId) => {
  return socketUserMap.get(socketId)?.userId;
};

export const getSocketSession = (socketId) => {
  return socketUserMap.get(socketId) || null;
};

export const getOnlineUsers = () => {
  return [...users.keys()];
};

export { users, socketUserMap };
