const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String, default: '' },
  workMode: { type: String, enum: ['On-site','Remote','Hybrid',''], default: '' },
  employmentType: { type: String, enum: ['Full-time','Part-time','Contract','Internship','Temporary','Other'], default: 'Full-time' },
  description: { type: String, default: '' },
  skills: [{ type: String }],
  salaryMin: Number,
  salaryMax: Number,
  currency: { type: String, default: 'USD' },
  companyRef: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  applicants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
