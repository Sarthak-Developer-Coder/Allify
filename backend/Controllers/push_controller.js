const PushSub = require('../Models/PushSub');

exports.save = async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};
    if (!endpoint || !keys) return res.status(400).json({ error: 'invalid' });
    await PushSub.findOneAndUpdate({ user: req.user.id }, { endpoint, keys }, { upsert: true });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'save failed' }); }
};
