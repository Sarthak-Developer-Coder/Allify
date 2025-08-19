const express = require("express");
const router = express.Router();

const ctrl = require("../Controllers/conversation_controller.js");
const fetchuser = require("../middleware/fetchUser.js");

router.post("/", fetchuser, ctrl.createConversation);
router.get("/:id", fetchuser, ctrl.getConversation);
router.get("/", fetchuser, ctrl.getConversationList);
router.post("/pin", fetchuser, ctrl.pinMessage);
router.post("/unpin", fetchuser, ctrl.unpinMessage);
router.post("/reply", fetchuser, ctrl.reply);
router.post("/forward", fetchuser, ctrl.forward);
router.get("/:id/pins", fetchuser, ctrl.getPinnedMessages);

module.exports = router;
