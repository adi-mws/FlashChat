import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  // Array of user references participating in the chat
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],

  // Last message reference for quick access
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // Group chat specific fields
  isGroupChat: {
    type: Boolean,
    default: false
  },
  groupName: {
    type: String,
    trim: true,
    default: ''
  },
  groupDescription: {
    type: String,
    trim: true,
    default: ''
  },
  groupPhoto: {
    type: String,
    default: ''
  },
  // Array of admin User ObjectIds
  groupAdmins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Invite link code (unique string token)
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  // Invite permissions
  allowMembersToInvite: {
    type: Boolean,
    default: true
  },
  // Maximum member limit
  memberLimit: {
    type: Number,
    default: 100
  },
  
  // Additional metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true 
});

// Indexes for faster queries
chatSchema.index({ participants: 1 });
chatSchema.index({ lastMessage: 1 });
chatSchema.index({ updatedAt: -1 });
chatSchema.index({ inviteCode: 1 });

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;