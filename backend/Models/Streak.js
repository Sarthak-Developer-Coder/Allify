const mongoose = require('mongoose');

const StreakSchema = new mongoose.Schema({
  a: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  b: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  count: { type: Number, default: 0 },
  startedAt: { type: Date, default: null },
  lastDay: { type: String, default: '' }, // YYYY-MM-DD in UTC of last increment
  active: { type: Boolean, default: false, index: true },
  hiddenBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  history: [{ type: String }], // ISO dates for audit
}, { timestamps: true });

StreakSchema.index({ a: 1, b: 1 }, { unique: true });

module.exports = mongoose.model('Streak', StreakSchema);
