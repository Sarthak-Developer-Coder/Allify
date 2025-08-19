const router = require('express').Router();
const fetchuser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/jobs_controller');

router.get('/', fetchuser, ctrl.listJobs);
router.post('/', fetchuser, ctrl.createJob);
router.get('/:id', fetchuser, ctrl.getJob);
router.post('/:id/apply', fetchuser, ctrl.applyToJob);

// alerts
router.get('/alerts/list', fetchuser, ctrl.listAlerts);
router.post('/alerts', fetchuser, ctrl.createAlert);
router.delete('/alerts/:id', fetchuser, ctrl.deleteAlert);

module.exports = router;
