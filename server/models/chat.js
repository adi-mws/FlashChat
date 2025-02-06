import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String, // Could be ObjectId if using authentication
      required: true,
    },
    receiver: {
      type: String, // Could be ObjectId if using authentication
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema(
  {
    user1: {
      type: String, // First participant
      required: true,
    },
    user2: {
      type: String, // Second participant
      required: true,
    },
    messages: [messageSchema], // Stores messages for the chat
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
