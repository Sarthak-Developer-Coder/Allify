const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const imageupload = require('../config/imageupload');
const mediaUpload = require('../config/mediaUpload');
const Snap = require('../Models/Snap');
const Streak = require('../Models/Streak');
const { encrypt, decrypt } = require('../utils/crypto');
const { sendToUser } = require('../utils/push');

function utcDayStr(d = new Date()){
  return d.toISOString().slice(0,10);
}

async function ensureStreakIncrement(sender, receiver){
  // idempotent per day: only increment after both exchanged a snap in same UTC day
  const day = utcDayStr();
  const pair = [String(sender), String(receiver)].sort();
  let streak = await Streak.findOne({ a: pair[0], b: pair[1] });
  if (!streak) streak = await Streak.create({ a: pair[0], b: pair[1], count: 0, active: false, lastDay: '' });
  if (streak.lastDay === day) return streak; // already incremented today (mutual satisfied earlier)
  // Check if both directions had at least one snap today
  const start = new Date(day + 'T00:00:00Z');
  const end = new Date(day + 'T23:59:59.999Z');
  const fromA = await Snap.exists({ sender: pair[0], receiver: pair[1], createdAt: { $gte: start, $lte: end } });
  const fromB = await Snap.exists({ sender: pair[1], receiver: pair[0], createdAt: { $gte: start, $lte: end } });
  if (fromA && fromB) {
    // streak rule: start after 2 consecutive mutual days
    const prevDay = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()-1));
    const prevStr = utcDayStr(prevDay);
    const prevFromA = await Snap.exists({ sender: pair[0], receiver: pair[1], createdAt: { $gte: new Date(prevStr+'T00:00:00Z'), $lte: new Date(prevStr+'T23:59:59.999Z') } });
    const prevFromB = await Snap.exists({ sender: pair[1], receiver: pair[0], createdAt: { $gte: new Date(prevStr+'T00:00:00Z'), $lte: new Date(prevStr+'T23:59:59.999Z') } });

    const next = (streak.active ? streak.count + 1 : (prevFromA && prevFromB ? Math.max(1, streak.count + 1) : 0));
    streak.count = next;
    if (!streak.active && next >= 2) { streak.active = true; streak.startedAt = new Date(); }
    streak.lastDay = day; streak.history.push(day);
    await streak.save();
  }
  return streak;
}

exports.send = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const to = (req.body.to || '').trim();
    const timer = Math.max(1, Math.min(10, parseInt(req.body.timer)||5));
    // Validate receiver
    const { Types } = require('mongoose');
    if (!to || !Types.ObjectId.isValid(to)) {
      return res.status(400).json({ error: 'receiver is required' });
    }
    const isImage = (req.file?.mimetype||'').startsWith('image/');
    if (!req.file || !isImage) return res.status(400).json({ error: 'Only image snaps are allowed' });

    // If file is on disk (multer disk), send to cloudinary for URL if image; else use local path for video demo
  let mediaUrl = '';
  const buf = req.file.buffer || fs.readFileSync(req.file.path);
  mediaUrl = await imageupload({ buffer: buf }, false);

    // Optional AI auto-caption
    let captionText = (req.body.caption || '').trim();
    const autoCap = String(req.body.autoCaption || '0') === '1';
    if (autoCap && !captionText && process.env.GENERATIVE_API_KEY) {
      try {
        const { GoogleGenerativeAI } = require('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const prompt = 'Write a short, fun, original photo caption in 3-7 words. No hashtags, no quotes.';
        const result = await model.generateContent(prompt);
        const text = (result?.response?.text?.() || '').trim();
        if (text) captionText = text.slice(0, 80);
      } catch (e) { /* ignore AI errors */ }
    }
    const snap = await Snap.create({
      sender: userId,
      receiver: to,
      mediaUrl,
  mediaType: 'image',
      caption: encrypt(captionText),
      viewTimerSec: timer,
      expiresAt: new Date(Date.now() + 24*60*60*1000),
    });

    // Update streak (idempotent per day)
  ensureStreakIncrement(userId, to).catch(()=>{});
    // Push notify receiver (best-effort)
    sendToUser(to, { type:'snap', title:'New Snap', body:'You received a new snap', url:'/snaps' }).catch(()=>{});

    res.json(snap);
  } catch (e) { console.error(e); res.status(500).json({ error: 'send failed' }); }
};

// Reply to a snap with a new image (images only)
exports.reply = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const toSnap = await Snap.findById(req.params.id);
    if (!toSnap) return res.status(404).json({ error: 'not found' });
    // Only receiver of the original snap can reply, and reply goes to original sender
    if (String(toSnap.receiver) !== String(userId)) return res.status(403).json({ error: 'forbidden' });
    const isImage = (req.file?.mimetype||'').startsWith('image/');
    if (!req.file || !isImage) return res.status(400).json({ error: 'Only image snaps are allowed' });
    const timer = Math.max(1, Math.min(10, parseInt(req.body.timer)||5));
    const buf = req.file.buffer || fs.readFileSync(req.file.path);
    const mediaUrl = await imageupload({ buffer: buf }, false);
    const captionText = (req.body.caption || '').trim();
    const snap = await Snap.create({
      sender: userId,
      receiver: toSnap.sender,
      mediaUrl,
      mediaType: 'image',
      caption: encrypt(captionText),
      viewTimerSec: timer,
      expiresAt: new Date(Date.now() + 24*60*60*1000),
      replyTo: toSnap._id,
    });
    ensureStreakIncrement(userId, toSnap.sender).catch(()=>{});
    sendToUser(toSnap.sender, { type:'snap-reply', title:'Replied to your snap', body:'Open snaps to view', url:'/snaps' }).catch(()=>{});
    res.json(snap);
  } catch (e) { console.error(e); res.status(500).json({ error: 'reply failed' }); }
};

// Mark all current inbox snaps as viewed (and schedule auto-delete)
exports.viewAll = async (req, res) => {
  try {
    const u = String(req.user?.id || req.user?._id || req.user);
    const list = await Snap.find({ receiver: u, deletedAt: null, viewedAt: null, expiresAt: { $gt: new Date() } }).limit(200);
    const now = new Date();
    await Promise.all(list.map(async (s) => { s.viewedAt = now; await s.save(); setTimeout(async ()=>{ try{ s.deletedAt = new Date(); await s.save(); }catch{} }, s.viewTimerSec * 1000); }));
    res.json({ count: list.length });
  } catch { res.status(500).json({ error: 'view all failed' }); }
};

// Allow a one-time replay of a snap for the receiver
exports.replay = async (req, res) => {
  try {
    const u = String(req.user?.id || req.user?._id || req.user);
    const s = await Snap.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    if (String(s.receiver) !== u) return res.status(403).json({ error: 'forbidden' });
    if (!s.viewedAt) return res.status(400).json({ error: 'not viewed yet' });
    if (s.replayUsed) return res.status(400).json({ error: 'replay already used' });
    s.replayUsed = true; await s.save();
    // return the media URL again; client can show a timer overlay
    res.json({ mediaUrl: s.mediaUrl, timer: s.viewTimerSec, caption: decrypt(s.caption) });
  } catch { res.status(500).json({ error: 'replay failed' }); }
};

// Report a snap (basic moderation flag)
exports.report = async (req, res) => {
  try {
    const u = String(req.user?.id || req.user?._id || req.user);
    const s = await Snap.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    // either party can report
    if (![String(s.sender), String(s.receiver)].includes(u)) return res.status(403).json({ error: 'forbidden' });
    s.reported = true; await s.save();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'report failed' }); }
};

exports.view = async (req, res) => {
  try {
    const id = req.params.id; const u = req.user?.id || req.user?._id || req.user;
    const s = await Snap.findById(id);
    if (!s) return res.status(404).end();
    if (String(s.receiver) !== String(u)) return res.status(403).end();
    s.viewedAt = new Date(); await s.save();
    // delete shortly after view
    setTimeout(async ()=>{ try{ s.deletedAt = new Date(); await s.save(); }catch{} }, s.viewTimerSec * 1000);
    res.json({ ok: true });
  } catch { res.status(500).end(); }
};

exports.inbox = async (req, res) => {
  try {
    const u = req.user?.id || req.user?._id || req.user;
  const list = await Snap.find({ receiver: u, deletedAt: null, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name profilePic');
  const out = list.map(s => ({ ...s.toObject(), caption: decrypt(s.caption) }));
  res.json(out);
  } catch { res.status(500).end(); }
};

// List snaps I sent (to see read status)
exports.sentList = async (req, res) => {
  try {
    const u = req.user?.id || req.user?._id || req.user;
  const list = await Snap.find({ sender: u, expiresAt: { $gt: new Date() } })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('receiver', 'name profilePic');
  const out = list.map(s => ({ ...s.toObject(), caption: decrypt(s.caption) }));
  res.json(out);
  } catch { res.status(500).end(); }
};

// Allow sender to delete their snap before it's viewed
exports.deleteSnap = async (req, res) => {
  try {
    const u = String(req.user?.id || req.user?._id || req.user);
    const s = await Snap.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'not found' });
    if (String(s.sender) !== u) return res.status(403).json({ error: 'forbidden' });
    if (s.viewedAt) return res.status(400).json({ error: 'already viewed' });
    s.deletedAt = new Date();
    await s.save();
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'delete failed' }); }
};

exports.bulkSend = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id || req.user;
    const toList = Array.isArray(req.body.toList) ? req.body.toList : [];
    const timer = Math.max(1, Math.min(10, parseInt(req.body.timer)||5));
    if (!req.file || !(req.file.mimetype||'').startsWith('image/')) return res.status(400).json({ error: 'Only image snaps are allowed' });
    if (!toList.length) return res.status(400).json({ error: 'Empty toList' });
    const { Types } = require('mongoose');
    const validIds = toList.filter(id => Types.ObjectId.isValid(String(id)) && String(id) !== String(userId));
    if (!validIds.length) return res.status(400).json({ error: 'No valid receivers' });
    const buf = req.file.buffer || fs.readFileSync(req.file.path);
    const mediaUrl = await imageupload({ buffer: buf }, false);
    const docs = await Snap.insertMany(validIds.map(to => ({
      sender: userId,
      receiver: to,
      mediaUrl,
      mediaType: 'image',
      caption: encrypt(req.body.caption || ''),
      viewTimerSec: timer,
      expiresAt: new Date(Date.now() + 24*60*60*1000),
    })));
    // Fire-and-forget streak updates
    validIds.forEach(to => ensureStreakIncrement(userId, to).catch(()=>{}));
    res.json({ count: docs.length });
  } catch (e) { console.error(e); res.status(500).json({ error: 'bulk send failed' }); }
};
