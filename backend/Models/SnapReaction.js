const mongoose = require('mongoose');

const SnapReactionSchema = new mongoose.Schema({
  snap: { type: mongoose.Schema.Types.ObjectId, ref: 'Snap', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  emoji: { type: String, required: true },
}, { timestamps: true });

SnapReactionSchema.index({ snap: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('SnapReaction', SnapReactionSchema);
