const mongoose = require('mongoose');

const TrackCommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', index: true },
  text: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TrackComment', TrackCommentSchema);
