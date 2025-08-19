const express = require("express");
const router = express.Router();
const fetchuser = require("../middleware/fetchUser");
const ctrl = require("../Controllers/portfolio_controller");

// Profile
router.get("/profile", fetchuser, ctrl.getProfile);
router.put("/profile", fetchuser, ctrl.updateProfile);
router.get("/public/:slugOrId", ctrl.getPublicProfile);
router.get("/leaderboard", ctrl.leaderboard);
router.get("/stats", fetchuser, ctrl.stats);
router.get("/analytics", fetchuser, ctrl.analytics);

// Questions
router.get("/questions", fetchuser, ctrl.listQuestions);
router.post("/questions", fetchuser, ctrl.createQuestion);
router.put("/questions/:id", fetchuser, ctrl.updateQuestion);
router.delete("/questions/:id", fetchuser, ctrl.deleteQuestion);

// Sheets
router.get("/sheets", fetchuser, ctrl.listSheets);
router.post("/sheets", fetchuser, ctrl.createSheet);
router.put("/sheets/:id", fetchuser, ctrl.updateSheet);
router.delete("/sheets/:id", fetchuser, ctrl.deleteSheet);

// Events
router.get("/events", fetchuser, ctrl.listEvents);
router.post("/events", fetchuser, ctrl.createEvent);
router.put("/events/:id", fetchuser, ctrl.updateEvent);
router.delete("/events/:id", fetchuser, ctrl.deleteEvent);

// Projects
router.post("/projects", fetchuser, ctrl.addProject);
router.put("/projects/:id", fetchuser, ctrl.updateProject);
router.delete("/projects/:id", fetchuser, ctrl.deleteProject);

module.exports = router;
