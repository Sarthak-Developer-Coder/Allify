const CompanionProfile = require("../Models/CompanionProfile.js");
const { getAiResponse } = require("./message_controller.js");
const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const bcrypt = require("bcryptjs");

// Ensure profile exists for user
async function ensureProfile(userId) {
  let profile = await CompanionProfile.findOne({ userId });
  if (!profile) profile = await CompanionProfile.create({ userId });
  return profile;
}

// GET /companion/profile
const getProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: "Failed to load profile" });
  }
};

// POST /companion/profile
const updateProfile = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    const { displayName, appearance, voice, modes, preferences, systemPrompt, traits, settings } = req.body || {};
    if (displayName) profile.displayName = displayName;
    if (appearance) profile.appearance = { ...(profile.appearance?.toObject?.() || profile.appearance || {}), ...appearance };
    if (voice) profile.voice = { ...(profile.voice?.toObject?.() || profile.voice || {}), ...voice };
    if (modes) profile.modes = { ...(profile.modes?.toObject?.() || profile.modes || {}), ...modes };
    if (preferences) profile.preferences = { ...(profile.preferences || {}), ...preferences };
    if (typeof systemPrompt === 'string') profile.systemPrompt = systemPrompt;
    if (Array.isArray(traits)) profile.traits = traits;
    if (settings) profile.settings = { ...(profile.settings?.toObject?.() || profile.settings || {}), ...settings };
    await profile.save();
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: "Failed to update profile" });
  }
};

// GET /companion/memories
const getMemories = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    res.json(profile.memories || []);
  } catch (e) {
    res.status(500).json({ error: 'Failed to load memories' });
  }
};

// POST /companion/memory
const addMemory = async (req, res) => {
  try {
    const { key, value, tags, weight } = req.body || {};
    if (!key) return res.status(400).json({ error: "key required" });
    const profile = await ensureProfile(req.user.id);
    const existing = profile.memories.find((m) => m.key === key);
    if (existing) {
      existing.value = value ?? existing.value;
      if (tags) existing.tags = tags;
      if (weight != null) existing.weight = weight;
      existing.lastUsedAt = new Date();
    } else {
      profile.memories.push({ key, value: value || "", tags: Array.isArray(tags) ? tags : [], weight: weight || 1 });
    }
    profile.markModified && profile.markModified('memories');
    await profile.save();
    res.json(profile.memories);
  } catch (e) {
    res.status(500).json({ error: "Failed to add memory" });
  }
};

// DELETE /companion/memory
const deleteMemory = async (req, res) => {
  try {
    const { key } = req.body || {};
    if (!key) return res.status(400).json({ error: "key required" });
    const profile = await ensureProfile(req.user.id);
    profile.memories = profile.memories.filter((m) => m.key !== key);
    await profile.save();
    res.json(profile.memories);
  } catch (e) {
    res.status(500).json({ error: "Failed to delete memory" });
  }
};

// POST /companion/memory/clear
const clearMemories = async (req, res) => {
  try {
    const profile = await ensureProfile(req.user.id);
    profile.memories = [];
    await profile.save();
    res.json(profile.memories);
  } catch (e) {
    res.status(500).json({ error: "Failed to clear memories" });
  }
};

// helper: ensure a bot user exists
async function ensureBotUser() {
  let bot = await User.findOne({ email: /ava\.bot@conversa\.local$/i });
  if (!bot) {
    const pwd = await bcrypt.hash(Math.random().toString(36).slice(2) + Date.now(), 10);
    bot = await User.create({
      name: "Ava Bot",
      email: `ava.bot@conversa.local`,
      password: pwd,
      about: "Your caring AI companion.",
    });
  }
  return bot;
}

// helper: ensure a 1:1 conversation between user and bot
async function ensureBotConversation(userId, botId, assistantThreadId) {
  let query = { members: { $all: [userId, botId] }, isGroup: false };
  if (assistantThreadId) query.assistantThreadId = assistantThreadId;
  let conv = await Conversation.findOne(query);
  if (!conv) {
    const payload = { members: [userId, botId], isGroup: false, unreadCounts: [{ userId, count: 0 }, { userId: botId, count: 0 }] };
    if (assistantThreadId) payload.assistantThreadId = assistantThreadId;
    conv = await Conversation.create(payload);
  }
  return conv;
}

// naive relevance: keyword overlap count
function rankMemoriesByText(text, memories) {
  try {
    const tokens = String(text || '').toLowerCase().match(/[a-z0-9#@._-]+/g) || [];
    return (memories || [])
      .map(m => ({ m, score: (m.key + ' ' + (m.value||'')).toLowerCase().split(/\s+/).reduce((s,w)=> s + (tokens.includes(w) ? 1 : 0), 0) + (m.weight || 0) }))
      .sort((a,b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.m);
  } catch { return []; }
}

// POST /companion/talk
const talk = async (req, res) => {
  try {
  let { conversationId, text, assistantThreadId } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: "text required" });
    const bot = await ensureBotUser();
    if (!conversationId) {
      const conv = await ensureBotConversation(req.user.id, bot._id, assistantThreadId);
      conversationId = conv._id.toString();
    }
    const profile = await ensureProfile(req.user.id);
    const relevant = rankMemoriesByText(text, profile.memories);
    const safety = (profile.settings?.safetyLevel || 'medium');
    const guard = safety === 'high' ? 'Avoid sensitive, explicit, or harmful content. Be extra cautious, and defer when unsure.' : safety === 'low' ? 'Be open and creative while staying respectful and safe.' : 'Be helpful and safe; avoid harmful content.';
    const contextLines = [
      `System: ${profile.systemPrompt || 'You are a helpful AI companion.'}`,
      `Safety: ${guard}`,
      `Mode: ${profile.modes?.current || 'friendly'}`,
      profile.traits?.length ? `Traits: ${profile.traits.join(', ')}` : '',
      relevant.length ? `Memories:\n${relevant.map(m=>`- ${m.key}: ${m.value}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  const composed = `${contextLines}\n\nUser: ${String(text)}\nAssistant:`;
  // temperature available for future getAiResponse tuning
  const temperature = Number(profile.settings?.temperature ?? 0.7);
  const reply = await getAiResponse(composed, req.user.id, conversationId, { temperature, safetyLevel: safety });
    if (reply === -1 || !reply || !reply.text) {
      return res.status(503).json({ error: "AI temporarily unavailable" });
    }
  // include citations for UI (keys of top relevant memories)
  res.json({ text: reply.text, meta: { citations: relevant.map(r=> r.key), temperature } });
  } catch (e) {
    res.status(500).json({ error: "Failed to talk" });
  }
};

// POST /companion/talk-stream
// Same as talk, but streams the final reply text in chunks for better UX
const talkStream = async (req, res) => {
  try {
  let { conversationId, text, assistantThreadId } = req.body || {};
    if (!text || !String(text).trim()) return res.status(400).json({ error: "text required" });
    const bot = await ensureBotUser();
    if (!conversationId) {
      const conv = await ensureBotConversation(req.user.id, bot._id, assistantThreadId);
      conversationId = conv._id.toString();
    }
    const profile = await ensureProfile(req.user.id);
    const relevant = rankMemoriesByText(text, profile.memories);
    const safety2 = (profile.settings?.safetyLevel || 'medium');
    const guard2 = safety2 === 'high' ? 'Avoid sensitive, explicit, or harmful content. Be extra cautious, and defer when unsure.' : safety2 === 'low' ? 'Be open and creative while staying respectful and safe.' : 'Be helpful and safe; avoid harmful content.';
    const contextLines = [
      `System: ${profile.systemPrompt || 'You are a helpful AI companion.'}`,
      `Safety: ${guard2}`,
      `Mode: ${profile.modes?.current || 'friendly'}`,
      profile.traits?.length ? `Traits: ${profile.traits.join(', ')}` : '',
      relevant.length ? `Memories:\n${relevant.map(m=>`- ${m.key}: ${m.value}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');
  const composed = `${contextLines}\n\nUser: ${String(text)}\nAssistant:`;
  const temperature = Number(profile.settings?.temperature ?? 0.7);

  const reply = await getAiResponse(composed, req.user.id, conversationId, { temperature, safetyLevel: safety2 });
    if (reply === -1 || !reply || !reply.text) {
      return res.status(503).json({ error: "AI temporarily unavailable" });
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Transfer-Encoding', 'chunked');

  const textOut = String(reply.text);
    const chunks = textOut.match(/.{1,80}/g) || [textOut];
    for (const c of chunks) {
      res.write(c);
      await new Promise(r => setTimeout(r, 15));
    }
  // add a small trailer line with citations markers (UI can ignore if not used)
  res.write("\n\n");
  res.write(`\n[[CITATIONS:${relevant.map(r=>r.key).join('|')}|TEMP:${temperature}]]\n`);
  res.end();
  } catch (e) {
    try { res.status(500).end(''); } catch {}
  }
};

module.exports = { getProfile, updateProfile, addMemory, getMemories, talk, talkStream, deleteMemory, clearMemories };
