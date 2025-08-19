const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/games_controller');

router.post('/score', fetchUser, ctrl.submitScore);
router.get('/top/:game', ctrl.topScores);
router.get('/best/:game', fetchUser, ctrl.myBest);

module.exports = router;
