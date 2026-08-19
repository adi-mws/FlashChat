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

  // For text messages, this is the plain/encrypted text.
  // For image/file messages with a caption, this holds the encrypted caption.
  content: {
    type: String,
    trim: true,
    default: ''
  },

  // 'text' | 'image' | 'file'
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text'
  },

  encryption: {
    isEncrypted: { type: Boolean, default: false },
    iv: { type: String },
    encryptedKeys: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        key: { type: String }
      }
    ]
  },

  // Attachment fields (used for 'image' and 'file' types)
  attachmentUrl: { type: String, default: null },   // server path/URL to the stored file
  fileName:      { type: String, default: null },   // original filename
  fileSize:      { type: Number, default: null },   // bytes

  // Encryption metadata for the attachment (AES-GCM encrypted file bytes stored on disk)
  attachmentEncryption: {
    isEncrypted: { type: Boolean, default: false },
    iv:          { type: String },                  // base64 AES-GCM IV
    encryptedKeys: [                               // RSA-wrapped AES keys per user
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        key:    { type: String }
      }
    ]
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
  timestamps: true
});

messageSchema.index({ chat: 1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ createdAt: -1 });

const Message = mongoose.model('Message', messageSchema);
export default Message;