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
    about: {
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
        "https://ui-avatars.com/api/?name=Allify&background=random&bold=true",
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
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Post" }],
  blocked: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // LinkedIn-like fields
  connections: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  invitesReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  invitesSent: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  headline: { type: String, default: "" },
  location: { type: String, default: "" },
  experience: [
    {
      title: String,
      company: String,
      startDate: Date,
      endDate: Date,
      current: { type: Boolean, default: false },
      description: String,
    },
  ],
  education: [
    {
      school: String,
      degree: String,
      field: String,
      startDate: Date,
      endDate: Date,
      description: String,
    },
  ],
  skills: [{ type: String }],
  endorsements: [
    {
      skill: String,
      by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      endorsedAt: { type: Date, default: Date.now },
    },
  ],
  openToWork: { type: Boolean, default: false },
  openToHire: { type: Boolean, default: false },
  followingCompanies: [{ type: mongoose.Schema.Types.ObjectId, ref: "Company" }],
  savedJobs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Job" }],
  // Extras for Snapchat-like features
  isAdmin: { type: Boolean, default: false },
  avatarSeed: { type: String, default: "" },
  shareLocation: { type: Boolean, default: false },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
  },
  locationUpdatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", Userschema);
module.exports = User;
