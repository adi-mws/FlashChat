import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: {
    type: String,
    required: false
  },
  pfp: {
    type: String,
    default: ''
  },
  lastOnline: {
    type: Date,
    default: Date.now
  },
  showLastMessageInList: {
    type: Boolean,
    default: true,
    required: false
  },
  about: {
    type: String,
    default: "FlashChat User", 
    required: false,
  },
  encryptedPrivateKey: {
    type: String,
    required: false
  },
  backupSalt: {
    type: String,
    required: false
  },
  backupIv: {
    type: String,
    required: false
  },
  contacts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    }
  ],
  friendRequests: [
    {
      from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who sent
      createdAt: { type: Date, default: Date.now }, 
    }
  ],

  sentRequests: [
    {
      to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now }, 
    }
  ],

  // Moderation & Access Control
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user',
  },
  isDeactivated: {
    type: Boolean,
    default: false,
    index: true,
  },
  deactivatedReason: {
    type: String,
    default: '',
  },
  deactivatedAt: {
    type: Date,
    default: null,
  },
  
}, {timestamps: true});

const User = mongoose.model('User', userSchema);
export default User; 
