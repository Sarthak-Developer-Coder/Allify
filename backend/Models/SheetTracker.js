const mongoose = require("mongoose");

const SheetTrackerSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    name: { type: String, required: true },
    url: { type: String, default: "" },
    total: { type: Number, default: 0 },
    completed: { type: Number, default: 0 },
    tags: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("SheetTracker", SheetTrackerSchema);
