const Job = require('../Models/Job');

exports.createJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, postedBy: req.user.id });
    res.json(job);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.listJobs = async (req, res) => {
  try {
    const { q, location, type, workMode, minSalary, maxSalary, skills, sort = 'new', page = 1, limit = 20 } = req.query;
    const filter = {};
    if (q) filter.$or = [{ title: new RegExp(q, 'i') }, { company: new RegExp(q, 'i') }];
    if (location) filter.location = new RegExp(location, 'i');
    if (type) filter.employmentType = type;
    if (workMode) filter.workMode = workMode;
    if (minSalary || maxSalary) {
      filter.$and = [
        ...(minSalary ? [{ $or: [{ salaryMin: { $gte: Number(minSalary) } }, { salaryMax: { $gte: Number(minSalary) } }] }] : []),
        ...(maxSalary ? [{ $or: [{ salaryMax: { $lte: Number(maxSalary) } }, { salaryMin: { $lte: Number(maxSalary) } }] }] : []),
      ];
    }
    if (skills) {
      const arr = Array.isArray(skills) ? skills : String(skills).split(',').map(s => s.trim()).filter(Boolean);
      if (arr.length) filter.skills = { $all: arr };
    }
    const skip = (Number(page) - 1) * Number(limit);
    const sortBy = sort === 'salary' ? { salaryMax: -1 } : { createdAt: -1 };
    const [items, total] = await Promise.all([
      Job.find(filter).sort(sortBy).skip(skip).limit(Number(limit)),
      Job.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Job Alerts
const JobAlert = require('../Models/JobAlert');

exports.createAlert = async (req, res) => {
  try {
    const { q, location, type, workMode, skills } = req.body;
    const alert = await JobAlert.create({ user: req.user.id, q: q || '', location: location || '', type: type || '', workMode: workMode || '', skills: (skills || []).map(s => String(s)) });
    res.json(alert);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.listAlerts = async (req, res) => {
  try {
    const list = await JobAlert.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.deleteAlert = async (req, res) => {
  try {
    await JobAlert.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.getJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    res.json(job);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.applyToJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    if (!job.applicants.find(u => u.toString() === req.user.id)) job.applicants.push(req.user.id);
    await job.save();
    res.json({ applicants: job.applicants.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};
