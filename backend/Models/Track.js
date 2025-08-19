const mongoose = require('mongoose');

const TrackSchema = new mongoose.Schema({
  title: { type: String, required: true, index: true },
  artist: { type: String, default: 'Unknown', index: true },
  album: { type: String, default: '', index: true },
  genres: [{ type: String, index: true }],
  tags: [{ type: String, index: true }],
  year: { type: Number, default: null, index: true },
  bpm: { type: Number, default: null, index: true },
  duration: { type: Number, default: 0 },
  filePath: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number, default: 0 },
  coverUrl: { type: String, default: '' },
  lyrics: { type: String, default: '' },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  likes: { type: Number, default: 0, index: true },
  plays: { type: Number, default: 0, index: true },
  hlsReady: { type: Boolean, default: false, index: true },
  hlsDir: { type: String, default: '' },
  waveformReady: { type: Boolean, default: false },
  waveformPath: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Track', TrackSchema);
