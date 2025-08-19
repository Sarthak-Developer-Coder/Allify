const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/map_controller');

router.post('/update', fetchUser, ctrl.update);
router.get('/nearby', fetchUser, ctrl.nearby);

module.exports = router;
