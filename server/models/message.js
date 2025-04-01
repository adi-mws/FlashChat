import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  content: {
    type: String,
    trim: true
  },
  
  media: {
    url: String,
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'file']
    },
    size: Number,
    name: String
  },
  
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  deletedFor: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt
});

// Indexes for faster queries
messageSchema.index({ chat: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });
const Message = mongoose.model('Message', messageSchema);
export default Message;