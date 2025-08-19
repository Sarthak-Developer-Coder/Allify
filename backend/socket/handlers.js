const Conversation = require("../Models/Conversation.js");
const User = require("../Models/User.js");
const Message = require("../Models/Message.js");
const MusicRoom = require("../Models/MusicRoom.js");
const {
  getAiResponse,
  sendMessageHandler,
  deleteMessageHandler,
} = require("../Controllers/message_controller.js");

module.exports = (io, socket) => {
  let currentUserId = null;
  // Track active calls by user to prevent double ringing (in-memory)
  const activeCalls = new Map(); // key: userId, value: { peerId, callType }
  // Meetings: in-memory participant role/state cache (ephemeral)
  // room => { hostUserId, locked, lobby, passcode, muteOnJoin, spotlight: string|null, recording: Set<userId>, allowChat: boolean, allowReactions: boolean, allowScreenShare: boolean, allowLocalRecording: boolean, participants: Map(userId => { role, muted, name }), waiting: Map<userId, name>, polls: Map }
  const meetings = new Map();
  // Music rooms: ephemeral shared queues
  // key => { queue: [trackId], idx: number, paused: boolean, ts: number (ms since epoch for position anchor), lastSeek: number (sec), host: userId|null, members: Set(userId), pin?: string, moderators?: Set(userId) }
  const musicRooms = new Map();

  // Setup user in a room
  socket.on("setup", async (id) => {
    currentUserId = id;
    socket.join(id);
    console.log("User joined personal room", id);
    socket.emit("user setup", id);

    // change isOnline to true
    await User.findByIdAndUpdate(id, { isOnline: true });

    const conversations = await Conversation.find({
      members: { $in: [id] },
    });

    conversations.forEach((conversation) => {
      const sock = io.sockets.adapter.rooms.get(conversation.id);
      if (sock) {
        console.log("Other user is online is sent to: ", id);
        io.to(conversation.id).emit("receiver-online", {});
      }
    });
  });

  // Join chat room
  socket.on("join-chat", async (data) => {
    const { roomId, userId } = data;

    console.log("User joined chat room", roomId);
    const conv = await Conversation.findById(roomId);
    socket.join(roomId);

    // set joined user unread to 0
    conv.unreadCounts = conv.unreadCounts.map((unread) => {
      if (unread.userId == userId) {
        unread.count = 0;
      }
      return unread;
    });
    await conv.save({ timestamps: false });

    io.to(roomId).emit("user-joined-room", userId);
  });

  // Leave chat room
  socket.on("leave-chat", (room) => {
    socket.leave(room);
  });

  // ------------------ WebRTC CALL SIGNALING ------------------
  // Start call: notify callee of an incoming call
  socket.on("start-call", ({ toUserId, fromUserId, conversationId, callType }) => {
    try {
      // Mark both users as in-call (best-effort)
      activeCalls.set(fromUserId, { peerId: toUserId, callType });
      activeCalls.set(toUserId, { peerId: fromUserId, callType });

      const calleeRoom = io.sockets.adapter.rooms.get(toUserId?.toString());
      if (!calleeRoom) {
        io.to(fromUserId.toString()).emit("user-unavailable", { reason: "offline" });
        return;
      }
      io.to(toUserId.toString()).emit("incoming-call", { fromUserId, conversationId, callType });
    } catch (e) {
      console.error("start-call error", e);
    }
  });

  // Forward SDP offer/answer and ICE candidates
  socket.on("call-offer", ({ toUserId, fromUserId, sdp }) => {
    io.to(toUserId.toString()).emit("call-offer", { fromUserId, sdp });
  });
  socket.on("call-answer", ({ toUserId, fromUserId, sdp }) => {
    io.to(toUserId.toString()).emit("call-answer", { fromUserId, sdp });
  });
  socket.on("ice-candidate", ({ toUserId, fromUserId, candidate }) => {
    io.to(toUserId.toString()).emit("ice-candidate", { fromUserId, candidate });
  });
  socket.on("end-call", ({ toUserId, fromUserId }) => {
    io.to(toUserId.toString()).emit("end-call", { fromUserId });
    activeCalls.delete(fromUserId);
    activeCalls.delete(toUserId);
  });

  socket.on("decline-call", ({ toUserId, fromUserId }) => {
    io.to(toUserId.toString()).emit("call-declined", { fromUserId });
    activeCalls.delete(fromUserId);
    activeCalls.delete(toUserId);
  });

  const handleSendMessage = async (data) => {
    console.log("Received message: ");

    var isSentToBot = false;

  const { conversationId, senderId, text, imageUrl, audioUrl } = data;
    const conversation = await Conversation.findById(conversationId).populate(
      "members"
    );

    // processing for AI chatbot
    const hasTextForBot = typeof text === "string" && text.trim().length > 0;
    conversation.members.forEach(async (member) => {
      if (member._id != senderId && member.email.endsWith("bot") && hasTextForBot) {
        // this member is a bot
        isSentToBot = true;
        // send typing event
        io.to(conversationId).emit("typing", { typer: member._id.toString() });
        // generating AI response

        const mockUserMessage = {
          id_: Date.now().toString(),
          conversationId: conversationId,
          senderId: senderId,
          text: text,
          seenBy: [
            {
              user: member._id.toString(),
              seenAt: new Date(),
            },
          ],
          imageUrl: imageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

  // echo user's message to room
  io.to(conversationId).emit("receive-message", mockUserMessage);

        const responseMessage = await getAiResponse(
          text,
          senderId,
          conversationId,
          {}
        );

        if (responseMessage == -1) {
          return;
        }

        io.to(conversationId).emit("receive-message", responseMessage);
        io.to(conversationId).emit("stop-typing", {
          typer: member._id.toString(),
        });
      }
    });

  if (isSentToBot) {
      return;
    }

    // processing for personal chat
    const receiverId = conversation.members.find(
      (member) => member._id != senderId
    )._id;

    const receiverPersonalRoom = io.sockets.adapter.rooms.get(
      receiverId.toString()
    );

    let isReceiverInsideChatRoom = false;

    if (receiverPersonalRoom) {
      const receiverSid = Array.from(receiverPersonalRoom)[0];
      isReceiverInsideChatRoom = io.sockets.adapter.rooms
        .get(conversationId)
        .has(receiverSid);
    }

    // Only proceed if at least one of text or imageUrl is present and non-empty
    const hasText = typeof text === "string" && text.trim().length > 0;
  const hasImage = typeof imageUrl === "string" && imageUrl.trim().length > 0;
  const hasAudio = typeof audioUrl === "string" && audioUrl.trim().length > 0;
  if (!hasText && !hasImage && !hasAudio) {
      return;
    }

    const message = await sendMessageHandler({
  text,
  imageUrl,
  audioUrl,
      senderId,
      conversationId,
      receiverId,
      isReceiverInsideChatRoom,
    });

    if (message) {
      io.to(conversationId).emit("receive-message", message);
      if (!isReceiverInsideChatRoom) {
        console.log("Emitting new message to: ", receiverId.toString());
        io.to(receiverId.toString()).emit("new-message-notification", message);
      }
    }
  };

  // Send message
  socket.on("send-message", handleSendMessage);

  // ------------------ Message Reactions ------------------
  socket.on("react-message", async ({ conversationId, messageId, reaction }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      message.reaction = reaction || "";
      await message.save();
      io.to(conversationId).emit("message-reacted", { messageId, reaction: message.reaction });
    } catch (e) {
      console.error("react-message error", e);
    }
  });

  // ------------------ Edit Message ------------------
  socket.on("edit-message", async ({ conversationId, messageId, text }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;
      const trimmed = typeof text === "string" ? text.trim() : "";
      message.text = trimmed;
      await message.save();
      // Optionally update latestmessage
      const conv = await Conversation.findById(conversationId);
      if (conv && conv.latestmessage && message.senderId) {
        conv.latestmessage = trimmed || conv.latestmessage;
        await conv.save();
      }
      io.to(conversationId).emit("message-edited", { messageId, text: message.text });
    } catch (e) {
      console.error("edit-message error", e);
    }
  });

  // ------------------ Broadcast existing message (e.g., after REST upload) ------------------
  socket.on("broadcast-existing-message", async ({ message, receiverId }) => {
    try {
      if (!message?.conversationId) return;
      const conversationId = message.conversationId.toString();
      // Emit to room
      io.to(conversationId).emit("receive-message", message);

      // Notify receiver if outside chat room
      const receiverPersonalRoom = io.sockets.adapter.rooms.get(
        receiverId?.toString()
      );
      let isReceiverInsideChatRoom = false;
      if (receiverPersonalRoom) {
        const receiverSid = Array.from(receiverPersonalRoom)[0];
        isReceiverInsideChatRoom = io.sockets.adapter.rooms
          .get(conversationId)
          ?.has(receiverSid);
      }

      if (!isReceiverInsideChatRoom) {
        io.to(receiverId.toString()).emit("new-message-notification", message);
        const conv = await Conversation.findById(conversationId);
        if (conv) {
          conv.latestmessage = message.text || message.imageUrl ? "📷 Photo" : (message.audioUrl ? "🎤 Voice message" : (message.videoUrl ? "🎬 Video" : conv.latestmessage));
          conv.unreadCounts?.forEach((u) => {
            if (u.userId.toString() === receiverId.toString()) {
              u.count += 1;
            }
          });
          await conv.save();
        }
      }
    } catch (e) {
      console.error("broadcast-existing-message error", e);
    }
  });

  // ------------------ Delivery receipts ------------------
  socket.on("message-delivered-ack", async ({ messageId, userId, conversationId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (!msg.deliveredTo?.find((u) => u.toString() === userId.toString())) {
        msg.deliveredTo = [...(msg.deliveredTo || []), userId];
        await msg.save();
      }
      io.to(conversationId.toString()).emit("message-delivered", { messageId, userId });
    } catch (e) {
      console.error("message-delivered-ack error", e);
    }
  });

  const handleDeleteMessage = async (data) => {
    const { messageId, deleteFrom, conversationId } = data;
    const deleted = await deleteMessageHandler({ messageId, deleteFrom });
    if (deleted && deleteFrom.length > 1) {
      io.to(conversationId).emit("message-deleted", data);
    }
  };

  // Send message
  socket.on("delete-message", handleDeleteMessage);

  // Typing indicator
  socket.on("typing", (data) => {
    io.to(data.conversationId).emit("typing", data);
  });

  // Stop typing indicator
  socket.on("stop-typing", (data) => {
    io.to(data.conversationId).emit("stop-typing", data);
  });

  // ------------------ Paint Collaboration ------------------
  // Join/leave a paint room (separate namespace-like room keys)
  socket.on("paint:join", ({ roomId }) => {
    try {
      if (!roomId) return;
      const room = `paint:${roomId}`;
      socket.join(room);
      socket.emit("paint:joined", { roomId });
    } catch (e) { console.error("paint:join error", e); }
  });
  socket.on("paint:leave", ({ roomId }) => {
    try {
      if (!roomId) return;
      const room = `paint:${roomId}`;
      socket.leave(room);
      socket.emit("paint:left", { roomId });
    } catch (e) { console.error("paint:leave error", e); }
  });
  // Broadcast operations to peers in same room (excluding sender)
  socket.on("paint:op", ({ roomId, op }) => {
    try {
      if (!roomId || !op) return;
      const room = `paint:${roomId}`;
      socket.to(room).emit("paint:op", { op, from: socket.id });
    } catch (e) { console.error("paint:op error", e); }
  });
  // Optional cursor broadcast for presence
  socket.on("paint:cursor", ({ roomId, cursor }) => {
    try {
      if (!roomId || !cursor) return;
      const room = `paint:${roomId}`;
      socket.to(room).emit("paint:cursor", { cursor, from: socket.id });
    } catch (e) { console.error("paint:cursor error", e); }
  });

  // ------------------ Meetings (WebRTC + features) ------------------
  socket.on('meeting:join', ({ roomId, userId, name, passcode }) => {
    try {
      if (!roomId || !userId) return;
  const room = `meet:${roomId}`;
      socket.join(room);
  const state = meetings.get(room) || { hostUserId: null, locked: false, lobby: false, passcode: '', muteOnJoin: false, spotlight: null, recording: new Set(), allowChat: true, allowReactions: true, allowScreenShare: true, allowLocalRecording: true, participants: new Map(), waiting: new Map(), polls: new Map() };
      // first user becomes host
      if (!state.hostUserId) state.hostUserId = userId;
      // passcode check (if set and not host)
      if (state.passcode && userId !== state.hostUserId) {
        if (!passcode || passcode !== state.passcode) {
          socket.emit('meeting:join-denied', { reason: 'passcode' });
          return;
        }
      }
      // lock or lobby => waiting room for non-host
      if ((state.locked || state.lobby) && userId !== state.hostUserId) {
        state.waiting.set(userId, name||'');
        meetings.set(room, state);
        // notify host about waiting list
        io.to(room).emit('meeting:waiting', Array.from(state.waiting.entries()).map(([id, nm])=>({ userId:id, name:nm })));
        socket.emit('meeting:waiting-you');
        return;
      }
      // admit as participant
      if (!state.participants.has(userId)) state.participants.set(userId, { role: state.hostUserId === userId ? 'host' : 'guest', muted: !!state.muteOnJoin, name: name||'' });
  meetings.set(room, state);
  io.to(room).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
  // send existing polls snapshot to the joining user
  const polls = Array.from(state.polls.values()).map(p=>({ id: p.id, question: p.question, options: p.options.map(o=>({ text:o.text, votes: o.voters.size })), closed: !!p.closed }));
  socket.emit('meeting:polls', { polls });
  // emit current config snapshot to the joining user
  socket.emit('meeting:config-updated', { lobby: state.lobby, locked: state.locked, hasPasscode: !!state.passcode, muteOnJoin: !!state.muteOnJoin, allowChat: !!state.allowChat, allowReactions: !!state.allowReactions, allowScreenShare: !!state.allowScreenShare, allowLocalRecording: !!state.allowLocalRecording });
  // send spotlight + recording snapshot to the joining user
  socket.emit('meeting:spotlight', { userId: state.spotlight || null });
  socket.emit('meeting:recording-list', { list: Array.from(state.recording.values()) });
      socket.to(room).emit('meeting:user-joined', { userId, name });
      if (state.muteOnJoin && userId !== state.hostUserId) io.to(room).emit('meeting:muted', { userId });
    } catch(e) { console.error('meeting:join', e); }
  });
  socket.on('meeting:leave', ({ roomId, userId }) => {
    try {
      const room = `meet:${roomId}`;
      socket.leave(room);
      const state = meetings.get(room);
      if (state) {
        state.participants.delete(userId);
        // remove from recording set if present
        if (state.recording?.has(userId)) {
          state.recording.delete(userId);
          io.to(room).emit('meeting:recording', { userId, on: false });
        }
        // clear spotlight if the user leaving was spotlighted
        if (state.spotlight === userId) {
          state.spotlight = null;
          io.to(room).emit('meeting:spotlight', { userId: null });
        }
        io.to(room).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
        socket.to(room).emit('meeting:user-left', { userId });
      }
    } catch(e) { console.error('meeting:leave', e); }
  });
  // WebRTC signaling inside meeting room
  socket.on('meeting:offer', ({ roomId, toUserId, fromUserId, sdp }) => {
    io.to(`meet:${roomId}`).emit('meeting:offer', { toUserId, fromUserId, sdp });
  });
  socket.on('meeting:answer', ({ roomId, toUserId, fromUserId, sdp }) => {
    io.to(`meet:${roomId}`).emit('meeting:answer', { toUserId, fromUserId, sdp });
  });
  socket.on('meeting:ice', ({ roomId, toUserId, fromUserId, candidate }) => {
    io.to(`meet:${roomId}`).emit('meeting:ice', { toUserId, fromUserId, candidate });
  });
  // Chat & reactions in meeting
  socket.on('meeting:chat', ({ roomId, userId, text }) => {
    const key = `meet:${roomId}`; const state = meetings.get(key);
    if (state && !state.allowChat && !(state.participants.get(userId)?.role==='host' || state.participants.get(userId)?.role==='cohost')) return;
    io.to(key).emit('meeting:chat', { userId, text, ts: Date.now() });
  });
  socket.on('meeting:reaction', ({ roomId, userId, emoji }) => {
    const key = `meet:${roomId}`; const state = meetings.get(key);
    if (state && !state.allowReactions && !(state.participants.get(userId)?.role==='host' || state.participants.get(userId)?.role==='cohost')) return;
    io.to(key).emit('meeting:reaction', { userId, emoji, ts: Date.now() });
  });
  socket.on('meeting:hand', ({ roomId, userId, up }) => {
    io.to(`meet:${roomId}`).emit('meeting:hand', { userId, up: !!up });
  });
  socket.on('meeting:mute-all', ({ roomId, byUserId }) => {
    const state = meetings.get(`meet:${roomId}`);
    if (state && (state.hostUserId === byUserId || ['host','cohost'].includes(state.participants.get(byUserId)?.role))) {
      state.participants.forEach((v,k)=> v.muted = true);
      io.to(`meet:${roomId}`).emit('meeting:muted-all', { byUserId });
    }
  });

  // Live captions relay (client-side speech recognition)
  socket.on('meeting:caption', ({ roomId, userId, text }) => {
    try {
      if (!roomId || !userId || typeof text !== 'string') return;
      io.to(`meet:${roomId}`).emit('meeting:caption', { userId, text });
    } catch(e) { console.error('meeting:caption', e); }
  });

  // Host config: set lobby/passcode/lock
  socket.on('meeting:config', ({ roomId, byUserId, lobby, passcode, locked, muteOnJoin, allowChat, allowReactions, allowScreenShare, allowLocalRecording }) => {
    try {
  const key = `meet:${roomId}`;
      const state = meetings.get(key) || { hostUserId: byUserId, locked: false, lobby: false, passcode: '', muteOnJoin: false, spotlight: null, recording: new Set(), allowChat: true, allowReactions: true, allowScreenShare: true, allowLocalRecording: true, participants: new Map(), waiting: new Map(), polls: new Map() };
      if (state.hostUserId !== byUserId && state.participants.get(byUserId)?.role !== 'host') return;
      if (typeof lobby === 'boolean') state.lobby = lobby;
      if (typeof locked === 'boolean') state.locked = locked;
      if (typeof passcode === 'string') state.passcode = passcode;
  if (typeof muteOnJoin === 'boolean') state.muteOnJoin = muteOnJoin;
      if (typeof allowChat === 'boolean') state.allowChat = allowChat;
      if (typeof allowReactions === 'boolean') state.allowReactions = allowReactions;
      if (typeof allowScreenShare === 'boolean') state.allowScreenShare = allowScreenShare;
      if (typeof allowLocalRecording === 'boolean') state.allowLocalRecording = allowLocalRecording;
      meetings.set(key, state);
      io.to(key).emit('meeting:config-updated', { lobby: state.lobby, locked: state.locked, hasPasscode: !!state.passcode, muteOnJoin: !!state.muteOnJoin, allowChat: !!state.allowChat, allowReactions: !!state.allowReactions, allowScreenShare: !!state.allowScreenShare, allowLocalRecording: !!state.allowLocalRecording });
    } catch(e) { console.error('meeting:config', e); }
  });

  // ------------------ Spotlight & Recording Indicators ------------------
  // Host/cohost sets spotlight target (null clears)
  socket.on('meeting:spotlight-set', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      const target = userId || null;
      if (target && !state.participants.has(target)) return;
      state.spotlight = target; meetings.set(key, state);
      io.to(key).emit('meeting:spotlight', { userId: target });
    } catch(e) { console.error('meeting:spotlight-set', e); }
  });

  // Any participant can advertise their local recording status
  socket.on('meeting:recording', ({ roomId, userId, on }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return; if (!state.participants.has(userId)) return;
      if (!state.allowLocalRecording && !(state.participants.get(userId)?.role==='host' || state.participants.get(userId)?.role==='cohost')) return;
      if (!state.recording) state.recording = new Set();
      if (on) state.recording.add(userId); else state.recording.delete(userId);
      meetings.set(key, state);
      io.to(key).emit('meeting:recording', { userId, on: !!on });
    } catch(e) { console.error('meeting:recording', e); }
  });

  // ------------------ Meeting Polls ------------------
  socket.on('meeting:poll-create', ({ roomId, byUserId, id, question, options }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      if (!id) id = Math.random().toString(36).slice(2,9);
      const poll = { id, question: String(question||'').slice(0,200), options: (options||[]).slice(0,8).map(t=>({ text:String(t).slice(0,100), voters: new Set() })), closed: false };
      state.polls.set(id, poll); meetings.set(key, state);
      const payload = { id: poll.id, question: poll.question, options: poll.options.map(o=>({ text:o.text, votes:o.voters.size })), closed: poll.closed };
      io.to(key).emit('meeting:polls', { polls: Array.from(state.polls.values()).map(p=>({ id: p.id, question: p.question, options: p.options.map(o=>({ text:o.text, votes:o.voters.size })), closed: !!p.closed })) });
    } catch(e) { console.error('meeting:poll-create', e); }
  });
  socket.on('meeting:poll-vote', ({ roomId, userId, pollId, option }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return; const poll = state.polls.get(pollId); if (!poll || poll.closed) return;
      if (typeof option !== 'number' || option<0 || option>=poll.options.length) return;
      // remove any prior vote
      poll.options.forEach(o => o.voters.delete(userId));
      poll.options[option].voters.add(userId); meetings.set(key, state);
      io.to(key).emit('meeting:polls', { polls: Array.from(state.polls.values()).map(p=>({ id: p.id, question: p.question, options: p.options.map(o=>({ text:o.text, votes:o.voters.size })), closed: !!p.closed })) });
    } catch(e) { console.error('meeting:poll-vote', e); }
  });
  socket.on('meeting:poll-close', ({ roomId, byUserId, pollId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      const poll = state.polls.get(pollId); if (!poll) return;
      poll.closed = true; meetings.set(key, state);
      io.to(key).emit('meeting:polls', { polls: Array.from(state.polls.values()).map(p=>({ id: p.id, question: p.question, options: p.options.map(o=>({ text:o.text, votes:o.voters.size })), closed: !!p.closed })) });
    } catch(e) { console.error('meeting:poll-close', e); }
  });

  // Host admits a user from waiting room
  socket.on('meeting:admit', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
  if (state.waiting.has(userId)) state.waiting.delete(userId);
  if (!state.participants.has(userId)) state.participants.set(userId, { role: 'guest', muted: !!state.muteOnJoin, name: '' });
      meetings.set(key, state);
  io.to(key).emit('meeting:waiting', Array.from(state.waiting.entries()).map(([id, nm])=>({ userId:id, name:nm })));
      io.to(key).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
      io.to(key).emit('meeting:admitted', { userId });
  if (state.muteOnJoin) io.to(key).emit('meeting:muted', { userId });
    } catch(e) { console.error('meeting:admit', e); }
  });

  // Host/cohost denies a user in waiting room
  socket.on('meeting:deny', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      if (state.waiting.has(userId)) state.waiting.delete(userId);
      meetings.set(key, state);
      io.to(key).emit('meeting:waiting', Array.from(state.waiting.entries()).map(([id, nm])=>({ userId:id, name:nm })));
      io.to(key).emit('meeting:denied', { userId, reason: 'denied' });
    } catch(e) { console.error('meeting:deny', e); }
  });

  // Host kicks a participant
  socket.on('meeting:kick', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      state.participants.delete(userId);
      meetings.set(key, state);
      io.to(key).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
      io.to(key).emit('meeting:kicked', { userId });
    } catch(e) { console.error('meeting:kick', e); }
  });

  // Host mutes a specific participant (soft signal)
  socket.on('meeting:mute', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      const p = state.participants.get(userId); if (!p) return;
      p.muted = true; meetings.set(key, state);
      io.to(key).emit('meeting:muted', { userId });
    } catch(e) { console.error('meeting:mute', e); }
  });

  // Host sets participant role (guest <-> cohost)
  socket.on('meeting:role', ({ roomId, byUserId, userId, role }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && state.participants.get(byUserId)?.role !== 'host') return;
      const p = state.participants.get(userId); if (!p) return;
      if (!['guest','cohost'].includes(role)) return;
      p.role = role; meetings.set(key, state);
      io.to(key).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
    } catch(e) { console.error('meeting:role', e); }
  });

  // Host ends meeting for all
  socket.on('meeting:end', ({ roomId, byUserId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && state.participants.get(byUserId)?.role !== 'host') return;
      io.to(key).emit('meeting:ended', { byUserId });
      meetings.delete(key);
    } catch(e) { console.error('meeting:end', e); }
  });

  // Host transfers host role to another participant
  socket.on('meeting:transfer-host', ({ roomId, byUserId, userId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId) return; // only current host
      const target = state.participants.get(userId); if (!target) return;
      // demote old host to cohost (keeps moderation powers)
      const oldHost = state.participants.get(byUserId);
      if (oldHost) oldHost.role = 'cohost';
      state.hostUserId = userId;
      target.role = 'host';
      meetings.set(key, state);
      io.to(key).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
      io.to(key).emit('meeting:host-changed', { userId });
    } catch(e) { console.error('meeting:transfer-host', e); }
  });

  // Host/cohost admits all waiting users
  socket.on('meeting:admit-all', ({ roomId, byUserId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      const toAdmit = Array.from(state.waiting.keys());
      toAdmit.forEach(uid => {
        state.waiting.delete(uid);
        if (!state.participants.has(uid)) state.participants.set(uid, { role: 'guest', muted: !!state.muteOnJoin, name: '' });
      });
      meetings.set(key, state);
      io.to(key).emit('meeting:waiting', Array.from(state.waiting.entries()).map(([id, nm])=>({ userId:id, name:nm })));
      io.to(key).emit('meeting:participants', Array.from(state.participants.entries()).map(([id, v])=>({ userId:id, ...v })));
      toAdmit.forEach(uid => io.to(key).emit('meeting:admitted', { userId: uid }));
      if (state.muteOnJoin) toAdmit.forEach(uid => io.to(key).emit('meeting:muted', { userId: uid }));
    } catch(e) { console.error('meeting:admit-all', e); }
  });

  // Host/cohost lower all hands
  socket.on('meeting:lower-all-hands', ({ roomId, byUserId }) => {
    try {
      const key = `meet:${roomId}`; const state = meetings.get(key);
      if (!state) return;
      if (state.hostUserId !== byUserId && !['host','cohost'].includes(state.participants.get(byUserId)?.role)) return;
      // Broadcast down hand for all participants
      state.participants.forEach((_, uid) => {
        io.to(key).emit('meeting:hand', { userId: uid, up: false });
      });
    } catch(e) { console.error('meeting:lower-all-hands', e); }
  });

  // Disconnect
  socket.on("disconnect", async () => {
    console.log("A user disconnected", currentUserId, socket.id);
    try {
      await User.findByIdAndUpdate(currentUserId, {
        isOnline: false,
        lastSeen: new Date(),
      });
    } catch (error) {
      console.error("Error updating user status on disconnect:", error);
    }

    const conversations = await Conversation.find({
      members: { $in: [currentUserId] },
    });

    conversations.forEach((conversation) => {
      const sock = io.sockets.adapter.rooms.get(conversation.id);
      if (sock) {
        console.log("Other user is offline is sent to: ", currentUserId);
        io.to(conversation.id).emit("receiver-offline", {});
      }
    });
  });

  // ------------------ Music Rooms (Shared Queue) ------------------
  const musicKey = (roomId) => `music:${roomId}`;
  socket.on('music:create', async ({ roomId, userId, pin }) => {
    try {
      if (!roomId || !userId) return;
      const key = musicKey(roomId);
      if (musicRooms.has(key)) { socket.emit('music:create-resp', { ok: false, reason: 'exists' }); return; }
      const state = { queue: [], idx: -1, paused: true, ts: Date.now(), lastSeek: 0, host: userId, members: new Set([userId]), pin: pin||'', moderators: new Set([userId]), config: { allowAllReorder: true, allowAllControl: true } };
      musicRooms.set(key, state);
      socket.join(key);
      try { await MusicRoom.create({ roomId, hostUserId: userId, pin: pin||'', moderators: [userId], queue: [], idx: -1, paused: true, lastSeek: 0, ts: Date.now(), config: { allowAllReorder: true, allowAllControl: true } }); } catch (_) {}
      socket.emit('music:create-resp', { ok: true });
      io.to(key).emit('music:state', { queue: state.queue, idx: state.idx, paused: state.paused, ts: state.ts, lastSeek: state.lastSeek, host: state.host });
    } catch(e) { console.error('music:create', e); }
  });
  socket.on('music:join', async ({ roomId, userId, pin }) => {
    try {
      if (!roomId || !userId) return;
      const key = musicKey(roomId);
      socket.join(key);
      let state = musicRooms.get(key);
      if (!state) {
        // hydrate from DB if present
        try {
          const doc = await MusicRoom.findOne({ roomId });
          if (doc) {
            state = { queue: (doc.queue||[]).map((id)=> id.toString()), idx: doc.idx ?? -1, paused: !!doc.paused, ts: doc.ts || Date.now(), lastSeek: doc.lastSeek || 0, host: doc.hostUserId || userId, members: new Set(), pin: doc.pin||'', moderators: new Set(doc.moderators||[]), config: { allowAllReorder: doc.config?.allowAllReorder !== undefined ? !!doc.config.allowAllReorder : true, allowAllControl: doc.config?.allowAllControl !== undefined ? !!doc.config.allowAllControl : true } };
          } else {
            state = { queue: [], idx: -1, paused: true, ts: Date.now(), lastSeek: 0, host: userId, members: new Set(), pin: '', moderators: new Set([userId]), config: { allowAllReorder: true, allowAllControl: true } };
          }
        } catch (e) {
          state = { queue: [], idx: -1, paused: true, ts: Date.now(), lastSeek: 0, host: userId, members: new Set(), pin: '', moderators: new Set([userId]), config: { allowAllReorder: true, allowAllControl: true } };
        }
        musicRooms.set(key, state);
      }
      // PIN enforcement for non-mods
      if (state.pin && !state.moderators.has(userId)) {
        if (!pin || pin !== state.pin) { socket.emit('music:join-denied', { reason: 'pin' }); return; }
      }
      state.members.add(userId);
      if (!state.host) state.host = userId;
      io.to(key).emit('music:state', { queue: state.queue, idx: state.idx, paused: state.paused, ts: state.ts, lastSeek: state.lastSeek, host: state.host });
      // send snapshots to the joining client
      try {
        socket.emit('music:config', state.config || { allowAllReorder: true, allowAllControl: true });
        if (state.moderators) socket.emit('music:moderators', { list: Array.from(state.moderators.values()) });
        socket.emit('music:pin-updated', { hasPin: !!state.pin });
      } catch (_) {}
    } catch(e) { console.error('music:join', e); }
  });
  socket.on('music:leave', ({ roomId, userId }) => {
    try {
      const key = musicKey(roomId);
      socket.leave(key);
      const state = musicRooms.get(key);
      if (!state) return;
      state.members.delete(userId);
      if (state.host === userId) {
        // prefer a moderator as new host
        const modCandidate = Array.from(state.moderators || []).find(uid => state.members.has(uid));
        state.host = modCandidate || Array.from(state.members.values())[0] || null;
      }
      if (state.members.size === 0) {
        musicRooms.delete(key);
      } else {
        io.to(key).emit('music:state', { queue: state.queue, idx: state.idx, paused: state.paused, ts: state.ts, lastSeek: state.lastSeek, host: state.host });
      }
    } catch(e) { console.error('music:leave', e); }
  });
  // Host sets/clears PIN
  socket.on('music:pin-set', async ({ roomId, byUserId, pin }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s.host !== byUserId && !s.moderators?.has(byUserId)) return;
      s.pin = String(pin||'');
      musicRooms.set(key, s);
      try { await MusicRoom.updateOne({ roomId }, { $set: { pin: s.pin } }, { upsert: true }); } catch (_) {}
      io.to(key).emit('music:pin-updated', { hasPin: !!s.pin });
    } catch(e) { console.error('music:pin-set', e); }
  });
  // Host manages moderators
  socket.on('music:mod-add', async ({ roomId, byUserId, userId }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s.host !== byUserId) return; // only host
      if (!s.moderators) s.moderators = new Set();
      s.moderators.add(userId);
      try { await MusicRoom.updateOne({ roomId }, { $addToSet: { moderators: userId } }); } catch (_) {}
      io.to(key).emit('music:moderators', { list: Array.from(s.moderators.values()) });
    } catch(e) { console.error('music:mod-add', e); }
  });
  socket.on('music:mod-remove', async ({ roomId, byUserId, userId }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s.host !== byUserId) return; // only host
      if (!s.moderators) s.moderators = new Set();
      s.moderators.delete(userId);
      try { await MusicRoom.updateOne({ roomId }, { $pull: { moderators: userId } }); } catch (_) {}
      io.to(key).emit('music:moderators', { list: Array.from(s.moderators.values()) });
    } catch(e) { console.error('music:mod-remove', e); }
  });
  socket.on('music:enqueue', async ({ roomId, userId, trackId }) => {
    try {
      const key = musicKey(roomId); const state = musicRooms.get(key); if (!state) return;
      if (state?.config && state.config.allowAllControl === false) {
        if (!(state.host === userId || state.moderators?.has(userId))) return;
      }
    state.queue.push(trackId); io.to(key).emit('music:queue', { queue: state.queue });
    try { await MusicRoom.updateOne({ roomId }, { $set: { queue: state.queue } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:enqueue', e); }
  });
  socket.on('music:queue-set', async ({ roomId, userId, queue, index }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllReorder === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
      if (Array.isArray(queue)) s.queue = queue.slice();
      if (typeof index === 'number') s.idx = index;
      io.to(key).emit('music:state', { queue: s.queue, idx: s.idx, paused: s.paused, ts: s.ts, lastSeek: s.lastSeek, host: s.host });
    try { await MusicRoom.updateOne({ roomId }, { $set: { queue: s.queue, idx: s.idx } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:queue-set', e); }
  });
  socket.on('music:queue-clear', async ({ roomId, userId }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllReorder === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
    s.queue = []; s.idx = -1; io.to(key).emit('music:queue', { queue: s.queue });
    try { await MusicRoom.updateOne({ roomId }, { $set: { queue: [], idx: -1 } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:queue-clear', e); }
  });
  socket.on('music:dequeue', async ({ roomId, userId, index }) => {
    try {
      const key = musicKey(roomId); const state = musicRooms.get(key); if (!state) return;
      if (state?.config && state.config.allowAllReorder === false) {
        if (!(state.host === userId || state.moderators?.has(userId))) return;
      }
      if (typeof index !== 'number' || index<0 || index>=state.queue.length) return;
      state.queue.splice(index,1);
      if (state.idx >= state.queue.length) state.idx = state.queue.length-1;
    io.to(key).emit('music:queue', { queue: state.queue });
    try { await MusicRoom.updateOne({ roomId }, { $set: { queue: state.queue, idx: state.idx } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:dequeue', e); }
  });
  socket.on('music:reorder', async ({ roomId, userId, from, to }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllReorder === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
      if ([from,to].some(v=> typeof v !== 'number' || v<0 || v>=s.queue.length)) return;
      const [it] = s.queue.splice(from,1); s.queue.splice(to,0,it);
    io.to(key).emit('music:queue', { queue: s.queue });
    try { await MusicRoom.updateOne({ roomId }, { $set: { queue: s.queue } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:reorder', e); }
  });
  socket.on('music:play', async ({ roomId, userId, index }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllControl === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
  if (typeof index === 'number') s.idx = index;
      s.paused = false; s.ts = Date.now(); s.lastSeek = 0;
      io.to(key).emit('music:state', { queue: s.queue, idx: s.idx, paused: s.paused, ts: s.ts, lastSeek: s.lastSeek, host: s.host });
    try { await MusicRoom.updateOne({ roomId }, { $set: { idx: s.idx, paused: s.paused, ts: s.ts, lastSeek: s.lastSeek } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:play', e); }
  });
  socket.on('music:pause', async ({ roomId, userId, position }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllControl === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
      s.paused = true; s.ts = Date.now(); s.lastSeek = typeof position==='number'? position : s.lastSeek;
      io.to(key).emit('music:state', { queue: s.queue, idx: s.idx, paused: s.paused, ts: s.ts, lastSeek: s.lastSeek, host: s.host });
    try { await MusicRoom.updateOne({ roomId }, { $set: { paused: s.paused, ts: s.ts, lastSeek: s.lastSeek } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:pause', e); }
  });
  socket.on('music:seek', async ({ roomId, userId, position }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s?.config && s.config.allowAllControl === false) {
        if (!(s.host === userId || s.moderators?.has(userId))) return;
      }
      s.lastSeek = typeof position==='number'? position : 0; s.ts = Date.now();
      io.to(key).emit('music:seek', { position: s.lastSeek, ts: s.ts });
    try { await MusicRoom.updateOne({ roomId }, { $set: { lastSeek: s.lastSeek, ts: s.ts } }, { upsert: true }); } catch (_) {}
    } catch(e) { console.error('music:seek', e); }
  });
  // Room config (permissions)
  socket.on('music:config', async ({ roomId, byUserId, allowAllReorder, allowAllControl }) => {
    try {
      const key = musicKey(roomId); const s = musicRooms.get(key); if (!s) return;
      if (s.host !== byUserId && !s.moderators?.has(byUserId)) return;
      s.config = s.config || { allowAllReorder: true, allowAllControl: true };
      if (typeof allowAllReorder === 'boolean') s.config.allowAllReorder = allowAllReorder;
      if (typeof allowAllControl === 'boolean') s.config.allowAllControl = allowAllControl;
      try { await MusicRoom.updateOne({ roomId }, { $set: { config: s.config } }, { upsert: true }); } catch (_) {}
      io.to(key).emit('music:config', s.config);
    } catch(e) { console.error('music:config', e); }
  });
};
