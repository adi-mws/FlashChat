import jwt from 'jsonwebtoken';
import { logoutUser } from '../controllers/authController.js';

// Middleware to authenticate using cookies
const authenticateJWT = (req, res, next) => {
    const token = req.cookies?.token;  // Extract the token from HTTP cookie
    const googleToken = req.cookies?.googleToken
    if (!token && !googleToken) {
        logoutUser();
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }
    let verificationToken = token ? token : googleToken 
    jwt.verify(verificationToken, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;

        // Check for token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(401).json({ message: 'Token expired' });
        }

        next();
    });
};

// Middleware for role-based authorization
export const authorizeRole = (role) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    if (req.user.role !== role) {
        return res.status(403).json({ message: `Access denied, ${role} only` });
    }

    next();
};

export default authenticateJWT;
