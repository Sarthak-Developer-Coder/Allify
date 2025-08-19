const mongoose = require('mongoose');

const TrackLikeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', index: true },
}, { timestamps: true });
TrackLikeSchema.index({ user: 1, track: 1 }, { unique: true });
module.exports = mongoose.model('TrackLike', TrackLikeSchema);
