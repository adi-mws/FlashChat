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

const Chat = mongoose.model('Chat', chatSchema);
export default Chat;
// Future Purpose

  // For group chats
  // isGroupChat: {
  //   type: Boolean,
  //   default: false
  // },
  // groupName: {
  //   type: String,
  //   trim: true
  // },
  // groupAdmin: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User'
  // },
  // groupPhoto: {
  //   type: String,
  //   default: ''
  // },