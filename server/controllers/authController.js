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

    const { email, password, username, name } = req.body;
    console.log(email, password, username, name)
    try {
        const userExists = await User.findOne({ type: 'normal', username: username });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }


        // Create user with hashed password
        await User.create({ username: username, email: email, name: name,  password: hashSync(password, 10),  type: 'normal' });



        // Respond to the client with a succesgs message and token
        res.status(201).json({
            message: "User registered successfully",
        });

    } catch (error) {

        res.status(500).json({ message: 'Error registering User', error });
    }
};

export const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user by username
        const user = await User.findOne({ username: username, type: 'normal' });

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
            { id: user._id, email: user.email },  // Payload
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
                username: user.username,
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



const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
export const googleAuthPreCheck = async (req, res) => {
    const { token } = req.body;

    try {

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });


        const { email, sub } = ticket.getPayload();
        const user = await User.findOne({ email: email, type: 'google', googleId: sub });
        // console.log("User detection Pre AUth: ", user);
        if (!user) {
            return res.status(200).json({ available: false });
        } else {
            return res.status(200).json({ message: 'Google Auth pre-check done', available: true });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error in google auth pre-check' });
    }
}

export const googleAuth = async (req, res) => {
    const { token, username, available } = req.body;

    try {
        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const { sub, email, name, picture } = ticket.getPayload();  // Extract Google user data
        if (available) { // if user already exists
            const user = await User.findOne({ email: email, type: "google", googleId: sub }) // fetch the existing user
            if (!user) {
                return res.status(404).json({ message: "User not found in database! for Google Auth Login" })
            }
            const jwtToken = jwt.sign(
                { id: user._id, email, name: user.name, pfp: user.pfp },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.cookie('googleToken', jwtToken, {
                httpOnly: true,       // Prevent client-side access
                secure: process.env.NODE_ENV === 'production',  // Secure in production
                sameSite: 'Strict',   // Prevent CSRF attacks
                maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days expiration
            });

            return res.status(200).json({
                message: "Google Auth Login Successful!", user: {
                    id: user._id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    pfp: user.pfp,
                    type: 'google'
                }
            })
        }

        // Registration of new user
        if (username && !available) {
            const newUser = await User.create({
                googleId: sub,
                username: username,
                name: name,
                email: email,
                pfp: 'uploads/pfps/default-pfp.jpeg',
                type: 'google'
            })
            await newUser.save();

            const jwtToken = jwt.sign(
                { id: newUser._id, email, name: newUser.name, pfp: newUser.pfp },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN }
            );

            res.cookie('googleToken', jwtToken, {
                httpOnly: true,       // Prevent client-side access
                secure: process.env.NODE_ENV === 'production',  // Secure in production
                sameSite: 'Strict',   // Prevent CSRF attacks
                maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days expiration
            });
            return res.status(201).json({
                message: "Google Auth Successfull",
                user: {
                    id: newUser._id,             // Google ID
                    username: newUser.username,
                    name: newUser.name,        // Google Username
                    email: newUser.email,                    // Google Email
                    pfp: newUser.pfp,
                    type: 'google'            // Google Profile Picture
                }
            });
        }

        return res.status(500).json({ message: 'None of the function (login or register) Google Auth triggered | Error can be with available and ' })

    } catch (error) {
        console.error('Error during Google Auth:', error);
        res.status(500).json({ message: 'Error during Google Authentication' });
    }
};


export const isUsernameExists = async (req, res) => {
    try {
        const un = await User.findOne({ username: req.params.username });
        if (!un) {
            return res.status(200).json({ available: true, message: "Availability sent successfully!" });
        }
        return res.status(200).json({ available: false, message: "Availability sent successfully!" });
    } catch (error) {
        return res.status(500).json({ message: "Error in checking username!" })
    }
}




// Logout user
// Logout user
export const logoutUser = async (req, res) => {
    try {
        res.clearCookie('googleToken', {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
        });

        res.clearCookie('token', {
            httpOnly: true,
            sameSite: 'Lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        return res.status(500).json({ message: 'Logout Error!', error: error.message });
    }
};



// Generate JWT Token
export const generateToken = (id, name, email) => {
    return jwt.sign({ id, name, email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};

export const verifyUserDetails = async (req, res) => {
    const normalToken = req.cookies?.token;  // Check for JWT token in cookie 
    const googleToken = req.cookies?.googleToken;  // Check for Google token
    if (!normalToken && !googleToken) {
        return res.status(403).json({ message: 'Access denied, no token provided' });
    }

    try {

        let user, token;
        token = googleToken ? googleToken : normalToken;


        if (token) {
            jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {

                if (err) {
                    return res.status(403).json({ message: 'Invalid or expired token' })
                }
                user = await User.findById(decoded.id);
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
                else {
                    return res.status(200).json({ id: user._id, email: user.email, username: user.username, showLastMessage: user.showLastMessageInList, pfp: `${process.env.BASE_URL}${user.pfp}`, name: user.name })
                }
            });
        }

    } catch (error) {
        console.error('Authentication failed:', error);
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};
