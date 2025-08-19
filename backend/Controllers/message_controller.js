const Message = require("../Models/Message.js");
const Conversation = require("../Models/Conversation.js");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const imageupload = require("../config/imageupload.js");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
// Cloudinary is now used for uploads; AWS S3 logic removed.

const configuration = new GoogleGenerativeAI(process.env.GENERATIVE_API_KEY);
const modelId = "gemini-1.5-flash";
const model = configuration.getGenerativeModel({ model: modelId });

// --- Gemini call resilience: throttle + retry + cache ---
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// global throttle (serialize + min interval)
let _geminiChain = Promise.resolve();
let _lastGeminiAt = 0;
const MIN_INTERVAL_MS = 800; // ~1.25 req/s max
async function throttleGemini(fn) {
  _geminiChain = _geminiChain.then(async () => {
    const now = Date.now();
    const due = _lastGeminiAt + MIN_INTERVAL_MS;
    if (now < due) await wait(due - now);
    try {
      return await fn();
    } finally {
      _lastGeminiAt = Date.now();
    }
  });
  return _geminiChain;
}
// tiny in-memory cache for identical prompts
const _geminiCache = new Map(); // key: prompt string, val: text
const _geminiCacheKeys = [];
const CACHE_LIMIT = 100;
function cacheGet(k){ return _geminiCache.get(k); }
function cacheSet(k,v){
  if (_geminiCache.has(k)) return; // keep first
  _geminiCache.set(k,v); _geminiCacheKeys.push(k);
  if (_geminiCacheKeys.length > CACHE_LIMIT){ const old=_geminiCacheKeys.shift(); _geminiCache.delete(old); }
}
// Cooldown when daily quota is hit
const SOFT_COOLDOWN_MS = parseInt(process.env.AI_COOLDOWN_MS || "", 10) || (30 * 60 * 1000);
const QUOTA_NOTICE_INTERVAL_MS = parseInt(process.env.AI_QUOTA_NOTICE_MS || "", 10) || (10 * 60 * 1000);
let aiCooldownUntil = 0; // ms epoch
// Remember last time we sent a quota notice per conversation to avoid duplicates
const _lastQuotaNoticeAt = new Map(); // conversationId -> ms epoch

const sendMessage = async (req, res) => {
  // Upload media (image/audio/video) if present via Cloudinary
  let uploadedImageUrl = "";
  let uploadedAudioUrl = "";
  let uploadedVideoUrl = "";
  if (req.file) {
    const uploaded = await imageupload(req.file, false);
    // Heuristic: decide URL field by mimetype
    if (req.file.mimetype && req.file.mimetype.startsWith("audio/")) {
      uploadedAudioUrl = uploaded;
    } else if (req.file.mimetype && req.file.mimetype.startsWith("video/")) {
      uploadedVideoUrl = uploaded;
    } else {
      uploadedImageUrl = uploaded;
    }
  }

  try {
    const { conversationId, sender, text } = req.body;

  // Validate: must have conversationId, sender, and at least one of text or media
  if (!conversationId || !sender || (!text && !uploadedImageUrl && !uploadedAudioUrl && !uploadedVideoUrl)) {
      return res.status(400).json({ error: "Please fill all the fields" });
    }

    const conversation = await Conversation.findById(conversationId).populate(
      "members",
      "-password"
    );

    // Check if conversation contains bot
    let isbot = false;
    conversation.members.forEach((member) => {
      if (member != sender && member.email.includes("bot")) {
        isbot = true;
      }
    });

    // Only create message if at least one of text or media URL is present
    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasImage = typeof uploadedImageUrl === "string" && uploadedImageUrl.trim().length > 0;
    const hasAudio = typeof uploadedAudioUrl === "string" && uploadedAudioUrl.trim().length > 0;
    const hasVideo = typeof uploadedVideoUrl === "string" && uploadedVideoUrl.trim().length > 0;
    if (!hasText && !hasImage && !hasAudio && !hasVideo) {
      return res.status(400).json({ error: "Message must have either text, imageUrl, audioUrl or videoUrl." });
    }

    const messagePayload = {
      conversationId,
      senderId: sender,
      seenBy: [{ user: sender }],
    };
  if (hasText) messagePayload.text = text.trim();
  if (hasImage) messagePayload.imageUrl = uploadedImageUrl.trim();
  if (hasAudio) messagePayload.audioUrl = uploadedAudioUrl.trim();
  if (hasVideo) messagePayload.videoUrl = uploadedVideoUrl.trim();

    const newMessage = await Message.create(messagePayload);

    // Update conversation metadata
    conversation.updatedAt = new Date();
    if (hasText) {
      conversation.latestmessage = text.trim();
    } else if (hasImage) {
      conversation.latestmessage = "📷 Photo";
    } else if (hasAudio) {
      conversation.latestmessage = "🎤 Voice message";
    } else if (hasVideo) {
      conversation.latestmessage = "🎬 Video";
    }
    await conversation.save();

    return res.json(newMessage);
  } catch (error) {
    console.error("/message/send error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

const allMessage = async (req, res) => {
  try {
    // Short-circuit if we are in a cooldown period
    if (Date.now() < aiCooldownUntil) {
      // Avoid spamming: emit a quota notice at most once every 10 minutes per conversation
  const lastAt = _lastQuotaNoticeAt.get(conversationId) || 0;
  if (Date.now() - lastAt > QUOTA_NOTICE_INTERVAL_MS) {
        try {
          const conv = await Conversation.findById(conversationId);
          const botId = conv.members.find((member) => member != senderId);
          const notice = "I’m currently out of daily AI credits. Please try again later.";
          await Message.create({ conversationId, senderId: botId, text: notice });
          conv.latestmessage = notice; await conv.save();
          _lastQuotaNoticeAt.set(conversationId, Date.now());
        } catch (_) {}
      }
      return -1;
    }
    const messages = await Message.find({
      conversationId: req.params.id,
      deletedFrom: { $ne: req.user.id },
    });

    messages.forEach(async (message) => {
      let isUserAddedToSeenBy = false;
      message.seenBy.forEach((element) => {
        if (element.user == req.user.id) {
          isUserAddedToSeenBy = true;
        }
      });
      if (!isUserAddedToSeenBy) {
        message.seenBy.push({ user: req.user.id });
      }
      await message.save();
    });

    res.json(messages);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Internal Server Error");
  }
};

const deletemesage = async (req, res) => {
  const msgid = req.body.messageid;
  const userids = req.body.userids;
  try {
    const message = await Message.findById(msgid);

    userids.forEach(async (userid) => {
      if (!message.deletedby.includes(userid)) {
        message.deletedby.push(userid);
      }
    });
    await message.save();
    res.status(200).send("Message deleted successfully");
  } catch (error) {
    console.log(error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// getPresignedUrl removed. Use Cloudinary upload endpoints instead.

const getAiResponse = async (prompt, senderId, conversationId, options = {}) => {
  var currentMessages = [];
  const conv = await Conversation.findById(conversationId);
  const botId = conv.members.find((member) => member != senderId);

  const messagelist = await Message.find({
    conversationId: conversationId,
  })
    .sort({ createdAt: -1 })
    .limit(20);

  messagelist.forEach((message) => {
    if (message.senderId == senderId) {
      currentMessages.push({
        role: "user",
        parts: message.text,
      });
    } else {
      currentMessages.push({
        role: "model",
        parts: message.text,
      });
    }
  });

  // reverse currentMessages
  currentMessages = currentMessages.reverse();

  try {
    // Serve from cache if identical prompt asked recently
    let responseText = cacheGet(String(prompt||''));
    if (!responseText) {
      // Safety-level tuning -> topP defaults
      let topP;
      if (options && typeof options.safetyLevel === 'string') {
        if (options.safetyLevel === 'high') topP = 0.8;
        else if (options.safetyLevel === 'low') topP = 1.0;
        else topP = 0.95;
      }
      const chat = model.startChat({
        history: currentMessages,
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: typeof options.temperature === 'number' ? options.temperature : undefined,
          topP,
        },
      });
      // Retry with exponential backoff on 429s and transient failures
      const maxRetries = 3;
      let attempt = 0;
  for (;;) {
        try {
          const res = await throttleGemini(() => chat.sendMessage(prompt));
          const resp = res.response;
          responseText = resp.text();
          break;
        } catch (e) {
          const msg = String(e?.message || e || '');
          const is429 = msg.includes('429') || msg.toLowerCase().includes('quota');
          if (attempt >= maxRetries || !is429) throw e;
          const delay = Math.min(30000, (2 ** attempt) * 1000 + Math.floor(Math.random()*300));
          await wait(delay);
          attempt += 1;
        }
      }
      if (responseText && responseText.trim()) cacheSet(String(prompt||''), responseText);
    }

    if (responseText.length < 1) {
      responseText = "I'm here and listening. How can I help you right now?";
    }

    await Message.create({
      conversationId: conversationId,
      senderId: senderId,
      text: prompt,
      seenBy: [{ user: botId, seenAt: new Date() }],
    });

  const botMessage = await Message.create({
      conversationId: conversationId,
      senderId: botId,
      text: responseText,
    });

    conv.latestmessage = responseText;
    await conv.save();

  // Return a minimal shape that callers (like /companion/talk) can use
  return { id: botMessage._id, text: responseText };
  } catch (error) {
    const msg = String(error?.message || error || '');
    const looksQuota = msg.includes('429') || msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('exceeded');
    if (looksQuota) {
  // Set a soft cooldown; configurable via env
  aiCooldownUntil = Date.now() + SOFT_COOLDOWN_MS;
      // Emit a single notice (if not sent recently) and return -1 so controllers can send proper status
      try {
  const lastAt = _lastQuotaNoticeAt.get(conversationId) || 0;
  if (Date.now() - lastAt > QUOTA_NOTICE_INTERVAL_MS) {
          const notice = "I’m currently out of daily AI credits. Please try again later.";
          const conv2 = await Conversation.findById(conversationId);
          const botId2 = conv2.members.find((member) => member != senderId);
          await Message.create({ conversationId, senderId: botId2, text: notice });
          conv2.latestmessage = notice; await conv2.save();
          _lastQuotaNoticeAt.set(conversationId, Date.now());
        }
      } catch (_) { /* ignore */ }
      return -1;
    }
    // Non-quota error: graceful fallback message so UX stays smooth
    try {
      const fallback = "I'm having a little trouble reaching my AI brain right now, but I'm here for you. What would you like to do?";
      await Message.create({ conversationId, senderId, text: prompt, seenBy: [] });
      const conv3 = await Conversation.findById(conversationId);
      const botId3 = conv3.members.find((member) => member != senderId);
      await Message.create({ conversationId, senderId: botId3, text: fallback });
      conv3.latestmessage = fallback; await conv3.save();
      return { id: 'fallback', text: fallback };
    } catch (_) {
      // If even fallback fails, return -1
      console.log(msg);
      return -1;
    }
  }
};

const sendMessageHandler = async (data) => {
  const { text, imageUrl, audioUrl, videoUrl, replyTo, senderId, conversationId, receiverId, isReceiverInsideChatRoom } = data;
  const conversation = await Conversation.findById(conversationId);

  // Build payload conditionally to satisfy schema (require either text or imageUrl)
  const payload = { conversationId, senderId };
  const trimmed = typeof text === "string" ? text.trim() : "";
  const hasText = trimmed.length > 0;
  const hasImage = typeof imageUrl === "string" && imageUrl.trim().length > 0;
  const hasAudio = typeof audioUrl === "string" && audioUrl.trim().length > 0;
  const hasVideo = typeof videoUrl === "string" && videoUrl.trim().length > 0;
  if (hasText) payload.text = trimmed;
  if (hasImage) payload.imageUrl = imageUrl.trim();
  if (hasAudio) payload.audioUrl = audioUrl.trim();
  if (hasVideo) payload.videoUrl = videoUrl.trim();
  if (replyTo) payload.replyTo = replyTo;

  // If neither text nor imageUrl present, do not create message
  if (!hasText && !hasImage && !hasAudio && !hasVideo) {
    return null;
  }

  if (!isReceiverInsideChatRoom) {
  payload.seenBy = [];
  payload.deliveredTo = [receiverId];
    const message = await Message.create(payload);

    // Update conversation latest message and increment unread count
  conversation.latestmessage = payload.text
      ? payload.text
      : hasImage
      ? "📷 Photo"
      : hasAudio
      ? "🎤 Voice message"
      : "🎬 Video";
    conversation.unreadCounts?.forEach((unread) => {
      if (unread.userId.toString() == receiverId.toString()) {
        unread.count += 1;
      }
    });
    await conversation.save();
    return message;
  } else {
    // Create new message with seenBy receiver
    payload.seenBy = [
      {
        user: receiverId,
        seenAt: new Date(),
      },
    ];
    payload.deliveredTo = [receiverId];
    const message = await Message.create(payload);
  conversation.latestmessage = payload.text
      ? payload.text
      : hasImage
      ? "📷 Photo"
      : hasAudio
      ? "🎤 Voice message"
      : "🎬 Video";
    await conversation.save();
    return message;
  }
};

const deleteMessageHandler = async (data) => {
  const { messageId, deleteFrom } = data;
  const message = await Message.findById(messageId);

  if (!message) {
    return false;
  }

  try {
    deleteFrom.forEach(async (userId) => {
      if (!message.deletedFrom.includes(userId)) {
        message.deletedFrom.push(userId);
      }
    });
    await message.save();

    return true;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

module.exports = {
  sendMessage,
  allMessage,
  getAiResponse,
  deletemesage,
  sendMessageHandler,
  deleteMessageHandler,
};
