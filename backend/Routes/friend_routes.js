const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/friend_controller');

router.get('/:id/overview', fetchUser, ctrl.overview);

module.exports = router;
