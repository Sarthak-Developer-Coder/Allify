const express = require('express');
const router = express.Router();
const Meeting = require('../Models/Meeting');
const fetchUser = require('../middleware/fetchUser');

// Create meeting
router.post('/', fetchUser, async (req, res) => {
  try {
    const { title, lobby = false, locked = false, passcode = '' } = req.body;
    const roomId = Math.random().toString(36).slice(2, 10);
    const meet = await Meeting.create({ roomId, title: title || '', host: req.user.id, lobby, locked, passcode });
    res.json(meet);
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

// Get meeting by roomId
router.get('/:roomId', fetchUser, async (req, res) => {
  try {
    const meet = await Meeting.findOne({ roomId: req.params.roomId }).populate('host', 'name email');
      if (!meet) return res.status(404).json({ error: 'Meeting not found' });
      res.json({
        roomId: meet.roomId,
        title: meet.title,
        host: meet.host,
        lobby: meet.lobby,
        locked: meet.locked,
        hasPasscode: !!meet.passcode,
        createdAt: meet.createdAt,
        endedAt: meet.endedAt,
      });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

// End meeting
router.post('/:roomId/end', fetchUser, async (req, res) => {
  try {
    const meet = await Meeting.findOne({ roomId: req.params.roomId });
    if (!meet) return res.status(404).json({ error: 'not found' });
    if (meet.host.toString() !== req.user.id.toString()) return res.status(403).json({ error: 'forbidden' });
    meet.endedAt = new Date();
    await meet.save();
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'failed' }); }
});

  // Update meeting configuration (host only)
  router.post('/:roomId/config', fetchUser, async (req, res) => {
    try {
      const meet = await Meeting.findOne({ roomId: req.params.roomId });
      if (!meet) return res.status(404).json({ error: 'Meeting not found' });
      if (meet.host.toString() !== req.user.id.toString()) return res.status(403).json({ error: 'Only host can update config' });
      const { lobby, locked, passcode } = req.body;
      if (typeof lobby === 'boolean') meet.lobby = lobby;
      if (typeof locked === 'boolean') meet.locked = locked;
      if (typeof passcode === 'string') meet.passcode = passcode;
      await meet.save();
      res.json({ lobby: meet.lobby, locked: meet.locked, hasPasscode: !!meet.passcode });
    } catch (e) {
      res.status(500).json({ error: 'Unable to update config' });
    }
  });

module.exports = router;
