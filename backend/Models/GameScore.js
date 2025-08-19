const mongoose = require('mongoose');

const GameScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  game: { type: String, required: true }, // e.g., '2048'
  score: { type: Number, required: true },
}, { timestamps: true });

GameScoreSchema.index({ game: 1, score: -1 });
GameScoreSchema.index({ user: 1, game: 1, score: -1 });

module.exports = mongoose.model('GameScore', GameScoreSchema);
