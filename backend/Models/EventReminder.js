const mongoose = require("mongoose");

const EventReminderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    platform: { type: String, default: "" },
    startAt: { type: Date, required: true },
    url: { type: String, default: "" },
    notes: { type: String, default: "" },
  alerted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("EventReminder", EventReminderSchema);
