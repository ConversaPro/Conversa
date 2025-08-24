const mongoose = require("mongoose");

const Userschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: false,
      minlength: 3,
      maxlength: 30,
    },
    about: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    profilePic: {
      type: String,
      default:
        "https://ui-avatars.com/api/?name=Conversa&background=random&bold=true",
    },
    coverPhoto: {
      type: String,
      default: "",
    },
    otp: {
      type: String,
      default: "",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    privacy: {
      showLastSeen: { type: Boolean, default: true },
      showProfilePhoto: { type: Boolean, default: true },
      showAbout: { type: Boolean, default: true },
      readReceipts: { type: Boolean, default: true },
    },
    twoFactorEnabled: { type: Boolean, default: false },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    themePreference: { type: String, enum: ["system", "light", "dark"], default: "system" },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", Userschema);
module.exports = User;
