const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const fetchuser = require("../middleware/fetchUser.js");
const { getOnlineStatus, followUser, unfollowUser, getProfile, bookmarkPost, unbookmarkPost, blockUser, unblockUser, listBookmarks, sendInvite, acceptInvite, listInvites, listConnections, saveJob, unsaveJob, listSavedJobs, addExperience, updateExperience, deleteExperience, addEducation, updateEducation, deleteEducation, addSkill, removeSkill, endorseSkill, toggleOpenFlags, listSentInvites, declineInvite, cancelInvite, removeConnection, searchNetwork } = require("../Controllers/userController.js");
const User = require('../Models/User');
const {
  getNonFriendsList,
  updateprofile,
  updateProfilePic,
} = require("../Controllers/auth_controller.js");

router.get("/online-status/:id", fetchuser, getOnlineStatus);
router.get("/non-friends", fetchuser, getNonFriendsList);
router.put("/update", fetchuser, updateprofile);
router.post("/profile-pic", fetchuser, upload.single("file"), updateProfilePic);
router.post("/:id/follow", fetchuser, followUser);
router.post("/:id/unfollow", fetchuser, unfollowUser);
router.get("/profile/:id", fetchuser, getProfile);
router.post("/bookmark/:id", fetchuser, bookmarkPost);
router.post("/unbookmark/:id", fetchuser, unbookmarkPost);
router.get("/bookmarks", fetchuser, listBookmarks);
router.post("/connect/:id", fetchuser, sendInvite);
router.post("/connect/:id/accept", fetchuser, acceptInvite);
router.get("/invites", fetchuser, listInvites);
router.get("/connections", fetchuser, listConnections);
router.get("/invites/sent", fetchuser, listSentInvites);
router.post("/connect/:id/decline", fetchuser, declineInvite);
router.post("/connect/:id/cancel", fetchuser, cancelInvite);
router.post("/connections/:id/remove", fetchuser, removeConnection);
router.get("/network/search", fetchuser, searchNetwork);
router.post("/jobs/:id/save", fetchuser, saveJob);
router.post("/jobs/:id/unsave", fetchuser, unsaveJob);
router.get("/jobs/saved", fetchuser, listSavedJobs);
router.post("/block/:id", fetchuser, blockUser);
router.post("/unblock/:id", fetchuser, unblockUser);

// LinkedIn-like profile editing
router.post('/experience', fetchuser, addExperience);
router.put('/experience/:expId', fetchuser, updateExperience);
router.delete('/experience/:expId', fetchuser, deleteExperience);
router.post('/education', fetchuser, addEducation);
router.put('/education/:eduId', fetchuser, updateEducation);
router.delete('/education/:eduId', fetchuser, deleteEducation);
router.post('/skills', fetchuser, addSkill);
router.delete('/skills/:skill', fetchuser, removeSkill);
router.post('/:id/skills/:skill/endorse', fetchuser, endorseSkill);
router.post('/open', fetchuser, toggleOpenFlags);

// Avatar seed setter (Bitmoji-style avatar basis)
router.post('/me/avatar', fetchuser, async (req, res) => {
  try { await User.findByIdAndUpdate(req.user.id, { avatarSeed: String(req.body.seed||'').slice(0,64) }); res.json({ ok: true }); }
  catch { res.status(500).json({ error: 'failed' }); }
});


module.exports = router;
