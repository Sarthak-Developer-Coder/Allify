const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const mediaUpload = require('../config/mediaUpload');
const ctrl = require('../Controllers/snap_controller');

router.post('/send', fetchUser, mediaUpload.single('file'), ctrl.send);
router.post('/bulk', fetchUser, mediaUpload.single('file'), ctrl.bulkSend);
router.get('/inbox', fetchUser, ctrl.inbox);
router.get('/sent', fetchUser, ctrl.sentList);
router.post('/view/:id', fetchUser, ctrl.view);
router.delete('/:id', fetchUser, ctrl.deleteSnap);
// New snap features
router.post('/reply/:id', fetchUser, mediaUpload.single('file'), ctrl.reply);
router.post('/view-all', fetchUser, ctrl.viewAll);
router.post('/replay/:id', fetchUser, ctrl.replay);
router.post('/report/:id', fetchUser, ctrl.report);

module.exports = router;
