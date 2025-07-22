import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: {
    type: String,
    required: function () {
      return this.type === 'normal';
    }
  },
  googleId: {
    type: String,
    required: function () {
      return this.type === 'google';
    }
  },
  pfp: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['normal', 'google'],
    required: true
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
  
}, {timestamps: true});

const User = mongoose.model('User', userSchema);
export default User; 