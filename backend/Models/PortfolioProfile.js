const mongoose = require("mongoose");

const PortfolioProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true, index: true },
    bio: { type: String, default: "" },
    headline: { type: String, default: "" },
    website: { type: String, default: "" },
    socials: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" },
    },
    handles: {
      leetcode: { type: String, default: "" },
      gfg: { type: String, default: "" },
      codeforces: { type: String, default: "" },
      codechef: { type: String, default: "" },
      atcoder: { type: String, default: "" },
      hackerrank: { type: String, default: "" },
      interviewbit: { type: String, default: "" },
      codestudio: { type: String, default: "" },
      other: { type: String, default: "" },
    },
    badges: [
      {
        title: String,
        iconUrl: String,
      },
    ],
    ratings: [
      {
        platform: String,
        rating: Number,
        lastUpdated: { type: Date, default: Date.now },
      },
    ],
    projects: [
      {
        title: { type: String, required: true },
        description: { type: String, default: "" },
        url: { type: String, default: "" },
        stars: { type: Number, default: 0 },
    pinned: { type: Boolean, default: false },
        tags: [{ type: String }],
      },
    ],
  slug: { type: String, unique: true, sparse: true },
  theme: { type: String, default: "light" },
  accentColor: { type: String, default: "#805AD5" },
  isPublic: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PortfolioProfile", PortfolioProfileSchema);
