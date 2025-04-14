import cookie from 'cookie'; 
import jwt from 'jsonwebtoken'

const authenticateSocket = (socket, next) => {
  try {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.token || cookies.googleToken; // handles both googleToken and normal Token (Both Auth Mechanisms)
    if (!token) throw new Error("No token");

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attached the user to the socket
    next();
  } catch (err) {
    console.log("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
};


export default authenticateSocket;