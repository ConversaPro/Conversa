const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: null,
    },
    audioUrl: {
      type: String,
      default: null,
    },
    reaction: {
      type: String,
      default: "",
    },
    seenBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        seenAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deletedFrom: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      ref: "Message",
    },
  },
  {
    timestamps: true,
  }
);

// Extend schema for call logs without breaking existing docs
MessageSchema.add({
  callType: { type: String, enum: [null, 'audio', 'video'], default: null },
  callStatus: {
    type: String,
    enum: [null, 'initiated', 'accepted', 'ended', 'missed', 'rejected'],
    default: null,
  },
  callStartedAt: { type: Date, default: null },
  callEndedAt: { type: Date, default: null },
  callDurationMs: { type: Number, default: 0 },
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
