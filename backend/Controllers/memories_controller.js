const imageupload = require('../config/imageupload');
const Memory = require('../Models/Memory');

exports.list = async (req, res) => {
  try {
    const items = await Memory.find({ user: req.user.id }).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch { res.status(500).json({ error: 'Internal Server Error' }); }
};

exports.addFromUpload = async (req, res) => {
  try {
    if (!req.file || !(req.file.mimetype||'').startsWith('image/')) return res.status(400).json({ error: 'image required' });
    const buf = req.file.buffer;
    const mediaUrl = await imageupload({ buffer: buf }, false);
    let tags = [];
    const caption = req.body.caption||'';
    if (process.env.GENERATIVE_API_KEY && caption) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Given this caption, propose 3-6 short tags, lowercase, comma-separated. Caption: ${caption}`;
        const result = await model.generateContent(prompt);
        const text = (result?.response?.text?.() || '').toLowerCase();
        tags = text.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,8);
      } catch {}
    }
    const doc = await Memory.create({ user: req.user.id, mediaUrl, caption, source:'upload', tags });
    res.json(doc);
  } catch { res.status(500).json({ error: 'upload failed' }); }
};

exports.addFromSnap = async (req, res) => {
  try {
    const { mediaUrl, caption } = req.body || {};
    if (!mediaUrl) return res.status(400).json({ error: 'mediaUrl required' });
    let tags = [];
    if (process.env.GENERATIVE_API_KEY && caption) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = `Given this caption, propose 3-6 short tags, lowercase, comma-separated. Caption: ${caption}`;
        const result = await model.generateContent(prompt);
        const text = (result?.response?.text?.() || '').toLowerCase();
        tags = text.split(/[,\n]+/).map(s=>s.trim()).filter(Boolean).slice(0,8);
      } catch {}
    }
    const doc = await Memory.create({ user: req.user.id, mediaUrl, caption: caption||'', source:'snap', tags });
    res.json(doc);
  } catch { res.status(500).json({ error: 'save failed' }); }
};

exports.search = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);
    const items = await Memory.find({ user: req.user.id, $or: [ { caption: { $regex: q, $options: 'i' } }, { tags: { $regex: q, $options: 'i' } } ] }).sort({ createdAt: -1 }).limit(100);
    res.json(items);
  } catch { res.status(500).json({ error: 'search failed' }); }
};

exports.albums = async (req, res) => {
  try {
    const list = await Memory.find({ user: req.user.id }).sort({ createdAt: -1 }).lean();
    const groups = {};
    list.forEach(m => {
      const d = new Date(m.createdAt);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`;
      if (!groups[key]) groups[key] = { key, count: 0, cover: m.mediaUrl, items: [] };
      groups[key].count++; groups[key].items.push({ _id: m._id, mediaUrl: m.mediaUrl, caption: m.caption, tags: m.tags });
    });
    const out = Object.values(groups).sort((a,b)=>a.key<b.key?1:-1);
    res.json(out);
  } catch { res.status(500).json({ error: 'albums failed' }); }
};
