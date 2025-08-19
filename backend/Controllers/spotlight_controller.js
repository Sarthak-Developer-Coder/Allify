const imageupload = require('../config/imageupload');
const Spotlight = require('../Models/Spotlight');

exports.create = async (req, res) => {
  try {
    if (!req.file || !(req.file.mimetype||'').startsWith('image/')) return res.status(400).json({ error: 'image required' });
    const mediaUrl = await imageupload({ buffer: req.file.buffer }, false);
    const doc = await Spotlight.create({ author: req.user.id, mediaUrl, mediaType:'image', caption: req.body.caption||'', tags: (req.body.tags||'').split(',').map(s=>s.trim()).filter(Boolean) });
    res.json(doc);
  } catch { res.status(500).json({ error: 'create failed' }); }
};

exports.feed = async (req, res) => {
  try {
    const q = (req.query.q||'').trim();
    const filter = q? { isPublic:true, $or:[ { caption:{ $regex:q, $options:'i' } }, { tags:{ $regex:q, $options:'i' } } ] } : { isPublic:true };
    const list = await Spotlight.find(filter).sort({ createdAt: -1 }).limit(100).populate('author','name profilePic');
    res.json(list);
  } catch { res.status(500).json({ error: 'feed failed' }); }
};

exports.toggleLike = async (req, res) => {
  try {
    const it = await Spotlight.findById(req.params.id);
    if (!it) return res.status(404).end();
    const uid = String(req.user.id);
    const idx = it.likes.map(String).indexOf(uid);
    if (idx>=0) it.likes.splice(idx,1); else it.likes.push(uid);
    await it.save();
    res.json({ likes: it.likes.length });
  } catch { res.status(500).end(); }
};
