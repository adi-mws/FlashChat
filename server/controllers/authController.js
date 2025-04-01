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
    const { token } = req.body;

    try {
        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { sub, email, name, picture } = ticket.getPayload();  // Extract Google user data

        // Generate your own JWT token with Google info
        const jwtToken = jwt.sign(
            { id: sub, email, name: name, pfp: picture },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.cookie('googleToken', jwtToken, {
            httpOnly: true,       // Prevent client-side access
            secure: process.env.NODE_ENV === 'production',  // Secure in production
            sameSite: 'Strict',   // Prevent CSRF attacks
            maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days expiration
        });

        const generateUserName = (name) => {
            const randomDigits = Math.floor(1000 + Math.random() * 9000); // Generates a 4-digit random number
            return name.replace(/ /g, '-').toLowerCase() + randomDigits;
        };

        res.status(200).json({
            message: "Google Auth Successful",
            user: {
                id: sub,                  // Google ID
                username: generateUserName(name),
                name: name,        // Google Username
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
    const { username, password } = req.body;

    try {
        // Find user by username
        const user = await User.findOne({ username });

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
                pfp: user.pfp ? `${process.env.BASE_URL}/${user.pfp}` : null
            },
            token // Also send the token in response
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Error logging in user' });
    }
};



// Logout user
export const logoutUser = async (req, res) => {
    try {
        if (res.cookie.googleToken) {
            res.cookie('googleToken', '', {
                httpOnly: true,
                expires: new Date(0)
            });
        } else {
            res.cookie('token', '', {
                httpOnly: true,
                expires: new Date(0)
            });
        }

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Logout Error!', error: error });
    }
};


// Generate JWT Token
export const generateToken = (id, name, email) => {
    return jwt.sign({ id, name, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};




export const verifyUserDetails = async (req, res) => {
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];  // Check for JWT token in cookie or header
    const googleToken = req.cookies?.googleToken;  // Check for Google token
    if (!token && !googleToken) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    try {
        let user;

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            user = await User.findById(decoded.userId);

            if (user) {
                return res.status(200).json({ id: user._id, email: user.email, pfp: `${process.env.BASE_URL}/${user.pfp}`, name: user.name })
            }
        } else if (googleToken) {
            const decodedToken = jwt.decode(googleToken);
            return res.status(200).json({
                name: decodedToken.name,
                email: decodedToken.email,
                pfp: decodedToken.pfp,
                id: decodedToken.id,
            })
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

    } catch (error) {
        console.error('Authentication failed:', error);
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
