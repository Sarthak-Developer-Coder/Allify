const GameScore = require('../Models/GameScore');

exports.submitScore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { game, score } = req.body;
    if (!game || typeof score !== 'number') return res.status(400).json({ error: 'game and numeric score required' });
    const entry = await GameScore.create({ user: userId, game, score });
    res.json(entry);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.topScores = async (req, res) => {
  try {
    const { game } = req.params;
    const limit = Number(req.query.limit || 20);
    const scores = await GameScore.find({ game }).sort({ score: -1, createdAt: 1 }).limit(limit).populate('user', 'name profilePic');
    res.json(scores);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

exports.myBest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { game } = req.params;
    const best = await GameScore.findOne({ user: userId, game }).sort({ score: -1 });
    res.json(best || { score: 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
