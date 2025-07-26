import User from '../models/user.js';
import bcrypt, { hashSync } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { sendEmailInWorker } from '../lib/createEmailWorker.js';
import crypto from 'crypto';

// Get the current directory dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


export const registerUser = async (req, res) => {
  const { email, password, username, name } = req.body;
  console.log(email, password, username, name);

  try {
    const userExists = await User.findOne({ type: 'normal', username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user with hashed password
    await User.create({
      username,
      email,
      name,
      password: hashSync(password, 10),
      type: 'normal'
    });

    // Non-blocking email sending via Worker Thread
    sendEmailInWorker({
      to: email,
      subject: 'Welcome to FlashChat 🎉',
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background: #f9f9f9; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <h2 style="color: #333;">Hi ${name},</h2>
        <p style="font-size: 15px; color: #555;">
          Thank you for registering on <strong style="color: #007bff;">FlashChat</strong>!
        </p>
        <p style="font-size: 15px; color: #555;">
          Start chatting now and connect with your friends!
        </p>
        
        <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
          <a href="${process.env.CLIENT_URL}/login" target="_blank" 
             style="display: inline-block; padding: 12px 25px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Start Chatting
          </a>
        </div>
    
        <p style="font-size: 14px; color: #888;">Cheers,</p>
        <p style="font-size: 14px; color: #888;"><strong>The FlashChat Team</strong></p>
      </div>
    `
    });
    res.status(201).json({
      message: "User registered successfully",
    });

  } catch (error) {
    console.error(error);
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
      sameSite: 'None',   // Prevent CSRF attacks
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
        pfp: user.pfp
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
    // 1. Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    // --- CASE 1: Login Flow ---
    if (available) {
      const user = await User.findOne({ email, googleId, type: 'google' });
      if (!user) {
        return res.status(404).json({ message: 'User not found for Google login' });
      }

      const jwtToken = jwt.sign(
        { id: user._id, email, name: user.name, pfp: user.pfp },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.cookie('googleToken', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        message: 'Google login successful',
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          type: 'google',
        },
      });
    }

    // --- CASE 2: Registration Flow ---
    if (username && !available) {
      // Step 1: Check for duplicate username
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      // Step 2: Check if the Google account already exists
      const existingGoogleUser = await User.findOne({ email, googleId });
      if (existingGoogleUser) {
        return res.status(409).json({ message: 'Google account already registered' });
      }

      // Step 3: Register new user
      const newUser = await User.create({
        googleId,
        username,
        name,
        email,
        pfp: picture,
        type: 'google',
      });

      const jwtToken = jwt.sign(
        { id: newUser._id, email, name: newUser.name, pfp: newUser.pfp },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.cookie('googleToken', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'None',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.status(201).json({
        message: 'Google registration successful',
        user: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          pfp: newUser.pfp,
          type: 'google',
        },
      });
    }

    return res.status(400).json({
      message: 'Invalid Google Auth flow: missing parameters or incorrect flags',
    });

  } catch (error) {
    console.error('Google Auth Error:', error);

    if (error.code === 11000) {
      return res.status(409).json({ message: 'Duplicate field error (username/email already exists)' });
    }

    return res.status(500).json({ message: 'Error during Google Authentication' });
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
      sameSite: 'None',
      secure: process.env.NODE_ENV === 'production',
    });

    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'None',
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
          return res.status(200).json({ id: user._id, email: user.email, username: user.username, showLastMessage: user.showLastMessageInList, pfp: user.pfp, name: user.name })
        }
      });
    }

  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};




export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email, type: 'normal' });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min expiry

    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    sendEmailInWorker({
      to: user.email,
      subject: 'Password Reset - FlashChat',
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #007bff;">Hi ${user.name},</h2>
        
        <p>You recently requested to reset your password for your FlashChat account. Click the button below to proceed:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" target="_blank"
             style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">This link will expire in 15 minutes. If you didn’t request this, you can safely ignore this email.</p>
    
        <p style="margin-top: 30px;">Stay secure,</p>
        <p><strong>– The FlashChat Team</strong></p>
      </div>
    `
    });

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while processing request.' });
  }
};


export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required.' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
      type: 'normal'
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    user.password = hashSync(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: 'Password reset successful. You can now log in.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong during password reset.' });
  }
};
