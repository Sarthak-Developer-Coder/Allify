const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/reactions_controller');

router.post('/toggle', fetchUser, ctrl.toggle);
router.get('/:snapId', fetchUser, ctrl.list);
router.post('/counts', fetchUser, ctrl.counts);

module.exports = router;
