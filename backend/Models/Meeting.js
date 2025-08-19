const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, index: true },
  title: { type: String, default: '' },
  host: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lobby: { type: Boolean, default: false },
  locked: { type: Boolean, default: false },
  passcode: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Meeting', MeetingSchema);
