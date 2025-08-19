const Notification = require('../Models/Notification');

exports.create = async (userId, type, data = {}) => {
  try {
    await Notification.create({ user: userId, type, data });
  } catch {}
};

exports.list = async (req, res) => {
  try {
    const list = await Notification.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(50);
    res.json(list);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};
