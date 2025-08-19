const User = require('../Models/User');
const Snap = require('../Models/Snap');
const Message = require('../Models/Message');
const Conversation = require('../Models/Conversation');
const Streak = require('../Models/Streak');

module.exports.overview = async (req, res) => {
  try {
    const me = String(req.user?.id || req.user?._id || req.user);
    const friendId = String(req.params.id);
    if (me === friendId) return res.status(400).json({ error: 'friend required' });

    const friend = await User.findById(friendId).select('name profilePic headline isOnline lastSeen');
    if (!friend) return res.status(404).json({ error: 'Not found' });

    // Snaps between users (latest first)
    const snaps = await Snap.find({
      $or: [
        { sender: me, receiver: friendId },
        { sender: friendId, receiver: me },
      ],
    }).sort({ createdAt: -1 }).limit(50).lean();

    // Conversation (if any) and last 50 messages
    const conv = await Conversation.findOne({ members: { $all: [me, friendId] } });
    let messages = [];
    if (conv) {
      messages = await Message.find({ conversationId: conv._id }).sort({ createdAt: -1 }).limit(50).lean();
      messages.reverse(); // chronological
    }

    // Streak between users
    let streak = await Streak.findOne({ $or: [ { a: me, b: friendId }, { a: friendId, b: me } ] }).lean();
    if (streak) {
      const now = new Date();
      const deadline = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23,59,59,999));
      streak = { ...streak, timeLeftMs: Math.max(0, deadline.getTime() - Date.now()), hourglass: (deadline.getTime() - Date.now()) < 6*60*60*1000 };
    }

    res.json({ friend, snaps, messages, streak });
  } catch (e) { console.error(e); res.status(500).json({ error: 'Internal Server Error' }); }
};
