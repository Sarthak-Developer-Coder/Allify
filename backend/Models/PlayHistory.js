const mongoose = require('mongoose');

const PlayHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  track: { type: mongoose.Schema.Types.ObjectId, ref: 'Track', index: true },
  at: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('PlayHistory', PlayHistorySchema);
