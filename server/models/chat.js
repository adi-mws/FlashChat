import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin", // Reference to the Admin model
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean, 
      default: false,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  // { _id: false } // Avoids creating a separate ID for each message
);

const chatSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId, // First participant
      ref: "Admin", // Reference to the Admin model
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId, // Second participant
      ref: "Admin", // Reference to the Admin model
      required: true,
    },
    messages: [messageSchema], // Stores messages for the chat
  },
  { timestamps: true }
);

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
