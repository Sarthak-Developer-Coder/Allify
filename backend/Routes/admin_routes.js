const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const isAdmin = require('../middleware/isAdmin');
const ctrl = require('../Controllers/admin_controller');

// In a real app, add isAdmin middleware
router.get('/metrics', fetchUser, isAdmin, ctrl.metrics);

module.exports = router;
