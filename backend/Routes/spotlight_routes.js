const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const mediaUpload = require('../config/mediaUpload');
const ctrl = require('../Controllers/spotlight_controller');

router.get('/feed', ctrl.feed);
router.post('/create', fetchUser, mediaUpload.single('file'), ctrl.create);
router.post('/like/:id', fetchUser, ctrl.toggleLike);

module.exports = router;
