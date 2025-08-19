const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const mediaUpload = require('../config/mediaUpload');
const ctrl = require('../Controllers/story_controller');

router.post('/upload', fetchUser, mediaUpload.single('file'), ctrl.upload);
router.get('/feed', fetchUser, ctrl.feed);
router.post('/view/:id', fetchUser, ctrl.view);
router.get('/viewers/:id', fetchUser, ctrl.viewers);
router.post('/:id/save', fetchUser, ctrl.saveToMemories);

module.exports = router;
