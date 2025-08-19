const mongoose = require("mongoose");

const MemorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    value: { type: String, default: "" },
    tags: [{ type: String }],
    weight: { type: Number, default: 1 },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CompanionProfileSchema = new mongoose.Schema(
  {
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, unique: true },
    displayName: { type: String, default: "Ava" },
    systemPrompt: { type: String, default: "You are a warm, caring, and helpful AI companion named Ava. Be concise, emotionally intelligent, and supportive. Match the selected mode’s tone without being overly verbose." },
    traits: { type: [String], default: ["empathetic", "playful", "supportive"] },
    appearance: {
      avatarUrl: { type: String, default: "" },
      skinColor: { type: String, default: "#f3d1c5" },
      eyeColor: { type: String, default: "#4a5c8a" },
      hairColor: { type: String, default: "#3b2f2f" },
      outfit: { type: String, default: "casual" },
  gokuSuperSaiyan: { type: Boolean, default: false },
  gojoBlindfold: { type: Boolean, default: true },
    },
    voice: {
      name: { type: String, default: "default" },
      rate: { type: Number, default: 1.0 },
      pitch: { type: Number, default: 1.0 },
      volume: { type: Number, default: 1.0 },
      accent: { type: String, default: "en-US" },
    },
    modes: {
      current: { type: String, default: "friendly" },
      enabled: { type: [String], default: ["friendly", "supportive", "professional", "playful", "caring", "romantic"] },
    },
    memories: { type: [MemorySchema], default: [] },
    preferences: { type: Object, default: {} },
    settings: {
      autoSpeak: { type: Boolean, default: true },
      autoListen: { type: Boolean, default: false },
    streamReplies: { type: Boolean, default: false },
    safetyLevel: { type: String, default: "medium" },
    temperature: { type: Number, default: 0.7 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanionProfile", CompanionProfileSchema);
