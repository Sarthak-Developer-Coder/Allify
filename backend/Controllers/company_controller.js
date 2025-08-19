const Company = require('../Models/Company');

exports.createCompany = async (req, res) => {
  try {
    const c = await Company.create({ ...req.body, admins: [req.user.id] });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.getCompany = async (req, res) => {
  try {
    const c = await Company.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.followCompany = async (req, res) => {
  try {
    const c = await Company.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    if (!c.followers.find(u => u.toString() === req.user.id)) c.followers.push(req.user.id);
    await c.save();
    res.json({ followers: c.followers.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.unfollowCompany = async (req, res) => {
  try {
    const c = await Company.findById(req.params.id);
    if (!c) return res.status(404).json({ error: 'Not found' });
    c.followers = (c.followers || []).filter(u => u.toString() !== req.user.id);
    await c.save();
    res.json({ followers: c.followers.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.listCompanies = async (_req, res) => {
  try {
    const list = await Company.find({}).sort({ createdAt: -1 }).limit(200);
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};
