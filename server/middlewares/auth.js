import jwt from 'jsonwebtoken';
import Session from '../models/session.js';

// Middleware to authenticate using cookies
const authenticateJWT = (req, res, next) => {
    const token = req.cookies?.token;  // Extract the token from HTTP cookie
    const googleToken = req.cookies?.googleToken
    if (!token && !googleToken) {
        return res.status(401).json({ message: 'Access denied, no token provided' });
    }
    let verificationToken = token ? token : googleToken 
    jwt.verify(verificationToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        req.user = decoded;

        // Check for token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(401).json({ message: 'Token expired' });
        }

        try {
            if (!decoded.sessionId) {
                return res.status(403).json({ message: 'Invalid session' });
            }

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

            if (!session) {
                return res.status(403).json({ message: 'Session expired or logged out' });
            }

            req.sessionId = decoded.sessionId;
            req.accountId = decoded.accountId;
            req.provider = decoded.provider;
            next();
        } catch (error) {
            return res.status(500).json({ message: 'Authentication failed', error: error.message });
        }
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
