import User from '../models/user.js';
import bcrypt, { hashSync } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';

import path from 'path';

// Get the current directory dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register user
export const registerUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user with hashed password
        const user = await User.create({ name, email, password: hashSync(password, 10) });



        // Respond to the client with a success message and token
        res.status(201).json({
            message: "User registered successfully",
            user: { id: user._id, email: user.email, name: user.name }

        });

    } catch (error) {

        res.status(500).json({ message: 'Error registering User', error });
    }
};


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req, res) => {
    const { tokenId } = req.body;

    try {
        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { sub, email, name, picture } = ticket.getPayload();  // Extract Google user data

        // Generate your own JWT token with Google info
        const token = jwt.sign(
            { id: sub, email, name: name, pfp: picture },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        // Store token in an HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,                      // Secure against XSS
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict',                  // CSRF protection
            maxAge: 7 * 24 * 60 * 60 * 1000      // 7 days
        });

        res.status(200).json({
            message: "Google Auth Successful",
            user: {
                id: sub,                  // Google ID
                username: name,           // Google Username
                email,                    // Google Email
                pfp: picture              // Google Profile Picture
            }
        });

    } catch (error) {
        console.error('Error during Google Auth:', error);
        res.status(500).json({ message: 'Error during Google Authentication' });
    }
};



export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Check if the password matches
        const isPasswordMatch = await bcrypt.compare(password, user.password);

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email },  // Payload
            process.env.JWT_SECRET,                   // Secret Key
            { expiresIn: '7d' }                       // Expiration Time
        );

        // Set token in HTTP-only cookie
        res.cookie('token', token, {
            httpOnly: true,       // Prevent client-side access
            secure: process.env.NODE_ENV === 'production',  // Secure in production
            sameSite: 'Strict',   // Prevent CSRF attacks
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days expiration
        });

        // Send response with user details
        res.status(200).json({
            message: "User logged in successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                pfp: user.pfp ? `${process.env.BASE_URL}${user.pfp}` : null
            }
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
};



// Logout user
export const logoutUser = async (req, res) => {
    if (res.cookie.token)
        delete res.cookie[token]
    res.status(200).json({ message: 'Logged out successfully' });
}

// Generate JWT Token
export const generateToken = (id, name, email) => {
    return jwt.sign({ id, name, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};



export const verifyUserDetails = async (req, res) => {
    const token = req.cookies?.token;  // Get token from HTTP-only cookie
    // console.log(req.cookies)
    if (!token) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID from the decoded token
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create full PFP URL if the user has a PFP
        const pfpUrl = user.pfp ? `${process.env.BASE_URL}${user.pfp}` : null;

        // Send user details along with PFP
        res.status(200).json({
            id: user._id,
            name: user.name,
            email: user.email,
            pfp: pfpUrl  // Include PFP in response
        });

    } catch (error) {
        console.error('JWT verification failed:', error);
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
