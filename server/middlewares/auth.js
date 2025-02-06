import jwt from 'jsonwebtoken';

const authenticateJWT = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer token

    if (!token) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user; // Attach user to request
        next(); // Proceed to the next middleware
    });
};

// Middleware to verify if the user has admin privileges
export const authorizeAdmin = (req, res, next) => {
    // Ensure the user is authenticated first
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized access' });
    }

    // Check if the user has the role of admin
    if (req.user.role !== 'user') {
        return res.status(403).json({ message: 'Access denied, admin only' });
    }

    // Proceed to the next middleware or route handler if the user is an admin
    next();
};

export default authenticateJWT;