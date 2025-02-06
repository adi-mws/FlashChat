import Admin from '../models/admin.js';
import bcrypt, { hashSync } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the current directory dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register Admin
export const registerAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const adminExists = await Admin.findOne({ email });
        if (adminExists) {
            return res.status(400).json({ message: "Admin already exists" });
        }

        // Create admin with hashed password
        const admin = await Admin.create({ email, password: hashSync(password, 10) });

        // Generate JWT token for the admin
        const token = generateToken(admin._id);

        
        // Respond to the client with a success message and token
        res.status(200).json({
            message: "Admin registered successfully",
            token,
            admin: { id: admin._id, email: admin.email }
        });

    } catch (error) {
        res.status(500).json({ message: 'Error registering admin', error });
    }
};


// Login Admin
export const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    // console.log(email, password); (DEBUGGER)

    try {
        // Await the result of the findOne query
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // console.log(admin.email); {DEBUGGER}

        // Compare the provided password with the hashed password
        const isPasswordMatch = await bcrypt.compare(password, admin.password);
        // console.log(isPasswordMatch); {DEBUGGER}

        if (!isPasswordMatch) {
            return res.status(401).json({ message: 'Invalid Credentials' });
        }

        // Generate a token
        const token = generateToken(admin._id);

        res.status(200).json({ message: "admin logged in successfully!", token, admin: {email: admin.email, id: admin._id} });
    } catch (error) {
        console.error('Error during login:', error); // Log the error for debugging
        res.status(500).json({ message: 'Error logging in admin' });
    }
};


// Logout Admin
export const logoutAdmin = async (req, res) => {
    res.status(200).json({ message: 'Logged out successfully' });
}

// Generate JWT Token
export const generateToken = (adminId) => {
    return jwt.sign({ adminId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
};






// Verify Admin Details

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
            // Find the admin by id from the decoded token
            const admin = await Admin.findById(decoded.adminId);

            if (!admin) {
                return res.status(404).json({ message: 'admin not found' });
            }


            // Return full admin details along with a boolean indicating if admin exists
            res.status(200).json({
                id: admin._id,
                email: admin.email,
         // Boolean indicating if an admin exists in the database
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Error fetching admin data', error });
        }
    });
};

