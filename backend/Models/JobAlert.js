const mongoose = require('mongoose');

const JobAlertSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  q: String,
  location: String,
  type: String,
  workMode: { type: String, enum: ['On-site','Remote','Hybrid',''], default: '' },
  skills: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model('JobAlert', JobAlertSchema);
