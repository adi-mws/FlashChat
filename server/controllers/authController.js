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
        const Us = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Create user with hashed password
        const user = await user.create({ name, email, password: hashSync(password, 10) });
        console.log(email);



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

// Login user
export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    // console.log(email, password); (DEBUGGER)

    try {
        // Await the result of the findOne query
        const user = await user.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // console.log(user.email); {DEBUGGER}

        // Compare the provided password with the hashed password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        // console.log(isPasswordMatch); {DEBUGGER}

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate a token
        const token = generateToken(user._id);
        console.log(user._id);
        res.status(200).json({ message: "user logged in successfully!", token, user: { username: user.username, pfp: user.pfp, email: user.email, id: user._id } });
    } catch (error) {
        console.error('Error during login:', error); // Log the error for debugging
        res.status(500).json({ message: 'Error logging in user' });
    }
};


// Logout user
export const logoutUser = async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
}

// Generate JWT Token
export const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};






// Verify user Details

export const verifyUserDetails = async (req, res) => {
    const token = req.headers['authorization']?.split(' ')[1]; // Bearer token
    if (!token) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }

        try {
            // Find the user by id from the decoded token
            const user = await user.findById(decoded.userId);

            if (!user) {
                return res.status(404).json({ message: 'user not found' });
            }


            // Return full user details along with a boolean indicating if user exists
            res.status(200).json({
                id: user._id,
                name: user.name,
                email: user.email,
                // Boolean indicating if an user exists in the database
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching user data', error });
        }
    });
};

