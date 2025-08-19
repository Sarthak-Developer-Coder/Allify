const router = require('express').Router();
const fetchUser = require('../middleware/fetchUser');
const ctrl = require('../Controllers/push_controller');

router.post('/save', fetchUser, ctrl.save);

// Public endpoint to get VAPID public key
router.get('/key', (req, res) => {
	try {
		const key = process.env.VAPID_PUBLIC_KEY || '';
		res.json({ key });
	} catch {
		res.json({ key: '' });
	}
});

module.exports = router;
