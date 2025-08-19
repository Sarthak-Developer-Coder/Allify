const mongoose = require("mongoose");

const QuestionLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    title: { type: String, required: true },
    platform: { type: String, enum: ["LeetCode","GFG","Codeforces","CodeChef","AtCoder","HackerRank","InterviewBit","CodeStudio","Other"], default: "Other" },
    difficulty: { type: String, enum: ["Easy","Medium","Hard","Unknown"], default: "Unknown" },
    url: { type: String, default: "" },
    tags: [{ type: String }],
    notes: { type: String, default: "" },
    status: { type: String, enum: ["Solved","Revisit","Pending"], default: "Solved" },
    solvedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("QuestionLog", QuestionLogSchema);
