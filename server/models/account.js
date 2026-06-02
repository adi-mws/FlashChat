import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  provider: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  providerAccountId: {
    type: String,
    default: null,
  },
}, { timestamps: true });

accountSchema.index(
  { provider: 1, providerAccountId: 1 },
  {
    unique: true,
    partialFilterExpression: { providerAccountId: { $type: "string" } },
  }
);
accountSchema.index({ user: 1, provider: 1 }, { unique: true });

const Account = mongoose.model("Account", accountSchema);
export default Account;
