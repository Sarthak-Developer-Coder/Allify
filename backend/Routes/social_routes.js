const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const fetchuser = require("../middleware/fetchUser");
const ctrl = require("../Controllers/social_controller");

router.get("/feed", fetchuser, ctrl.getFeed);
router.post("/post", fetchuser, upload.single("file"), ctrl.createPost);
router.post("/post/text", fetchuser, ctrl.createTextPost);
router.post("/post/:id/like", fetchuser, ctrl.toggleLike);
router.get("/post/:id/comments", fetchuser, ctrl.getComments);
router.post("/post/:id/comment", fetchuser, ctrl.addComment);
router.post("/post/:id/repost", fetchuser, ctrl.repost);
router.get("/timeline", fetchuser, ctrl.getTimeline);
router.get("/user/:id/posts", fetchuser, ctrl.getUserPosts);

router.get("/stories", fetchuser, ctrl.getStories);
router.post("/stories", fetchuser, upload.single("file"), ctrl.createStory);

// Reels (short videos)
router.get("/reels", fetchuser, ctrl.getReels);

module.exports = router;
