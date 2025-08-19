const SnapReaction = require('../Models/SnapReaction');
const Snap = require('../Models/Snap');
const Notifications = require('./notifications_controller');

exports.toggle = async (req, res) => {
  try {
    const { snapId, emoji } = req.body || {};
    if (!snapId || !emoji) return res.status(400).json({ error: 'snapId and emoji required' });
    const existing = await SnapReaction.findOne({ snap: snapId, user: req.user.id });
    if (existing) {
      if (existing.emoji === emoji) { await existing.deleteOne(); return res.json({ removed: true }); }
      existing.emoji = emoji; await existing.save(); return res.json(existing);
    }
    const created = await SnapReaction.create({ snap: snapId, user: req.user.id, emoji });
    try {
      const snap = await Snap.findById(snapId);
      if (snap && String(snap.sender) !== String(req.user.id)) {
        Notifications.create(snap.sender, 'reaction', { snapId, emoji, by: req.user.id });
      }
    } catch {}
    res.json(created);
  } catch { res.status(500).json({ error: 'toggle failed' }); }
};

exports.list = async (req, res) => {
  try {
    const { snapId } = req.params; if (!snapId) return res.status(400).json({ error: 'snapId required' });
    const items = await SnapReaction.find({ snap: snapId }).populate('user', 'name profilePic');
    res.json(items);
  } catch { res.status(500).json({ error: 'list failed' }); }
};

exports.counts = async (req, res) => {
  try {
    const snapIds = Array.isArray(req.body.snapIds) ? req.body.snapIds : [];
    if (!snapIds.length) return res.json({});
    const mongoose = require('mongoose');
    const ids = snapIds.filter(Boolean).map(id => new mongoose.Types.ObjectId(String(id)));
    const agg = await SnapReaction.aggregate([
      { $match: { snap: { $in: ids } } },
      { $group: { _id: { snap: '$snap', emoji: '$emoji' }, c: { $sum: 1 } } },
    ]);
    const out = {};
    agg.forEach(r => {
      const sid = String(r._id.snap);
      if (!out[sid]) out[sid] = {};
      out[sid][r._id.emoji] = r.c;
    });
    res.json(out);
  } catch { res.status(500).json({ error: 'counts failed' }); }
};
