import cookie from 'cookie'; 
import jwt from 'jsonwebtoken'
import Session from '../models/session.js';

const authenticateSocket = async (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token || cookies.googleToken; // handles both googleToken and normal Token (Both Auth Mechanisms)
    if (!token) throw new Error("No token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.sessionId) throw new Error("No session");

    const sessionQuery = {
      user: decoded.id,
      sessionId: decoded.sessionId,
      expiresAt: { $gt: new Date() },
    };
    if (decoded.accountId) {
      sessionQuery.accountId = decoded.accountId;
    }

    const session = await Session.findOneAndUpdate(
      sessionQuery,
      { $set: { lastSeenAt: new Date() } },
      { new: true }
    ).select("_id");

    if (!session) throw new Error("Invalid session");

    socket.user = decoded; // Attached the user to the socket
    next();
  } catch (err) {
    // console.log("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
};


export default authenticateSocket;
