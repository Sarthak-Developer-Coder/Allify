const mongoose = require('mongoose');

const SnapSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mediaUrl: { type: String, required: true },
  mediaType: { type: String, enum: ['image'], required: true },
  caption: { type: String, default: '' },
  viewTimerSec: { type: Number, default: 5 },
  expiresAt: { type: Date, required: true, index: true },
  viewedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
  // New: optional reference to the original snap when this is a reply
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Snap', default: null, index: true },
  // New: allow one replay per snap for the receiver
  replayUsed: { type: Boolean, default: false },
  // New: reporting flag for moderation
  reported: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Snap', SnapSchema);
