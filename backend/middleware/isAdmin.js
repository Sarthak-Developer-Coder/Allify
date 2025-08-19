const User = require('../Models/User');

module.exports = async function isAdmin(req, res, next) {
  try {
    const id = req.user?.id || req.user?._id || req.user;
    if (!id) return res.status(401).json({ error: 'unauthorized' });
    const u = await User.findById(id).select('isAdmin');
    if (!u || !u.isAdmin) return res.status(403).json({ error: 'forbidden' });
    next();
  } catch (e) {
    return res.status(500).json({ error: 'guard failed' });
  }
};
