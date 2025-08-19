const mongoose = require('mongoose');

const MemorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mediaUrl: { type: String, required: true },
  caption: { type: String, default: '' },
  source: { type: String, enum: ['snap','upload'], default: 'upload' },
  tags: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('Memory', MemorySchema);
