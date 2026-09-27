import mongoose from "mongoose";

const companionPairingSchema = new mongoose.Schema({
  pairingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  pairingCode: {
    type: String,
    required: true,
    index: true,
  },
  publicKey: {
    type: String,
    required: true,
  },
  os: {
    type: String,
    default: "Unknown",
  },
  browser: {
    type: String,
    default: "Unknown",
  },
  ip: {
    type: String,
    default: "",
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "expired"],
    default: "pending",
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  token: {
    type: String,
    default: null,
  },
  userPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
}, { timestamps: true });

const CompanionPairing = mongoose.model("CompanionPairing", companionPairingSchema);
export default CompanionPairing;
