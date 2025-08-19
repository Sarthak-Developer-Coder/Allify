const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/streaks_controller');

router.get('/mine', fetchUser, ctrl.mine);
router.get('/leaderboard', ctrl.leaderboard);
router.post('/hide/:id', fetchUser, ctrl.hide);
router.get('/:userId', fetchUser, ctrl.user);
router.get('/me/best-friends', fetchUser, ctrl.bestFriends);
router.get('/me/snap-score', fetchUser, ctrl.snapScore);

module.exports = router;
