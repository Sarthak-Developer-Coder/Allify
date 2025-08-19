const PortfolioProfile = require("../Models/PortfolioProfile");
const QuestionLog = require("../Models/QuestionLog");
const SheetTracker = require("../Models/SheetTracker");
const EventReminder = require("../Models/EventReminder");
const User = require("../Models/User");

// Helper to upsert by user
const getOrCreateProfile = async (userId) => {
  let p = await PortfolioProfile.findOne({ user: userId });
  if (!p) p = await PortfolioProfile.create({ user: userId });
  return p;
};

// Profile
exports.getProfile = async (req, res) => {
  try {
    const p = await getOrCreateProfile(req.user.id);
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: "Failed to get profile" });
  }
};
exports.updateProfile = async (req, res) => {
  try {
    const body = req.body || {};
    // normalize slug if provided
    if (body.slug) body.slug = String(body.slug).trim().toLowerCase();
    const p = await PortfolioProfile.findOneAndUpdate(
      { user: req.user.id },
      { $set: body },
      { new: true, upsert: true }
    );
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// Public profile by slug or user id (no auth)
exports.getPublicProfile = async (req, res) => {
  try {
    const { slugOrId } = req.params;
    const filter = slugOrId.match(/^[a-f\d]{24}$/i) ? { user: slugOrId } : { slug: slugOrId };
    const p = await PortfolioProfile.findOne(filter).lean();
    if (!p) return res.status(404).json({ error: "Not found" });
    if (p.isPublic === false) return res.status(403).json({ error: "Profile is private" });
    const user = await User.findById(p.user).select("name profilePic").lean();
    const totals = await QuestionLog.countDocuments({ user: p.user });
    const sheets = await SheetTracker.countDocuments({ user: p.user });
    const upcoming = await EventReminder.countDocuments({ user: p.user, startAt: { $gte: new Date() } });
    // Ensure pinned projects are first
    const profile = { ...p };
    if (Array.isArray(profile.projects)) {
      profile.projects = [...profile.projects].sort((a,b)=> (b.pinned===true)-(a.pinned===true));
    }
    res.json({ profile, user, stats: { questions: totals, sheets, upcoming } });
  } catch (e) { res.status(500).json({ error: "Failed" }); }
};

// Leaderboard (by questions solved)
exports.leaderboard = async (req, res) => {
  try {
    const agg = await QuestionLog.aggregate([
      { $group: { _id: "$user", solved: { $sum: 1 } } },
      { $sort: { solved: -1 } },
      { $limit: 50 },
    ]);
    const users = await User.find({ _id: { $in: agg.map(a => a._id) } }).select("name profilePic");
    const map = new Map(users.map(u => [String(u._id), u]));
    res.json(agg.map(a => ({ user: map.get(String(a._id)), solved: a.solved })));
  } catch (e) { res.status(500).json({ error: "Failed leaderboard" }); }
};

// Stats: daily solved counts (last 180 days)
exports.stats = async (req, res) => {
  try {
    const since = new Date(Date.now() - 180 * 24 * 3600 * 1000);
    const agg = await QuestionLog.aggregate([
      { $match: { user: require('mongoose').Types.ObjectId(req.user.id), solvedAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { date: "$solvedAt", format: "%Y-%m-%d" } }, c: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json(agg);
  } catch (e) { res.status(500).json({ error: "Failed stats" }); }
};

// Analytics: breakdown by platform, difficulty, and top tags
exports.analytics = async (req, res) => {
  try {
    const userId = require('mongoose').Types.ObjectId(req.user.id);
    const byPlatform = await QuestionLog.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$platform", c: { $sum: 1 } } },
      { $project: { _id: 0, platform: "$_id", count: "$c" } },
      { $sort: { count: -1 } },
    ]);
    const byDifficulty = await QuestionLog.aggregate([
      { $match: { user: userId } },
      { $group: { _id: "$difficulty", c: { $sum: 1 } } },
      { $project: { _id: 0, difficulty: "$_id", count: "$c" } },
      { $sort: { count: -1 } },
    ]);
    const byTag = await QuestionLog.aggregate([
      { $match: { user: userId } },
      { $unwind: { path: "$tags", preserveNullAndEmptyArrays: false } },
      { $group: { _id: "$tags", c: { $sum: 1 } } },
      { $project: { _id: 0, tag: "$_id", count: "$c" } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]);
    res.json({ byPlatform, byDifficulty, byTag });
  } catch (e) {
    res.status(500).json({ error: "Failed analytics" });
  }
};
// Projects CRUD
exports.addProject = async (req, res) => {
  try {
    const { title, description = "", url = "", stars = 0, tags = [] } = req.body;
    if (!title) return res.status(400).json({ error: "title required" });
    const p = await getOrCreateProfile(req.user.id);
    p.projects.push({ title, description, url, stars, tags });
    await p.save();
    res.status(201).json(p.projects[p.projects.length - 1]);
  } catch (e) { res.status(400).json({ error: "Failed to add project" }); }
};
exports.updateProject = async (req, res) => {
  try {
    const p = await getOrCreateProfile(req.user.id);
    const proj = p.projects.id(req.params.id);
    if (!proj) return res.status(404).json({ error: "Not found" });
    Object.assign(proj, req.body);
    await p.save();
    res.json(proj);
  } catch (e) { res.status(400).json({ error: "Failed to update project" }); }
};
exports.deleteProject = async (req, res) => {
  try {
    const p = await getOrCreateProfile(req.user.id);
    const proj = p.projects.id(req.params.id);
    if (!proj) return res.status(404).json({ error: "Not found" });
    proj.remove();
    await p.save();
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: "Failed to delete project" }); }
};

// Questions
exports.listQuestions = async (req, res) => {
  try {
    const { q, tag, platform, status, page = 1, limit = 50 } = req.query;
    const filter = { user: req.user.id };
    if (platform) filter.platform = platform;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;
    if (q) filter.title = { $regex: q, $options: "i" };
    const items = await QuestionLog.find(filter)
      .sort({ solvedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await QuestionLog.countDocuments(filter);
    res.json({ items, total });
  } catch (e) {
    res.status(500).json({ error: "Failed to list questions" });
  }
};
exports.createQuestion = async (req, res) => {
  try {
    const doc = await QuestionLog.create({ user: req.user.id, ...req.body });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to create question" });
  }
};
exports.updateQuestion = async (req, res) => {
  try {
    const doc = await QuestionLog.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to update question" });
  }
};
exports.deleteQuestion = async (req, res) => {
  try {
    await QuestionLog.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Failed to delete question" });
  }
};

// Sheets
exports.listSheets = async (req, res) => {
  try {
    const items = await SheetTracker.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: "Failed to list sheets" });
  }
};
exports.createSheet = async (req, res) => {
  try {
    const doc = await SheetTracker.create({ user: req.user.id, ...req.body });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to create sheet" });
  }
};
exports.updateSheet = async (req, res) => {
  try {
    const doc = await SheetTracker.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to update sheet" });
  }
};
exports.deleteSheet = async (req, res) => {
  try {
    await SheetTracker.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Failed to delete sheet" });
  }
};

// Events
exports.listEvents = async (req, res) => {
  try {
    const items = await EventReminder.find({ user: req.user.id }).sort({ startAt: 1 });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: "Failed to list events" });
  }
};
exports.createEvent = async (req, res) => {
  try {
    const doc = await EventReminder.create({ user: req.user.id, ...req.body });
    res.status(201).json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to create event" });
  }
};
exports.updateEvent = async (req, res) => {
  try {
    const doc = await EventReminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: req.body },
      { new: true }
    );
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: "Failed to update event" });
  }
};
exports.deleteEvent = async (req, res) => {
  try {
    await EventReminder.deleteOne({ _id: req.params.id, user: req.user.id });
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: "Failed to delete event" });
  }
};
