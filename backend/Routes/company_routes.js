const router = require('express').Router();
const fetchuser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/company_controller');

router.get('/', fetchuser, ctrl.listCompanies);
router.post('/', fetchuser, ctrl.createCompany);
router.get('/:id', fetchuser, ctrl.getCompany);
router.post('/:id/follow', fetchuser, ctrl.followCompany);
router.post('/:id/unfollow', fetchuser, ctrl.unfollowCompany);

module.exports = router;
