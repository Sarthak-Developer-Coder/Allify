const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const mediaUpload = require('../config/mediaUpload');
const ctrl = require('../Controllers/memories_controller');

router.get('/', fetchUser, ctrl.list);
router.post('/upload', fetchUser, mediaUpload.single('file'), ctrl.addFromUpload);
router.post('/from-snap', fetchUser, ctrl.addFromSnap);
router.get('/search', fetchUser, ctrl.search);
router.get('/albums', fetchUser, ctrl.albums);

module.exports = router;
