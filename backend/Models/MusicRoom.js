const mongoose = require('mongoose');

const MusicRoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, index: true },
  hostUserId: { type: String, index: true },
  pin: { type: String, default: '' }, // plaintext for demo; consider hashing in production
  moderators: [{ type: String, index: true }],
  queue: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Track' }],
  idx: { type: Number, default: -1 },
  paused: { type: Boolean, default: true },
  lastSeek: { type: Number, default: 0 },
  ts: { type: Number, default: 0 },
  config: {
    allowAllReorder: { type: Boolean, default: true },
    allowAllControl: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('MusicRoom', MusicRoomSchema);
