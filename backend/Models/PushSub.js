const mongoose = require('mongoose');

const PushSubSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  endpoint: String,
  keys: {
    p256dh: String,
    auth: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('PushSub', PushSubSchema);
