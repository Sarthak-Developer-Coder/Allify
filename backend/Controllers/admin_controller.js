const Snap = require('../Models/Snap');
const Story = require('../Models/Story');
const Spotlight = require('../Models/Spotlight');
const User = require('../Models/User');

exports.metrics = async (req, res) => {
  try {
    const [users, snaps, stories, spotlights] = await Promise.all([
      User.countDocuments(),
      Snap.countDocuments({ createdAt: { $gte: new Date(Date.now()-7*24*60*60*1000) } }),
      Story.countDocuments({ createdAt: { $gte: new Date(Date.now()-7*24*60*60*1000) } }),
      Spotlight.countDocuments({ createdAt: { $gte: new Date(Date.now()-7*24*60*60*1000) } }),
    ]);
    res.json({ users, snaps7d: snaps, stories7d: stories, spotlights7d: spotlights });
  } catch { res.status(500).json({ error: 'metrics failed' }); }
};
