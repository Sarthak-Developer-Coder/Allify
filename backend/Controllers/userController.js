const {
  AWS_BUCKET_NAME,
  AWS_SECRET,
  AWS_ACCESS_KEY,
} = require("../secrets.js");
const { S3Client } = require("@aws-sdk/client-s3");
const { createPresignedPost } = require("@aws-sdk/s3-presigned-post");
const User = require("../Models/User.js");
const Post = require("../Models/Post.js");
const Notification = require('../Models/Notification');
const Job = require('../Models/Job');
const Notifier = require('./notifications_controller');
const { getIO } = require('../socket');

// getPresignedUrl removed. Use Cloudinary upload endpoints instead.

const getOnlineStatus = async (req, res) => {
  const userId = req.params.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.status(200).json({ isOnline: user.isOnline });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

// Follow a user
const followUser = async (req, res) => {
  try {
    const me = req.user.id;
    const targetId = req.params.id;
    if (me === targetId) return res.status(400).json({ error: "Cannot follow yourself" });
    const meDoc = await User.findById(me);
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });
    const already = meDoc.following?.some((u) => u.toString() === targetId);
    if (already) return res.json({ message: "Already following" });
    meDoc.following = [...(meDoc.following || []), target._id];
    target.followers = [...(target.followers || []), meDoc._id];
    await meDoc.save();
    await target.save();
  // Notify target user
    try {
      await Notifier.create(target._id, 'follow', { from: meDoc._id, text: `${meDoc.name || 'Someone'} started following you` });
      const io = getIO && getIO();
      if (io) io.to(target._id.toString()).emit('notification', { type: 'follow', data: { from: meDoc._id, text: `${meDoc.name || 'Someone'} started following you` } });
    } catch {}
    res.json({ following: meDoc.following.length, followers: target.followers.length });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

// Unfollow a user
const unfollowUser = async (req, res) => {
  try {
    const me = req.user.id;
    const targetId = req.params.id;
    const meDoc = await User.findById(me);
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ error: "User not found" });
    meDoc.following = (meDoc.following || []).filter((u) => u.toString() !== targetId);
    target.followers = (target.followers || []).filter((u) => u.toString() !== me);
    await meDoc.save();
    await target.save();
    res.json({ following: meDoc.following.length, followers: target.followers.length });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

// Get profile with followers/following counts
const getProfile = async (req, res) => {
  try {
    const u = await User.findById(req.params.id).select("-password");
    if (!u) return res.status(404).json({ error: "User not found" });
    res.json({
      _id: u._id,
      name: u.name,
      about: u.about,
      email: u.email,
      profilePic: u.profilePic,
      followersCount: (u.followers || []).length,
      followingCount: (u.following || []).length,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = { getOnlineStatus, followUser, unfollowUser, getProfile };
// Bookmark post
module.exports.bookmarkPost = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });
    if (!me.bookmarks?.find((p) => p.toString() === post._id.toString())) {
      me.bookmarks = [...(me.bookmarks || []), post._id];
      await me.save();
    }
    res.json({ bookmarks: me.bookmarks.length });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.unbookmarkPost = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.bookmarks = (me.bookmarks || []).filter((p) => p.toString() !== req.params.id);
    await me.save();
    res.json({ bookmarks: me.bookmarks.length });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Block user
module.exports.blockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me.blocked?.find((u) => u.toString() === req.params.id)) {
      me.blocked = [...(me.blocked || []), req.params.id];
      await me.save();
    }
    res.json({ blocked: me.blocked.length });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports.unblockUser = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.blocked = (me.blocked || []).filter((u) => u.toString() !== req.params.id);
    await me.save();
    res.json({ blocked: me.blocked.length });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// List bookmarks (populated posts)
module.exports.listBookmarks = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate({
      path: "bookmarks",
      populate: { path: "author", select: "name profilePic" },
    });
    res.json(me.bookmarks || []);
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Connection invites
module.exports.sendInvite = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (me.connections?.includes(target._id)) return res.json({ message: 'Already connected' });
    if (!me.invitesSent?.includes(target._id)) me.invitesSent.push(target._id);
    if (!target.invitesReceived?.includes(me._id)) target.invitesReceived.push(me._id);
    await me.save(); await target.save();
  // Notify target about invite
    try {
      await Notifier.create(target._id, 'connection-invite', { from: me._id, text: `${me.name || 'Someone'} sent you a connection invite` });
      const io = getIO && getIO();
      if (io) io.to(target._id.toString()).emit('notification', { type: 'connection-invite', data: { from: me._id, text: `${me.name || 'Someone'} sent you a connection invite` } });
    } catch {}
    res.json({ sent: me.invitesSent.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.acceptInvite = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const requesterId = req.params.id;
    if (!me.invitesReceived?.includes(requesterId)) return res.status(400).json({ error: 'No invite found' });
    me.invitesReceived = me.invitesReceived.filter((u) => u.toString() !== requesterId);
    const requester = await User.findById(requesterId);
    requester.invitesSent = (requester.invitesSent || []).filter((u) => u.toString() !== me._id.toString());
    if (!me.connections?.includes(requester._id)) me.connections.push(requester._id);
    if (!requester.connections?.includes(me._id)) requester.connections.push(me._id);
    await me.save(); await requester.save();
  // Notify requester about acceptance
    try {
      await Notifier.create(requester._id, 'connection-accepted', { from: me._id, text: `${me.name || 'Someone'} accepted your connection request` });
      const io = getIO && getIO();
      if (io) {
        io.to(requester._id.toString()).emit('notification', { type: 'connection-accepted', data: { from: me._id, text: `${me.name || 'Someone'} accepted your connection request` } });
        io.to(requester._id.toString()).emit('network:update');
        io.to(me._id.toString()).emit('network:update');
      }
    } catch {}
    res.json({ connections: me.connections.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.listInvites = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('invitesReceived', 'name profilePic headline');
    res.json(me.invitesReceived || []);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Connections list
module.exports.listConnections = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('connections', 'name profilePic headline location');
    res.json(me.connections || []);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Sent invites list
module.exports.listSentInvites = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('invitesSent', 'name profilePic headline');
    res.json(me.invitesSent || []);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Decline an invite
module.exports.declineInvite = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const fromId = req.params.id;
    if (!me.invitesReceived?.includes(fromId)) return res.status(400).json({ error: 'No invite found' });
    me.invitesReceived = me.invitesReceived.filter(u => u.toString() !== fromId);
    const from = await User.findById(fromId);
    from.invitesSent = (from.invitesSent || []).filter(u => u.toString() !== me._id.toString());
    await me.save(); await from.save();
    try {
      const io = getIO && getIO();
      if (io) { io.to(me._id.toString()).emit('network:update'); io.to(from._id.toString()).emit('network:update'); }
    } catch {}
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Cancel a sent invite (withdraw)
module.exports.cancelInvite = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const targetId = req.params.id;
    if (!me.invitesSent?.includes(targetId)) return res.status(400).json({ error: 'No sent invite found' });
    me.invitesSent = me.invitesSent.filter(u => u.toString() !== targetId);
    const target = await User.findById(targetId);
    target.invitesReceived = (target.invitesReceived || []).filter(u => u.toString() !== me._id.toString());
    await me.save(); await target.save();
    try {
      const io = getIO && getIO();
      if (io) { io.to(me._id.toString()).emit('network:update'); io.to(target._id.toString()).emit('network:update'); }
    } catch {}
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Remove a connection
module.exports.removeConnection = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    const otherId = req.params.id;
    me.connections = (me.connections || []).filter(u => u.toString() !== otherId);
    const other = await User.findById(otherId);
    other.connections = (other.connections || []).filter(u => u.toString() !== me._id.toString());
    await me.save(); await other.save();
    try {
      const io = getIO && getIO();
      if (io) { io.to(me._id.toString()).emit('network:update'); io.to(other._id.toString()).emit('network:update'); }
    } catch {}
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Search users to connect
module.exports.searchNetwork = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);
    const me = await User.findById(req.user.id);
    const exclude = new Set([
      me._id.toString(),
      ...(me.connections || []).map(u => u.toString()),
    ]);
    const users = await User.find({
      $and: [
        { _id: { $ne: me._id } },
        { $or: [ { name: new RegExp(q, 'i') }, { headline: new RegExp(q, 'i') } ] },
      ]
    }).select('name profilePic headline location').limit(20);
    res.json(users.filter(u => !exclude.has(u._id.toString())));
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Saved jobs
module.exports.saveJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Not found' });
    const me = await User.findById(req.user.id);
    if (!me.savedJobs?.find(j => j.toString() === job._id.toString())) me.savedJobs.push(job._id);
    await me.save();
    res.json({ savedJobs: me.savedJobs.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.unsaveJob = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.savedJobs = (me.savedJobs || []).filter(j => j.toString() !== req.params.id);
    await me.save();
    res.json({ savedJobs: me.savedJobs.length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.listSavedJobs = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).populate('savedJobs');
    res.json(me.savedJobs || []);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Profile: Experience CRUD
module.exports.addExperience = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.experience.push(req.body);
    await me.save();
    res.json(me.experience);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.updateExperience = async (req, res) => {
  try {
    const { expId } = req.params;
    const me = await User.findById(req.user.id);
    const exp = me.experience.id(expId);
    if (!exp) return res.status(404).json({ error: 'Not found' });
    Object.assign(exp, req.body);
    await me.save();
    res.json(exp);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.deleteExperience = async (req, res) => {
  try {
    const { expId } = req.params;
    const me = await User.findById(req.user.id);
    const exp = me.experience.id(expId);
    if (!exp) return res.status(404).json({ error: 'Not found' });
    exp.remove();
    await me.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Profile: Education CRUD
module.exports.addEducation = async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    me.education.push(req.body);
    await me.save();
    res.json(me.education);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.updateEducation = async (req, res) => {
  try {
    const { eduId } = req.params;
    const me = await User.findById(req.user.id);
    const edu = me.education.id(eduId);
    if (!edu) return res.status(404).json({ error: 'Not found' });
    Object.assign(edu, req.body);
    await me.save();
    res.json(edu);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.deleteEducation = async (req, res) => {
  try {
    const { eduId } = req.params;
    const me = await User.findById(req.user.id);
    const edu = me.education.id(eduId);
    if (!edu) return res.status(404).json({ error: 'Not found' });
    edu.remove();
    await me.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

// Profile: Skills & endorsements
module.exports.addSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    const me = await User.findById(req.user.id);
    if (!me.skills.includes(skill)) me.skills.push(skill);
    await me.save();
    res.json(me.skills);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.removeSkill = async (req, res) => {
  try {
    const { skill } = req.params;
    const me = await User.findById(req.user.id);
    me.skills = (me.skills || []).filter(s => s !== skill);
    await me.save();
    res.json(me.skills);
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.endorseSkill = async (req, res) => {
  try {
    const { id, skill } = req.params; // endorse user :id for skill
    if (id === req.user.id) return res.status(400).json({ error: 'Cannot endorse yourself' });
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.endorsements.push({ skill, by: req.user.id });
    await user.save();
    res.json({ endorsements: user.endorsements.filter(e => e.skill === skill).length });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};

module.exports.toggleOpenFlags = async (req, res) => {
  try {
    const { openToWork, openToHire } = req.body;
    const me = await User.findByIdAndUpdate(req.user.id, { $set: { openToWork, openToHire } }, { new: true });
    res.json({ openToWork: me.openToWork, openToHire: me.openToHire });
  } catch (e) { res.status(500).json({ error: 'Internal Server Error' }); }
};
