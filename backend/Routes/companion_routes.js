const express = require("express");
const router = express.Router();
const fetchuser = require("../middleware/fetchUser.js");
const { getProfile, updateProfile, addMemory, getMemories, talk, talkStream, deleteMemory, clearMemories } = require("../Controllers/companion_controller.js");

router.get("/profile", fetchuser, getProfile);
router.post("/profile", fetchuser, updateProfile);
router.post("/memory", fetchuser, addMemory);
router.delete("/memory", fetchuser, deleteMemory);
router.get("/memories", fetchuser, getMemories);
router.post("/memory/clear", fetchuser, clearMemories);
router.post("/talk", fetchuser, talk);
router.post("/talk-stream", fetchuser, talkStream);

module.exports = router;
