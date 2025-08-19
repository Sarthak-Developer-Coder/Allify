const fs = require('fs');
const imageupload = require('../config/imageupload');
const Story = require('../Models/Story');
const User = require('../Models/User');
const Memory = require('../Models/Memory');

exports.upload = async (req, res) => {
  try {
    if (!req.file || !(req.file.mimetype||'').startsWith('image/')) return res.status(400).json({ error: 'Only images' });
    const buf = req.file.buffer || fs.readFileSync(req.file.path);
    const mediaUrl = await imageupload({ buffer: buf }, false);
    const story = await Story.create({ author: req.user.id, mediaUrl, mediaType: 'image', expiresAt: new Date(Date.now()+24*60*60*1000) });
    res.json(story);
  } catch (e) { console.error(e); res.status(500).json({ error: 'upload failed' }); }
};

exports.feed = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('connections');
    const userIds = [req.user.id, ...((me?.connections||[]).map(String))];
    const list = await Story.find({ author: { $in: userIds }, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('author', 'name profilePic');
    res.json(list);
  } catch { res.status(500).json({ error: 'feed failed' }); }
};

exports.view = async (req, res) => {
  try {
    const s = await Story.findById(req.params.id);
    if (!s) return res.status(404).end();
    const uid = String(req.user.id);
    if (!s.viewers.map(String).includes(uid)) s.viewers.push(uid);
    await s.save();
    res.json({ ok: true });
  } catch { res.status(500).end(); }
};

exports.viewers = async (req, res) => {
  try {
    const s = await Story.findById(req.params.id).populate('viewers', 'name profilePic');
    if (!s) return res.status(404).end();
    res.json(s.viewers || []);
  } catch { res.status(500).end(); }
};

exports.saveToMemories = async (req, res) => {
  try {
    const s = await Story.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    const doc = await Memory.create({ user: req.user.id, mediaUrl: s.mediaUrl, caption: '', source: 'upload', tags: [] });
    res.json(doc);
  } catch { res.status(500).json({ error: 'save failed' }); }
};
