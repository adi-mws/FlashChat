import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import Account from '../models/account.js';
import Session from '../models/session.js';
import { buildSession } from '../lib/session.js';

const isProduction = process.env.NODE_ENV === 'production';

export const getAdminCookieOptions = (maxAge = null) => {
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

/**
 * Check if the initial Super Admin bootstrap has already been performed
 * GET /api/admin/auth/bootstrap-status
 */
export const getAdminBootstrapStatus = async (req, res) => {
  try {
    const superAdminCount = await User.countDocuments({ role: 'superadmin' });
    const isBootstrapped = superAdminCount > 0;
    return res.status(200).json({
      success: true,
      isBootstrapped,
      superAdminCount,
      message: isBootstrapped
        ? "Super Admin already initialized."
        : "Initial Super Admin bootstrap required."
    });
  } catch (error) {
    console.error("Error checking admin bootstrap status:", error);
    return res.status(500).json({ success: false, message: "Failed to query admin status" });
  }
};

/**
 * Dedicated Admin Login
 * POST /api/admin/auth/login
 * Strictly accepts admin and superadmin roles only. Standard users are denied.
 */
export const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username/email and password are required for Administrator login."
    });
  }

  try {
    const trimmedUser = username.trim().toLowerCase();

    // Find admin by username or email
    const user = await User.findOne({
      $or: [
        { username: trimmedUser },
        { email: trimmedUser }
      ]
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials."
      });
    }

    // Role Guard: Reject standard users attempting to log into admin console
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Standard user accounts cannot log in through the Admin Console. Please use the standard user login."
      });
    }

    if (user.isDeactivated) {
      return res.status(403).json({
        success: false,
        message: "Administrator account is currently deactivated. Contact Super Admin."
      });
    }

    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: "No password configured on this administrator account."
      });
    }

    // Verify bcrypt password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid administrator credentials."
      });
    }

    // Ensure credentials account exists
    const account = await Account.findOneAndUpdate(
      { user: user._id, provider: 'credentials' },
      { user: user._id, provider: 'credentials' },
      { upsert: true, new: true }
    );

    // Build and save active session
    const sessionData = buildSession(req, user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    let session = await Session.findOne({
      user: user._id,
      sessionId: sessionData.sessionId
    });

    if (session) {
      session.expiresAt = expiresAt;
      session.lastSeenAt = new Date();
      session.ip = sessionData.ip;
      session.browser = sessionData.browser;
      session.os = sessionData.os;
      session.userAgent = sessionData.userAgent;
      await session.save();
    } else {
      session = await Session.create({
        ...sessionData,
        user: user._id,
        accountId: account._id,
        expiresAt,
        lastSeenAt: new Date()
      });
    }

    // Issue JWT with role and sessionId
    const token = jwt.sign(
      {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId: session.sessionId,
        accountId: account._id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Set HTTP-only cookie with explicit root path
    res.cookie('token', token, getAdminCookieOptions(7 * 24 * 60 * 60 * 1000));

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.role === 'superadmin' ? 'Super Admin' : 'Admin'} @${user.username}!`,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        pfp: user.pfp,
        role: user.role,
        sessionId: session.sessionId,
      },
      token
    });

  } catch (error) {
    console.error("Admin Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during administrator login."
    });
  }
};

/**
 * Dedicated Admin Registration & Bootstrap Claim
 * POST /api/admin/auth/register
 * 
 * Flow A (Bootstrap): If no superadmin exists, allows claiming Super Admin using Master Passkey.
 * Flow B (Provisioning): If Super Admin is authenticated, allows creating new secondary Admins.
 */
export const adminRegister = async (req, res) => {
  const { masterKey, username, password, confirmPassword, name, email, role } = req.body;

  try {
    const totalSuperAdmins = await User.countDocuments({ role: 'superadmin' });

    // --- Flow A: Initial Bootstrap (No Super Admin exists yet) ---
    if (totalSuperAdmins === 0) {
      const MASTER_SECRET = process.env.ADMIN_MASTER_KEY || "FLASHCHAT_SUPREME_2026";

      if (!masterKey || masterKey !== MASTER_SECRET) {
        return res.status(403).json({
          success: false,
          message: "Invalid Master Passkey. Super Admin registration rejected."
        });
      }

      if (!username || !username.trim()) {
        return res.status(400).json({
          success: false,
          message: "Username or email is required to initialize the Super Admin."
        });
      }

      if (!password || password.length < 6) {
        return res.status(400).json({
          success: false,
          message: "A secure Super Admin password of at least 6 characters is required."
        });
      }

      if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: "Password and Confirm Password do not match."
        });
      }

      const trimmedUser = username.trim().toLowerCase();

      // Check if user already exists
      let user = await User.findOne({
        $or: [{ username: trimmedUser }, { email: trimmedUser }]
      });

      const hashedPassword = await bcrypt.hash(password, 10);

      if (!user) {
        user = await User.create({
          username: trimmedUser,
          name: name ? name.trim() : trimmedUser,
          email: email ? email.trim().toLowerCase() : `${trimmedUser}@flashchat.admin`,
          password: hashedPassword,
          role: 'superadmin',
        });
      } else {
        user.role = 'superadmin';
        user.password = hashedPassword;
        if (name) user.name = name.trim();
        await user.save();
      }

      const account = await Account.findOneAndUpdate(
        { user: user._id, provider: 'credentials' },
        { user: user._id, provider: 'credentials' },
        { upsert: true, new: true }
      );

      // Create session and issue cookie
      const sessionData = buildSession(req, user);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const session = await Session.create({
        ...sessionData,
        user: user._id,
        accountId: account._id,
        expiresAt,
        lastSeenAt: new Date()
      });

      const token = jwt.sign(
        {
          id: user._id,
          username: user.username,
          email: user.email,
          role: 'superadmin',
          sessionId: session.sessionId,
          accountId: account._id,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.cookie('token', token, getAdminCookieOptions(7 * 24 * 60 * 60 * 1000));

      return res.status(201).json({
        success: true,
        message: "Super Admin bootstrap completed! Authority established and password secured.",
        user: {
          id: user._id,
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          pfp: user.pfp,
          role: 'superadmin',
          sessionId: session.sessionId,
        },
        token
      });
    }

    // --- Flow B: Super Admin already exists ---
    // Unauthenticated callers cannot use masterKey anymore
    if (!req.user || req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: "Super Admin has already been initialized. Master Passkey bootstrap is permanently closed. Only an authenticated Super Admin can create additional administrators."
      });
    }

    // Authenticated Super Admin registering a secondary administrator
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required to create a new administrator."
      });
    }

    const trimmedUser = username.trim().toLowerCase();
    const existing = await User.findOne({
      $or: [
        { username: trimmedUser },
        { email: email ? email.trim().toLowerCase() : trimmedUser }
      ]
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "An account with this username or email already exists."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await User.create({
      username: trimmedUser,
      name: name ? name.trim() : trimmedUser,
      email: email ? email.trim().toLowerCase() : `${trimmedUser}@flashchat.admin`,
      password: hashedPassword,
      role: 'admin', // secondary admin
    });

    await Account.create({
      user: newAdmin._id,
      provider: 'credentials'
    });

    return res.status(201).json({
      success: true,
      message: `Administrator @${newAdmin.username} created successfully.`,
      user: {
        id: newAdmin._id,
        _id: newAdmin._id,
        name: newAdmin.name,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error("Admin Registration Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during administrator registration."
    });
  }
};

/**
 * Dedicated Admin Logout
 * POST /api/admin/auth/logout
 * Destroys session and thoroughly clears cookies
 */
export const adminLogout = async (req, res) => {
  try {
    const token = req.cookies?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded?.id && decoded?.sessionId) {
          await Session.deleteOne({
            user: decoded.id,
            sessionId: decoded.sessionId,
          });
        }
      } catch (tokenErr) {
        // Token might already be expired
      }
    }

    const clearOpts = getAdminCookieOptions(0);
    res.clearCookie('token', clearOpts);
    res.clearCookie('googleToken', clearOpts);

    return res.status(200).json({
      success: true,
      message: "Admin session terminated successfully."
    });
  } catch (error) {
    console.error("Admin Logout Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to sign out administrator cleanly."
    });
  }
};

/**
 * Get current authenticated admin profile
 * GET /api/admin/auth/me
 */
export const getAdminMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user || (user.role !== 'admin' && user.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: "Not authorized as administrator."
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        pfp: user.pfp,
        role: user.role,
        sessionId: req.sessionId
      }
    });
  } catch (error) {
    console.error("Get Admin Me Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve administrator profile."
    });
  }
};
