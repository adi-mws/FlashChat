import User from '../models/user.js';
import Account from '../models/account.js';
import Session from '../models/session.js';
import CompanionPairing from '../models/companionPairing.js';
import bcrypt, { hashSync } from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { OAuth2Client } from 'google-auth-library';
import path from 'path';
import { sendEmailInWorker } from '../lib/createEmailWorker.js';
import crypto from 'crypto';
import { buildSession } from '../lib/session.js';
import { io } from '../socket/index.js';
import { getSessionRoom, isSessionOnline } from '../socket/store.js';

// Get the current directory dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
export const getCookieOptions = (maxAge = null) => {
  const options = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    path: '/',
  };
  if (maxAge !== null) {
    options.maxAge = maxAge;
  }
  return options;
};

const createAuthToken = async (user, account, req, extraPayload = {}) => {
  const sessionData = buildSession(req, user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Check if session with this sessionId already exists for this user
  let existingSession = await Session.findOne({
    user: user._id,
    sessionId: sessionData.sessionId,
  });

  let createdSession;
  if (existingSession) {
    existingSession.expiresAt = expiresAt;
    existingSession.lastSeenAt = new Date();
    existingSession.accountId = account._id;
    existingSession.ip = sessionData.ip;
    existingSession.browser = sessionData.browser;
    existingSession.os = sessionData.os;
    existingSession.userAgent = sessionData.userAgent;
    await existingSession.save();
    createdSession = existingSession;
  } else {
    // Reject new session if user already has 4 active sessions. Do not automatically remove any session.
    const activeSessionsCount = await Session.countDocuments({
      user: user._id,
      expiresAt: { $gt: new Date() },
    });

    if (activeSessionsCount >= 4) {
      const error = new Error("Maximum active sessions limit reached (4). Please log out from another session before signing in.");
      error.statusCode = 403;
      error.code = 'MAX_SESSIONS_REACHED';
      throw error;
    }

    createdSession = await Session.create({
      ...sessionData,
      user: user._id,
      accountId: account._id,
      expiresAt,
    });
  }

  if (req) {
    req.createdSessionId = createdSession.sessionId;
    req.createdSession = createdSession;
  }

  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      sessionId: createdSession.sessionId,
      accountId: account._id,
      provider: account.provider,
      ...extraPayload,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const ensureAccount = async ({ user, provider, providerAccountId = null }) => {
  let account = await Account.findOne({ user: user._id, provider });
  if (account) {
    let changed = false;
    if (providerAccountId && account.providerAccountId !== providerAccountId) {
      account.providerAccountId = providerAccountId;
      changed = true;
    }
    if (changed) await account.save();
    return account;
  }

  return Account.create({
    user: user._id,
    provider,
    providerAccountId,
  });
};


export const registerUser = async (req, res) => {
  const { email, password, username, name } = req.body;
  // console.log(email, password, username, name);

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Create user with hashed password
    const user = await User.create({
      username,
      email,
      name,
      password: hashSync(password, 10),
    });
    await ensureAccount({ user, provider: 'credentials' });

    // Non-blocking email sending via Worker Thread
    sendEmailInWorker({
      to: email,
      subject: 'Welcome to FlashChat',
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
    // Find user by username or email
    const user = await User.findOne({
      $or: [
        { username: username },
        { email: (username || '').toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'No password set on this account. Please sign in with Google or use forgot password to create one.' });
    }

    if (user.role == "admin" || user.role == "superadmin") {
      return res.status(401).json({ message: 'You are not authorized to login here ' });
    }
    // Check if the password matches
    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    if (user.isDeactivated) {
      return res.status(403).json({
        message: user.deactivatedReason || "Your account has been deactivated by administration for moderation policy violations.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    const account = await ensureAccount({
      user,
      provider: 'credentials',
    });

    const token = await createAuthToken(user, account, req);

    // Set token in HTTP-only cookie
    res.cookie('token', token, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    // Send response with user details
    res.status(200).json({
      message: "User logged in successfully!",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        pfp: user.pfp,
        type: account.provider,
        showLastMessageInList: user.showLastMessageInList,
        sessionId: req.createdSessionId || null,
        sessionPublicKey: req.createdSession?.publicKey || null,
        encryptedPrivateKey: user.encryptedPrivateKey,
        backupSalt: user.backupSalt,
        backupIv: user.backupIv,
        role: user.role || 'user',
        isDeactivated: !!user.isDeactivated
      },
      token // Also send the token in response
    });

  } catch (error) {
    console.error('Error during login:', error);
    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
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

    const { email } = ticket.getPayload();
    // Check if any user with this email exists (whether local or Google)
    const user = await User.findOne({ email });

    if (user && (user.role == "admin" || user.role == "superadmin")) {
      return res.status(401).json({ message: 'You are not authorized to login here ' });
    }

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

    if (available) {
      // Find user by email
      const existingAccount = await Account.findOne({
        provider: 'google',
        providerAccountId: googleId,
      }).populate('user');
      const user = existingAccount?.user || await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      
    if (user.role == "admin" || user.role == "superadmin") {
      return res.status(401).json({ message: 'You are not authorized to login here ' });
    }

      let updated = false;
      if (!user.pfp && picture) {
        user.pfp = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }

      const account = existingAccount || await ensureAccount({
        user,
        provider: 'google',
        providerAccountId: googleId,
      });

      const jwtToken = await createAuthToken(user, account, req, {
        name: user.name,
        pfp: user.pfp,
      });

      res.cookie('token', jwtToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

      return res.status(200).json({
        message: 'Google login successful',
        user: {
          id: user._id,
          username: user.username,
          name: user.name,
          email: user.email,
          pfp: user.pfp,
          role: user.role || 'user',
          type: account.provider,
          showLastMessageInList: user.showLastMessageInList,
          sessionId: req.createdSessionId || null,
          sessionPublicKey: req.createdSession?.publicKey || null,
          encryptedPrivateKey: user.encryptedPrivateKey,
          backupSalt: user.backupSalt,
          backupIv: user.backupIv
        },
      });
    }

    if (username && !available) {
      // Step 1: Check for duplicate username
      const existingUserByUsername = await User.findOne({ username });
      if (existingUserByUsername) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      // Step 2: Check if the Google account or email already exists
      const existingUserByEmail = await User.findOne({ email });
      if (existingUserByEmail) {
        // If email already exists, link Google ID and log them in
        const account = await ensureAccount({
          user: existingUserByEmail,
          provider: 'google',
          providerAccountId: googleId,
        });

        const jwtToken = await createAuthToken(existingUserByEmail, account, req, {
          name: existingUserByEmail.name,
          pfp: existingUserByEmail.pfp,
        });

        res.cookie('token', jwtToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

        return res.status(200).json({
          message: 'Google account linked and logged in successfully',
          user: {
            id: existingUserByEmail._id,
            username: existingUserByEmail.username,
            name: existingUserByEmail.name,
            email: existingUserByEmail.email,
            pfp: existingUserByEmail.pfp,
            role: existingUserByEmail.role || 'user',
            type: 'google',
            showLastMessageInList: existingUserByEmail.showLastMessageInList,
            sessionId: req.createdSessionId || null,
            sessionPublicKey: req.createdSession?.publicKey || null,
            encryptedPrivateKey: existingUserByEmail.encryptedPrivateKey,
            backupSalt: existingUserByEmail.backupSalt,
            backupIv: existingUserByEmail.backupIv
          },
        });
      }

      const newUser = await User.create({
        username,
        name,
        email,
        pfp: picture,
      });
      const account = await ensureAccount({
        user: newUser,
        provider: 'google',
        providerAccountId: googleId,
      });

      const jwtToken = await createAuthToken(newUser, account, req, {
        name: newUser.name,
        pfp: newUser.pfp,
      });

      res.cookie('token', jwtToken, getCookieOptions(7 * 24 * 60 * 60 * 1000));

      return res.status(201).json({
        message: 'Google registration successful',
        user: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.name,
          email: newUser.email,
          pfp: newUser.pfp,
          role: newUser.role || 'user',
          type: 'google',
          showLastMessageInList: newUser.showLastMessageInList,
          sessionId: req.createdSessionId || null,
          sessionPublicKey: req.createdSession?.publicKey || null,
          encryptedPrivateKey: newUser.encryptedPrivateKey,
          backupSalt: newUser.backupSalt,
          backupIv: newUser.backupIv
        },
      });
    }

    return res.status(400).json({
      message: 'Invalid Google Auth flow: missing parameters or incorrect flags',
    });

  } catch (error) {
    console.error('Google Auth Error:', error);

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }

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
    const token = req.cookies?.token || req.cookies?.googleToken;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id && decoded?.sessionId) {
          const sessionQuery = {
            user: decoded.id,
            sessionId: decoded.sessionId,
          };
          if (decoded.accountId) {
            sessionQuery.accountId = decoded.accountId;
          }

          await Session.updateOne(sessionQuery, {
            $set: { expiresAt: new Date(0) }
          });

          io?.to(getSessionRoom(decoded.id, decoded.sessionId)).emit('session_revoked');
          setTimeout(() => {
            io?.to(getSessionRoom(decoded.id, decoded.sessionId)).disconnectSockets(true);
          }, 100);
        }
      } catch (error) {
        // Clearing the cookie is still useful when the token is already expired.
      }
    }

    const clearOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'None' : 'Lax',
      path: '/',
    };
    res.clearCookie('googleToken', clearOpts);
    res.clearCookie('token', clearOpts);

    return res.status(200).json({ success: true, message: 'Logged out successfully' });
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
        ).populate('accountId');
        if (!session) {
          return res.status(403).json({ message: 'Session expired or logged out' });
        }

        user = await User.findById(decoded.id);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }

        if (user.isDeactivated) {
          return res.status(403).json({
            message: user.deactivatedReason || 'Your account has been deactivated by administration.',
            code: 'ACCOUNT_DEACTIVATED',
          });
        }

        return res.status(200).json({
          id: user._id,
          email: user.email,
          username: user.username,
          showLastMessageInList: user.showLastMessageInList,
          pfp: user.pfp,
          name: user.name,
          role: user.role || 'user',
          isDeactivated: !!user.isDeactivated,
          type: session.accountId?.provider || decoded.provider || 'credentials',
          sessionId: session.sessionId,
          sessionPublicKey: session.publicKey || null,
          encryptedPrivateKey: user.encryptedPrivateKey,
          backupSalt: user.backupSalt,
          backupIv: user.backupIv,
        });
      });
    }

  } catch (error) {
    console.error('Authentication failed:', error);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

export const getLoggedInDevices = async (req, res) => {
  try {
    const sessions = await Session.find({
      user: req.user.id,
      expiresAt: { $gt: new Date() },
    })
      .populate('accountId', 'provider')
      .sort({ lastSeenAt: -1 })
      .lean();

    const devices = sessions.map((session) => ({
      id: session._id,
      sessionId: session.sessionId,
      provider: session.accountId?.provider || 'credentials',
      os: session.os || 'Unknown',
      browser: session.browser || 'Unknown',
      ip: session.ip || '',
      userAgent: session.userAgent || '',
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      isCurrent: session.sessionId === req.sessionId,
      isOnline: isSessionOnline(req.user.id, session.sessionId),
      publicKey: session.publicKey || null,
      hasE2EEKey: !!session.publicKey,
    }));

    return res.status(200).json({ devices });
  } catch (error) {
    console.error('Failed to fetch logged in devices:', error);
    return res.status(500).json({ message: 'Failed to fetch logged in devices' });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { id } = req.params;
    const session = await Session.findOne({ _id: id, user: req.user.id });

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    await Session.deleteOne({ _id: id });

    // Emit session_revoked event, then disconnect the socket for this session if it is online
    io?.to(getSessionRoom(req.user.id, session.sessionId)).emit('session_revoked');
    setTimeout(() => {
      io?.to(getSessionRoom(req.user.id, session.sessionId)).disconnectSockets(true);
    }, 100);

    return res.status(200).json({ message: 'Device session revoked successfully' });
  } catch (error) {
    console.error('Failed to revoke session:', error);
    return res.status(500).json({ message: 'Failed to revoke session' });
  }
};

export const updateSessionPublicKey = async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.sessionId;
    const { publicKey, forceRekey = false } = req.body;

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ message: "A valid public key string is required." });
    }

    try {
      const parsed = JSON.parse(publicKey);
      if (!parsed.kty || parsed.kty !== "RSA") {
        return res.status(400).json({ message: "Invalid public key format: expected RSA JWK." });
      }
    } catch (e) {
      return res.status(400).json({ message: "Invalid public key format: not valid JSON." });
    }

    const session = await Session.findOne({
      sessionId,
      user: userId,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return res.status(404).json({ message: "Active session not found" });
    }

    if (session.publicKey && session.publicKey !== publicKey && !forceRekey) {
      return res.status(409).json({
        message: "A public key is already registered for this session. Set forceRekey: true to replace.",
        existingKey: true
      });
    }

    session.publicKey = publicKey;
    session.lastSeenAt = new Date();
    await session.save();

    return res.status(200).json({
      message: "Session public key registered successfully",
      sessionId: session.sessionId,
      publicKey: session.publicKey
    });
  } catch (error) {
    console.error("Error in updateSessionPublicKey:", error);
    return res.status(500).json({ message: "Failed to update session public key", error: error.message });
  }
};




export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: (email || '').toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await ensureAccount({ user, provider: 'credentials' });

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 15; // 15 min expiry

    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password/${token}`;

    const emailResult = await sendEmailInWorker({
      to: user.email,
      subject: 'Password Reset - FlashChat',
      html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #007bff;">Hi ${user.name},</h2>
        
        <p>You recently requested to reset or create a password for your FlashChat account. Click the button below to proceed:</p>
        
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

    if (!emailResult.success) {
      return res.status(500).json({
        message: 'Failed to send password reset email. Please check server email configuration or try again.'
      });
    }

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
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    await ensureAccount({ user, provider: 'credentials' });

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

/**
 * POST /api/auth/companion/init
 * Called by a new browser / companion device to initiate QR pairing.
 */
export const initCompanionPairing = async (req, res) => {
  try {
    const { publicKey, os, browser } = req.body;

    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ message: "Valid public key string is required for pairing." });
    }

    const pairingId = crypto.randomUUID();
    // Human-friendly 6-character code e.g. FC-8492
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const pairingCode = `FC-${randomDigits}`;
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes

    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '';

    await CompanionPairing.create({
      pairingId,
      pairingCode,
      publicKey,
      os: os || "Unknown",
      browser: browser || "Unknown",
      ip: clientIp,
      status: "pending",
      expiresAt,
    });

    res.status(201).json({
      pairingId,
      pairingCode,
      expiresAt,
    });
  } catch (error) {
    console.error("Error in initCompanionPairing:", error);
    res.status(500).json({ message: "Failed to initialize companion pairing", error: error.message });
  }
};

/**
 * GET /api/auth/companion/status/:pairingId
 * Polls pairing status if websocket is disconnected.
 */
export const getCompanionPairingStatus = async (req, res) => {
  try {
    const { pairingId } = req.params;
    const pairing = await CompanionPairing.findOne({ pairingId });

    if (!pairing) {
      return res.status(404).json({ status: "not_found", message: "Pairing session not found or expired." });
    }

    if (pairing.expiresAt < new Date()) {
      return res.status(410).json({ status: "expired", message: "Pairing session has expired." });
    }

    if (pairing.status === "approved") {
      // Set the token cookie on companion device as well!
      res.cookie('token', pairing.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));
      return res.status(200).json({
        status: "approved",
        token: pairing.token,
        user: pairing.userPayload,
      });
    }

    return res.status(200).json({
      status: pairing.status,
      pairingCode: pairing.pairingCode,
      expiresAt: pairing.expiresAt,
    });
  } catch (error) {
    console.error("Error in getCompanionPairingStatus:", error);
    res.status(500).json({ message: "Failed to fetch companion pairing status", error: error.message });
  }
};

/**
 * POST /api/auth/companion/claim
 * Called by Companion Device B once approved to establish its HTTP-only auth cookie and receive its user profile.
 */
export const claimCompanionPairing = async (req, res) => {
  try {
    const { pairingId } = req.body;
    if (!pairingId) {
      return res.status(400).json({ message: "pairingId is required" });
    }

    const pairing = await CompanionPairing.findOne({ pairingId });
    if (!pairing) {
      return res.status(404).json({ message: "Pairing session not found or already claimed." });
    }

    if (pairing.expiresAt < new Date()) {
      await CompanionPairing.deleteOne({ _id: pairing._id });
      return res.status(410).json({ message: "Pairing session expired." });
    }

    if (pairing.status !== "approved" || !pairing.token) {
      return res.status(400).json({ message: "Pairing session is not approved yet." });
    }

    // Set HTTP-only auth cookie on companion device
    res.cookie('token', pairing.token, getCookieOptions(7 * 24 * 60 * 60 * 1000));

    const payload = {
      token: pairing.token,
      user: pairing.userPayload,
    };

    // Burn pairing record so it cannot be claimed multiple times
    await CompanionPairing.deleteOne({ _id: pairing._id });

    return res.status(200).json(payload);
  } catch (error) {
    console.error("Error in claimCompanionPairing:", error);
    return res.status(500).json({ message: "Failed to claim companion session", error: error.message });
  }
};

/**
 * POST /api/auth/companion/approve
 * Authenticated endpoint: called by the logged-in device to authorize the new companion device.
 */
export const approveCompanionPairing = async (req, res) => {
  try {
    const userId = req.user.id;
    const { pairingId, pairingCode, keyPayload } = req.body;

    if (!pairingId && !pairingCode) {
      return res.status(400).json({ message: "pairingId or pairingCode is required." });
    }

    const query = {
      status: "pending",
      expiresAt: { $gt: new Date() },
    };
    if (pairingId) query.pairingId = pairingId;
    if (pairingCode) query.pairingCode = pairingCode.trim().toUpperCase();

    const pairing = await CompanionPairing.findOne(query);

    if (!pairing) {
      return res.status(404).json({ message: "No active pending pairing request found with this code." });
    }

    // Check active sessions limit (max 4)
    const activeSessionsCount = await Session.countDocuments({
      user: userId,
      expiresAt: { $gt: new Date() },
    });

    if (activeSessionsCount >= 4) {
      return res.status(403).json({
        message: "Maximum active sessions limit reached (4). Please revoke another session first.",
        code: "MAX_SESSIONS_REACHED"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const account = await Account.findOne({ user: userId }) || { _id: user._id, provider: 'credentials' };

    // Create the new session for Companion Device B
    const newSessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const newSession = await Session.create({
      sessionId: newSessionId,
      user: user._id,
      accountId: account._id,
      ip: pairing.ip || req.ip || "",
      os: pairing.os || "Unknown",
      browser: pairing.browser || "Unknown",
      publicKey: pairing.publicKey,
      expiresAt,
    });

    // Sign JWT token for the companion device
    const jwtToken = jwt.sign(
      {
        id: user._id,
        email: user.email,
        sessionId: newSession.sessionId,
        accountId: account._id,
        provider: account.provider,
        name: user.name,
        pfp: user.pfp,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const userPayload = {
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email,
      pfp: user.pfp,
      type: account.provider || 'credentials',
      showLastMessageInList: user.showLastMessageInList,
      sessionId: newSession.sessionId,
      sessionPublicKey: newSession.publicKey,
      encryptedPrivateKey: user.encryptedPrivateKey,
      backupSalt: user.backupSalt,
      backupIv: user.backupIv,
      transferredKeyPayload: keyPayload || null,
    };

    // Update pairing record
    pairing.status = "approved";
    pairing.userId = user._id;
    pairing.token = jwtToken;
    pairing.userPayload = userPayload;
    await pairing.save();

    // Notify Companion Device B via Socket.IO
    io?.to(`pairing:${pairing.pairingId}`).emit("companion_approved", {
      token: jwtToken,
      user: userPayload,
    });

    res.status(200).json({
      message: "Device linked successfully!",
      device: {
        os: pairing.os,
        browser: pairing.browser,
        sessionId: newSession.sessionId
      }
    });
  } catch (error) {
    console.error("Error in approveCompanionPairing:", error);
    res.status(500).json({ message: "Failed to approve companion pairing", error: error.message });
  }
};

