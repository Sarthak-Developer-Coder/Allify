const Post = require("../Models/Post");
const Comment = require("../Models/Comment");
const Story = require("../Models/Story");
const imageupload = require("../config/imageupload");
const mongoose = require("mongoose");

// Create a post (image/video)
exports.createPost = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No media" });
    const url = await imageupload(req.file, false);
    const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    const post = await Post.create({ author: req.user.id, mediaUrl: url, mediaType, caption: req.body.caption || "", text: req.body.text || "" });
    res.json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Create text-only post
exports.createTextPost = async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) return res.status(400).json({ error: "Empty" });
    const post = await Post.create({ author: req.user.id, text, caption: req.body.caption || "" });
    res.json(post);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Feed (recent posts)
exports.getFeed = async (req, res) => {
  try {
  const posts = await Post.find().sort({ createdAt: -1 }).limit(50).populate("author", "name profilePic").populate("repostOf");
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Like/unlike
exports.toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });
    const me = req.user.id;
    const idx = post.likes.findIndex((u) => u.toString() === me);
    if (idx >= 0) {
      post.likes.splice(idx, 1);
    } else {
      post.likes.push(me);
    }
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Comments
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ error: "Empty" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Not found" });
    const c = await Comment.create({ postId: post._id, author: req.user.id, text: text.trim() });
    post.commentsCount += 1;
    await post.save();
    res.json(c);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getComments = async (req, res) => {
  try {
    const list = await Comment.find({ postId: req.params.id }).sort({ createdAt: -1 }).limit(100).populate("author", "name profilePic");
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Stories
exports.createStory = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No media" });
    const url = await imageupload(req.file, false);
    const mediaType = req.file.mimetype.startsWith("video/") ? "video" : "image";
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const s = await Story.create({ author: req.user.id, mediaUrl: url, mediaType, expiresAt, viewers: [] });
    res.json(s);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getStories = async (req, res) => {
  try {
    const list = await Story.find({ expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 }).limit(100).populate("author", "name profilePic");
    res.json(list);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Reels (short form videos)
exports.getReels = async (req, res) => {
  try {
    const reels = await Post.find({ mediaType: "video" })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("author", "name profilePic");
    res.json(reels);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Repost
exports.repost = async (req, res) => {
  try {
    const original = await Post.findById(req.params.id);
    if (!original) return res.status(404).json({ error: "Not found" });
    const rp = await Post.create({ author: req.user.id, repostOf: original._id, text: (req.body.text || "").trim() });
    res.json(rp);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Timeline (following only)
exports.getTimeline = async (req, res) => {
  try {
    const User = require("../Models/User");
    const me = await User.findById(req.user.id);
    const following = (me?.following || []).map((u) => u.toString());
    const query = following.length ? { author: { $in: following } } : {};
    const posts = await Post.find(query).sort({ createdAt: -1 }).limit(100).populate("author", "name profilePic").populate("repostOf");
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Posts by user
exports.getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.id }).sort({ createdAt: -1 }).limit(100).populate("repostOf");
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
