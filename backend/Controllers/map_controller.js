const MapLocation = require('../Models/MapLocation');
const User = require('../Models/User');

exports.update = async (req, res) => {
  try {
    const { lat, lng } = req.body || {};
    if (typeof lat !== 'number' || typeof lng !== 'number') return res.status(400).json({ error: 'lat/lng required' });
    await MapLocation.findOneAndUpdate({ user: req.user.id }, { lat, lng, updatedAt: new Date() }, { upsert: true });
    await User.findByIdAndUpdate(req.user.id, { location: { lat, lng }, locationUpdatedAt: new Date() });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'update failed' }); }
};

exports.nearby = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('connections');
    const ids = (me?.connections||[]).map(String);
    const list = await MapLocation.find({ user: { $in: ids } }).populate('user','name profilePic');
    res.json(list);
  } catch { res.status(500).json({ error: 'nearby failed' }); }
};
