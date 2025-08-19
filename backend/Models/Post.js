const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, default: "" },
    mediaUrl: { type: String, default: null }, // image or video (Cloudinary)
    mediaType: { type: String, enum: ["image", "video", null], default: null },
    caption: { type: String, default: "" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentsCount: { type: Number, default: 0 },
    repostOf: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
