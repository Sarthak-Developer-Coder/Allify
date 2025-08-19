const Streak = require('../Models/Streak');
const Snap = require('../Models/Snap');

function utcDayStr(d = new Date()) { return d.toISOString().slice(0,10); }
function endOfUtcDay(d = new Date()) { const e = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23,59,59,999)); return e; }

exports.mine = async (req, res) => {
  try {
    const u = req.user?.id || req.user?._id || req.user;
    const list = await Streak.find({ $or: [{ a: u }, { b: u }], active: true }).sort({ count: -1 }).limit(100).lean();
    const day = utcDayStr(); const deadline = endOfUtcDay();
    const mapped = list.map(s => ({
      ...s,
      me: String(s.a)===String(u) ? 'a' : 'b',
      friend: String(s.a)===String(u) ? s.b : s.a,
      timeLeftMs: Math.max(0, deadline.getTime() - Date.now()),
      hourglass: (deadline.getTime() - Date.now()) < 6*60*60*1000,
    }));
    res.json(mapped);
  } catch (e) { console.error(e); res.status(500).json({ error: 'failed' }); }
};

exports.leaderboard = async (_req, res) => {
  try { const top = await Streak.find({ active: true }).sort({ count: -1, updatedAt: -1 }).limit(5).lean(); res.json(top); }
  catch { res.status(500).json({ error: 'failed' }); }
};

exports.hide = async (req, res) => {
  try {
    const id = req.params.id; const u = req.user?.id || req.user?._id || req.user;
    const s = await Streak.findById(id); if (!s) return res.status(404).end();
    const has = (s.hiddenBy||[]).some(x => String(x)===String(u));
    if (has) s.hiddenBy = s.hiddenBy.filter(x => String(x)!==String(u)); else s.hiddenBy = [ ...(s.hiddenBy||[]), u ];
    await s.save(); res.json(s);
  } catch { res.status(500).end(); }
};

exports.user = async (req, res) => {
  try {
    const uid = req.params.userId; const u = req.user?.id || req.user?._id || req.user;
    const s = await Streak.findOne({ $or: [ { a: u, b: uid }, { a: uid, b: u } ] });
    if (!s) return res.json(null);
    const deadline = endOfUtcDay();
    res.json({ ...s.toObject(), timeLeftMs: Math.max(0, deadline.getTime() - Date.now()) });
  } catch { res.status(500).end(); }
};

// Best friends algorithm (simple): rank by total snaps exchanged last 30 days
exports.bestFriends = async (req, res) => {
  try {
    const u = req.user?.id || req.user?._id || req.user;
    const since = new Date(Date.now() - 30*24*60*60*1000);
    const agg = await Snap.aggregate([
      { $match: { createdAt: { $gte: since }, $or: [ { sender: Snap.castObjectId?.(u) || u }, { receiver: Snap.castObjectId?.(u) || u } ] } },
      { $project: { other: { $cond: [ { $eq: ['$sender', Snap.castObjectId?.(u) || u] }, '$receiver', '$sender' ] } } },
      { $group: { _id: '$other', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);
    res.json(agg);
  } catch { res.status(500).json({ error: 'failed' }); }
};

// Snap score: total snaps sent + received
exports.snapScore = async (req, res) => {
  try {
    const u = req.user?.id || req.user?._id || req.user;
    const [sent, recv] = await Promise.all([
      Snap.countDocuments({ sender: u }),
      Snap.countDocuments({ receiver: u }),
    ]);
    res.json({ score: sent + recv, sent, received: recv });
  } catch { res.status(500).json({ error: 'failed' }); }
};
