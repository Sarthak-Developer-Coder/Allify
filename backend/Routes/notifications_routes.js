const router = require('express').Router();
const fetchuser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/notifications_controller');

router.get('/', fetchuser, ctrl.list);
router.post('/read', fetchuser, ctrl.markRead);

module.exports = router;
