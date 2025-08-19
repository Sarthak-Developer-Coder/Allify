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
      trim: true,
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
    videoUrl: {
      type: String,
      default: null,
    },
    reaction: {
      type: String,
      default: "",
    },
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    expiresAt: {
      type: Date,
      default: null,
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
    isForwarded: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Custom validator: require at least one of text or imageUrl to be non-empty
// Enforce ONLY on creation to avoid breaking legacy docs when updating metadata (e.g., seenBy)
MessageSchema.pre("validate", function (next) {
  if (this.isNew) {
    const hasText = typeof this.text === "string" && this.text.trim().length > 0;
    const hasImage = typeof this.imageUrl === "string" && this.imageUrl.trim().length > 0;
    const hasAudio = typeof this.audioUrl === "string" && this.audioUrl.trim().length > 0;
    const hasVideo = typeof this.videoUrl === "string" && this.videoUrl.trim().length > 0;
    if (!hasText && !hasImage && !hasAudio && !hasVideo) {
      this.invalidate("text", "Message must have either text, imageUrl, audioUrl or videoUrl.");
      this.invalidate("imageUrl", "Message must have either text, imageUrl, audioUrl or videoUrl.");
      this.invalidate("audioUrl", "Message must have either text, imageUrl, audioUrl or videoUrl.");
      this.invalidate("videoUrl", "Message must have either text, imageUrl, audioUrl or videoUrl.");
    }
  }
  next();
});

const Message = mongoose.model("Message", MessageSchema);
module.exports = Message;
