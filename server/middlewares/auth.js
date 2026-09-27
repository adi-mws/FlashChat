import jwt from 'jsonwebtoken';
import Session from '../models/session.js';
import User from '../models/user.js';

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

        // Check for token expiration
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(401).json({ message: 'Token expired' });
        }

        try {
            if (!decoded.sessionId) {
                return res.status(403).json({ message: 'Invalid session' });
            }

            // Check if user is deactivated in database
            const user = await User.findById(decoded.id).select('role isDeactivated deactivatedReason');
            if (!user) {
                return res.status(401).json({ message: 'User account not found' });
            }

            if (user.isDeactivated) {
                return res.status(403).json({
                    message: user.deactivatedReason || 'Your account has been deactivated by administration.',
                    code: 'ACCOUNT_DEACTIVATED',
                });
            }

            const sessionQuery = {
                user: decoded.id,
                sessionId: decoded.sessionId,
                expiresAt: { $gt: new Date() },
            };
            if (decoded.accountId) {
                sessionQuery.accountId = decoded.accountId;
            }
            // Updates the lastSeenAt timestamp for the session and checks if the session is still valid
            const session = await Session.findOneAndUpdate(
                sessionQuery,
                { $set: { lastSeenAt: new Date() } },
                { new: true }
            ).select("_id");
            // Returns back 403 error if the session is not found or expired, indicating that the user has logged out or the session has expired
            if (!session) {
                return res.status(403).json({ message: 'Session expired or logged out' });
            }

            req.user = {
                ...decoded,
                role: user.role || decoded.role || 'user',
            };
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

// Middleware for optional authentication (attaches req.user if valid token present, otherwise proceeds)
export const optionalAuthenticateJWT = (req, res, next) => {
    const token = req.cookies?.token;
    const googleToken = req.cookies?.googleToken;
    if (!token && !googleToken) {
        return next();
    }
    const verificationToken = token ? token : googleToken;
    jwt.verify(verificationToken, process.env.JWT_SECRET, async (err, decoded) => {
        if (err || !decoded?.id) {
            return next();
        }
        try {
            const user = await User.findById(decoded.id).select('role isDeactivated');
            if (user && !user.isDeactivated) {
                req.user = {
                    ...decoded,
                    role: user.role || decoded.role || 'user',
                };
            }
        } catch (e) {
            // ignore
        }
        next();
    });
};

export default authenticateJWT;

