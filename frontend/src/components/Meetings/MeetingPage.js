import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, HStack, VStack, Text, Input, Select, useToast, Badge, Divider, Tabs, TabList, TabPanels, Tab, TabPanel, Tooltip } from '@chakra-ui/react';
import { PhoneIcon } from '@chakra-ui/icons';
import chatContext from '../../context/chatContext';

const uid = () => Math.random().toString(36).slice(2);

export default function MeetingPage() {
  const toast = useToast();
  const socket = typeof window !== 'undefined' ? window.__appSocket : null;
  const { hostName } = useContext(chatContext);
  const [roomId, setRoomId] = useState('');
  const [joined, setJoined] = useState(false);
  const [name, setName] = useState('');
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [devices, setDevices] = useState({ cams: [], mics: [], speakers: []});
  const [settings, setSettings] = useState({ cam: '', mic: '', speaker: ''});
  const [localStream, setLocalStream] = useState(null);
  const localVideoRef = useRef(null);
  const [myId] = useState(uid());
  const peersRef = useRef(new Map()); // userId -> RTCPeerConnection
  const remoteStreamsRef = useRef(new Map()); // userId -> MediaStream
  const [participants, setParticipants] = useState([]);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const screenTrackRef = useRef(null);
  const [reactions, setReactions] = useState([]);
  const [hands, setHands] = useState({});
  const [needPasscode, setNeedPasscode] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingList, setWaitingList] = useState([]); // userIds
  const [config, setConfig] = useState({ lobby: false, locked: false, hasPasscode: false, muteOnJoin: false });
  const [levels, setLevels] = useState({}); // userId -> volume level
  const analyserMapRef = useRef(new Map()); // userId -> analyser
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const [captions, setCaptions] = useState({}); // userId -> { text, ts }
  const localAnalyserRef = useRef(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const [enhance, setEnhance] = useState({ noiseSuppression: true, echoCancellation: true, autoGainControl: true });
  const pushToTalkRef = useRef({ active: false, prev: true });
  const [polls, setPolls] = useState([]);
  const [pollQ, setPollQ] = useState('');
  const [pollOpts, setPollOpts] = useState(['','']);
  const [spotlightUserId, setSpotlightUserId] = useState(null);
  const [recordingUsers, setRecordingUsers] = useState([]);
  const [mirrorLocal, setMirrorLocal] = useState(true);
  const [layoutMode, setLayoutMode] = useState('grid'); // 'grid' | 'speaker'
  const [pinnedUserId, setPinnedUserId] = useState(null); // local-only pin
  const [hideSelf, setHideSelf] = useState(false); // hide local tile in UI only
  const [netQual, setNetQual] = useState({}); // userId -> 0..4

  // Discover devices
  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices?.().then(list => {
      const cams = list.filter(d=>d.kind==='videoinput');
      const mics = list.filter(d=>d.kind==='audioinput');
      const speakers = list.filter(d=>d.kind==='audiooutput');
      setDevices({ cams, mics, speakers });
      setSettings(s => ({ cam: s.cam || cams[0]?.deviceId || '', mic: s.mic || mics[0]?.deviceId || '', speaker: s.speaker || speakers[0]?.deviceId || '' }));
    }).catch(()=>{});
  }, []);

  // Read URL params for room and passcode
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const r = params.get('room');
      const p = params.get('code');
      if (r) setRoomId(r);
      if (p) setPasscode(p);
    } catch {}
  }, []);

  const buildAudioConstraints = () => {
    const base = settings.mic ? { deviceId: { exact: settings.mic } } : true;
    if (base === true) return base;
    return {
      ...base,
      noiseSuppression: enhance.noiseSuppression,
      echoCancellation: enhance.echoCancellation,
      autoGainControl: enhance.autoGainControl,
    };
  };

  const startPreview = async () => {
    try {
      if (localStream) { localStream.getTracks().forEach(t=>t.stop()); }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: settings.cam ? { deviceId: { exact: settings.cam } } : true,
        audio: buildAudioConstraints()
      });
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      // If already joined, replace tracks in all peer connections
      if (joined) {
        const v = stream.getVideoTracks()[0];
        const a = stream.getAudioTracks()[0];
        peersRef.current.forEach(pc => {
          try {
            if (v) { const vs = pc.getSenders().find(s=>s.track?.kind==='video'); if (vs) vs.replaceTrack(v); }
            if (a) { const as = pc.getSenders().find(s=>s.track?.kind==='audio'); if (as) as.replaceTrack(a); }
          } catch {}
        });
      }
    } catch (e) {
      toast({ title: 'Camera/Mic error', status: 'error' });
    }
  };

  useEffect(() => { startPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.cam, settings.mic, enhance.noiseSuppression, enhance.echoCancellation, enhance.autoGainControl]);

  // Ensure local video element always has the current stream, even after UI switches (e.g., pre-join -> in-call)
  useEffect(() => {
    try {
      if (localVideoRef.current && localStream) {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
        }
    if (typeof localVideoRef.current.play === 'function') { localVideoRef.current.play().catch(()=>{}); }
      }
    } catch {}
  }, [localStream, joined]);

  // Also try to resume playback when camera on/off changes
  useEffect(() => { try { if (localVideoRef.current && typeof localVideoRef.current.play==='function') localVideoRef.current.play().catch(()=>{}); } catch {} }, [camOn]);

  const join = () => {
    if (!roomId) return;
    if (!socket) { toast({ title: 'Socket unavailable', status: 'error' }); return; }
    socket.emit('meeting:join', { roomId, userId: myId, name: name||'Guest', passcode: passcode || undefined });
    setJoined(true);
  };

  const createRoom = async () => {
    try {
      const res = await fetch(`${hostName}/meeting`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
        body: JSON.stringify({ title: 'Meeting', lobby: false, locked: false })
      });
      if (!res.ok) throw new Error('Create failed');
      const data = await res.json();
      const id = data.roomId || data.roomid || data.room || data._id || Math.random().toString(36).slice(2,9);
      setRoomId(id);
      toast({ title: `Room created: ${id}`, status: 'success' });
      const url = `${window.location.origin}/meet?room=${encodeURIComponent(id)}`;
      await navigator.clipboard?.writeText(url);
      toast({ title: 'Invite link copied', status: 'info' });
    } catch { toast({ title: 'Could not create room', status: 'error' }); }
  };

  useEffect(()=>{
    if (!socket) return;
    const onChat = (m) => setChat(c => [...c, m].slice(-200));
    const onParticipants = (list) => setParticipants(list);
    const onReaction = (r) => {
      setReactions(arr => [...arr, r].slice(-50));
      setTimeout(() => setReactions(arr => arr.filter(x => x !== r)), 3000);
    };
    const onHand = ({ userId, up }) => setHands(h => ({ ...h, [userId]: !!up }));
    const onMutedAll = () => {
      localStream?.getAudioTracks()?.forEach(t => t.enabled = false);
      setMicOn(false);
    };
    socket.on('meeting:participants', onParticipants);
    socket.on('meeting:chat', onChat);
    socket.on('meeting:reaction', onReaction);
    socket.on('meeting:hand', onHand);
    socket.on('meeting:muted-all', onMutedAll);
    // new events
    const onDenied = ({ reason }) => {
        if (reason === 'passcode') { setNeedPasscode(true); toast({ title: 'Passcode required or incorrect', status: 'warning' }); }
      };
      const onDeniedFromWaiting = ({ userId }) => { if (userId === myId) { toast({ title: 'You were denied by host', status: 'warning' }); leave(); } };
      socket.on('meeting:denied', onDeniedFromWaiting);
    const onWaitingYou = () => { setIsWaiting(true); toast({ title: 'Waiting for host to admit you', status: 'info' }); };
  const onWaiting = (list) => { setWaitingList(list || []); };
    const onAdmitted = ({ userId }) => { if (userId === myId) { setIsWaiting(false); } };
    const onMuted = ({ userId }) => { if (userId === myId) { localStream?.getAudioTracks()?.forEach(t=> t.enabled = false); setMicOn(false); toast({ title: 'Host muted you', status: 'info' }); } };
    const onKicked = ({ userId }) => { if (userId === myId) { toast({ title: 'You were removed by host', status: 'error' }); leave(); } };
  const onConfigUpdated = (c) => setConfig(prev => ({ ...prev, ...c }));
    socket.on('meeting:join-denied', onDenied);
    socket.on('meeting:waiting-you', onWaitingYou);
    socket.on('meeting:waiting', onWaiting);
    socket.on('meeting:admitted', onAdmitted);
    socket.on('meeting:muted', onMuted);
    socket.on('meeting:kicked', onKicked);
    socket.on('meeting:config-updated', onConfigUpdated);
    const onEnded = () => { toast({ title: 'Meeting ended by host', status: 'info' }); leave(); };
    socket.on('meeting:ended', onEnded);
    return ()=> {
      socket.off('meeting:participants', onParticipants);
      socket.off('meeting:chat', onChat);
      socket.off('meeting:reaction', onReaction);
      socket.off('meeting:hand', onHand);
      socket.off('meeting:muted-all', onMutedAll);
      socket.off('meeting:join-denied', onDenied);
      socket.off('meeting:waiting-you', onWaitingYou);
      socket.off('meeting:waiting', onWaiting);
      socket.off('meeting:admitted', onAdmitted);
      socket.off('meeting:muted', onMuted);
      socket.off('meeting:kicked', onKicked);
  socket.off('meeting:config-updated', onConfigUpdated);
  socket.off('meeting:denied', onDeniedFromWaiting);
      socket.off('meeting:ended', onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, localStream, myId, toast]);

  const sendMsg = () => {
    const text = msg.trim(); if (!text || !roomId) return;
    socket.emit('meeting:chat', { roomId, userId: myId, text });
    setMsg('');
  };

  // WebRTC basics (mesh)
  const rtcConfig = useMemo(() => ({ iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }), []);
  const ensurePeer = (otherId) => {
    if (peersRef.current.has(otherId)) return peersRef.current.get(otherId);
    const pc = new RTCPeerConnection(rtcConfig);
    localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));
    pc.ontrack = (ev) => {
      const [stream] = ev.streams; if (!stream) return;
      remoteStreamsRef.current.set(otherId, stream);
      // audio levels
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser(); analyser.fftSize = 256;
        src.connect(analyser);
        analyserMapRef.current.set(otherId, analyser);
      } catch {}
      setParticipants(list => list.slice());
    };
    pc.onicecandidate = (ev) => { if (ev.candidate) socket?.emit('meeting:ice', { roomId, toUserId: otherId, fromUserId: myId, candidate: ev.candidate }); };
    peersRef.current.set(otherId, pc);
    return pc;
  };

  // Initiate offers to peers (lexicographic initiator)
  useEffect(() => {
    if (!joined || !roomId || !socket) return;
    const others = participants.filter(p => p.userId !== myId);
    others.forEach(async (p) => {
      const otherId = p.userId;
      if (peersRef.current.has(otherId)) return;
      if (myId < otherId) {
        const pc = ensurePeer(otherId);
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('meeting:offer', { roomId, toUserId: otherId, fromUserId: myId, sdp: offer });
        } catch {}
      } else {
        ensurePeer(otherId);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, joined, roomId, socket, myId, localStream]);

  useEffect(() => {
    if (!socket) return;
    const onOffer = async ({ toUserId, fromUserId, sdp }) => {
      if (toUserId !== myId) return;
      const pc = ensurePeer(fromUserId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        if (pc.getSenders().length === 0 && localStream) localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('meeting:answer', { roomId, toUserId: fromUserId, fromUserId: myId, sdp: answer });
      } catch {}
    };
    const onAnswer = async ({ toUserId, fromUserId, sdp }) => {
      if (toUserId !== myId) return;
      const pc = peersRef.current.get(fromUserId); if (!pc) return;
      try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); } catch {}
    };
    const onIce = async ({ toUserId, fromUserId, candidate }) => {
      if (toUserId !== myId) return;
      const pc = peersRef.current.get(fromUserId); if (!pc) return;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    };
    socket.on('meeting:offer', onOffer);
    socket.on('meeting:answer', onAnswer);
    socket.on('meeting:ice', onIce);
    // captions
    const onCaption = ({ userId, text }) => {
      const entry = { text, ts: Date.now() };
      setCaptions(prev => ({ ...prev, [userId]: entry }));
      setChat(c => [...c, { userId, text: `[cc] ${text}` }]);
    };
    socket.on('meeting:caption', onCaption);
    const onPolls = ({ polls }) => { setPolls(polls||[]); };
    socket.on('meeting:polls', onPolls);
    // spotlight & recording indicators
    const onSpotlight = ({ userId }) => setSpotlightUserId(userId || null);
    const onRecording = ({ userId, on }) => setRecordingUsers(list => {
      const set = new Set(list); if (on) set.add(userId); else set.delete(userId); return Array.from(set);
    });
    const onRecordingList = ({ list }) => setRecordingUsers(Array.isArray(list) ? list : []);
    socket.on('meeting:spotlight', onSpotlight);
    socket.on('meeting:recording', onRecording);
    socket.on('meeting:recording-list', onRecordingList);
    return () => {
      socket.off('meeting:offer', onOffer);
      socket.off('meeting:answer', onAnswer);
      socket.off('meeting:ice', onIce);
      socket.off('meeting:caption', onCaption);
      socket.off('meeting:polls', onPolls);
      socket.off('meeting:spotlight', onSpotlight);
      socket.off('meeting:recording', onRecording);
      socket.off('meeting:recording-list', onRecordingList);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, myId, localStream, roomId]);

  // Auto-rejoin on socket reconnect if we were already joined
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      if (joined && roomId) {
        socket.emit('meeting:join', { roomId, userId: myId, name: name||'Guest', passcode: passcode || undefined });
      }
    };
    socket.on('connect', onConnect);
    return () => socket.off('connect', onConnect);
  }, [socket, joined, roomId, myId, name, passcode]);

  // Controls
  const toggleMic = () => { const next = !micOn; setMicOn(next); localStream?.getAudioTracks()?.forEach(t => t.enabled = next); };
  // Ensure the local <video> element has the current stream bound and is playing
  const ensureLocalVideoBound = React.useCallback(() => {
    try {
      const el = localVideoRef.current;
      if (!el) return;
      if (localStream && el.srcObject !== localStream) el.srcObject = localStream;
      if (typeof el.play === 'function') { el.play().catch(()=>{}); }
    } catch {}
  }, [localStream]);
  // When UI changes remount the local <video> (self-view toggle, layout, pin, spotlight), rebind the stream and play
  useEffect(() => {
    if (hideSelf) return; // nothing to show
    const raf = requestAnimationFrame(() => { try { ensureLocalVideoBound(); } catch {} });
    const t = setTimeout(() => { try { ensureLocalVideoBound(); } catch {} }, 50);
    return () => { try { cancelAnimationFrame(raf); clearTimeout(t); } catch {} };
  }, [hideSelf, layoutMode, pinnedUserId, spotlightUserId, localStream, ensureLocalVideoBound]);
  // Attach simple safety handlers to a video track
  const attachVideoTrackHandlers = React.useCallback((track) => {
    if (!track) return;
    try {
      track.onunmute = () => { ensureLocalVideoBound(); };
      track.onended = () => { /* handled by toggle flow */ };
    } catch {}
  }, [ensureLocalVideoBound]);
  const toggleCam = async () => {
    const next = !camOn; setCamOn(next);
    try {
      const cur = localStream?.getVideoTracks?.()[0];
      if (!next) { if (cur) cur.enabled = false; return; }
      // need to ensure a live track
      if (!cur || cur.readyState !== 'live') {
        const v = await navigator.mediaDevices.getUserMedia({ video: settings.cam ? { deviceId: { exact: settings.cam } } : true });
        const newTrack = v.getVideoTracks()[0];
        if (localStream) {
          localStream.getVideoTracks().forEach(t => { try { t.stop(); } catch {} localStream.removeTrack(t); });
          localStream.addTrack(newTrack);
        }
        peersRef.current.forEach(pc => { const sender = pc.getSenders().find(s=>s.track?.kind==='video'); if (sender) sender.replaceTrack(newTrack); });
        attachVideoTrackHandlers(newTrack);
        ensureLocalVideoBound();
      } else {
        cur.enabled = true; attachVideoTrackHandlers(cur); ensureLocalVideoBound();
      }
    } catch { toast({ title: 'Unable to access camera', status: 'error' }); }
  };
  const shareScreen = async () => {
    try {
  const disp = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const track = disp.getVideoTracks()[0];
      screenTrackRef.current = track;
      peersRef.current.forEach((pc) => { const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video'); if (sender) sender.replaceTrack(track); });
      track.onended = () => stopShare();
    } catch {}
  };
  const stopShare = () => {
    const rebindCam = async () => {
      try {
        let camTrack = localStream?.getVideoTracks?.()[0] || null;
        if (!camTrack || camTrack.readyState !== 'live') {
          const v = await navigator.mediaDevices.getUserMedia({ video: settings.cam ? { deviceId: { exact: settings.cam } } : true });
          camTrack = v.getVideoTracks()[0];
          if (localStream) {
            localStream.getVideoTracks().forEach(t => { try { t.stop(); } catch {} localStream.removeTrack(t); });
            localStream.addTrack(camTrack);
          }
        }
        peersRef.current.forEach((pc) => { const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video'); if (sender && camTrack) sender.replaceTrack(camTrack); });
        attachVideoTrackHandlers(camTrack);
        ensureLocalVideoBound();
      } catch {}
    };
    rebindCam();
    try { screenTrackRef.current?.stop(); } catch {}
    screenTrackRef.current = null;
  };
  const sendReaction = (emoji) => { if (!roomId) return; socket?.emit('meeting:reaction', { roomId, userId: myId, emoji }); };
  const toggleHand = () => { const up = !hands[myId]; socket?.emit('meeting:hand', { roomId, userId: myId, up }); setHands(h => ({ ...h, [myId]: up })); };
  const leave = useCallback(() => {
    try { socket?.emit('meeting:leave', { roomId, userId: myId }); } catch {}
    peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear();
    remoteStreamsRef.current.clear();
    localStream?.getTracks()?.forEach(t => t.stop());
    setJoined(false); setParticipants([]);
    setIsWaiting(false); setWaitingList([]);
  }, [socket, roomId, myId, localStream]);

  // Active speaker detection (local + remotes), throttled ~10Hz
  useEffect(() => {
    let interval;
    try {
      if (localStream) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const src = ctx.createMediaStreamSource(localStream);
        const analyser = ctx.createAnalyser(); analyser.fftSize = 256; src.connect(analyser);
        localAnalyserRef.current = { ctx, analyser };
      }
    } catch {}
    const tick = () => {
      const newLevels = {};
      analyserMapRef.current.forEach((analyser, id) => {
        try { const data = new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(data); newLevels[id] = data.reduce((a,b)=>a+b,0)/data.length; } catch {}
      });
      try {
        if (localAnalyserRef.current) {
          const { analyser } = localAnalyserRef.current;
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          newLevels[myId] = data.reduce((a,b)=>a+b,0)/data.length;
        }
      } catch {}
      setLevels(newLevels);
    };
    interval = setInterval(tick, 100);
    return () => { try { clearInterval(interval); localAnalyserRef.current?.ctx?.close?.(); localAnalyserRef.current = null; } catch {} };
  }, [localStream, myId]);

  // Memoized ordering and layout columns
  const gridOrder = useMemo(() => {
    const all = [{ userId: myId, me: true }, ...participants.filter(p => p.userId !== myId)];
    const sorted = all.sort((a,b) => (levels[b.userId]||0) - (levels[a.userId]||0));
    const count = sorted.length;
    const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
    const activeId = sorted[0]?.userId || null;
    return { sorted, cols, activeId };
  }, [participants, levels, myId]);

  const totalCount = useMemo(() => {
    const s = new Set(participants.map(p => p.userId)); s.add(myId); return s.size;
  }, [participants, myId]);

  // Device switching mid-call
  const switchDevice = async (kind, deviceId) => {
    try {
      if (kind === 'video') {
        const v = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        const track = v.getVideoTracks()[0];
        localStream.getVideoTracks().forEach(t => t.stop());
        localStream.addTrack(track);
        peersRef.current.forEach(pc => { const sender = pc.getSenders().find(s=>s.track?.kind==='video'); if (sender) sender.replaceTrack(track); });
        setCamOn(true);
      } else if (kind === 'audio') {
        const a = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: { exact: deviceId }, noiseSuppression: enhance.noiseSuppression, echoCancellation: enhance.echoCancellation, autoGainControl: enhance.autoGainControl } });
        const track = a.getAudioTracks()[0];
        localStream.getAudioTracks().forEach(t => t.stop());
        localStream.addTrack(track);
        peersRef.current.forEach(pc => { const sender = pc.getSenders().find(s=>s.track?.kind==='audio'); if (sender) sender.replaceTrack(track); });
        setMicOn(true);
      }
    } catch { toast({ title: 'Device switch failed', status: 'error' }); }
  };

  // Push-to-talk: Space to temporarily unmute while held
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!joined) return;
      if (e.repeat) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return; // don't interfere with typing
      if (e.code === 'Space') {
        pushToTalkRef.current.prev = micOn;
        pushToTalkRef.current.active = true;
        if (!micOn) { setMicOn(true); localStream?.getAudioTracks()?.forEach(t=>t.enabled = true); }
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => {
      if (!joined) return;
      if (e.code === 'Space' && pushToTalkRef.current.active) {
        pushToTalkRef.current.active = false;
        if (!pushToTalkRef.current.prev) { setMicOn(false); localStream?.getAudioTracks()?.forEach(t=>t.enabled = false); }
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [joined, micOn, localStream]);

  // Keyboard shortcuts: m (mute), v (video), h (hand), c (captions toggle), r (record), s (share)
  const kbActionsRef = useRef({});
  useEffect(()=>{ kbActionsRef.current = { toggleMic, toggleCam, toggleHand, startRecording, stopRecording, shareScreen, stopShare, toggleLayout:()=>setLayoutMode(m=>m==='grid'?'speaker':'grid'), togglePin:()=> setPinnedUserId(id=> id? null : (spotlightUserId||gridOrder.activeId||myId)) }; });
  useEffect(() => {
    const handler = (e) => {
      if (!joined) return; const tag = (e.target && e.target.tagName) || ''; if (tag==='INPUT' || tag==='TEXTAREA') return;
      const k = e.key.toLowerCase(); const act = kbActionsRef.current;
      if (k === 'm') { act.toggleMic?.(); }
      else if (k === 'v') { act.toggleCam?.(); }
      else if (k === 'h') { act.toggleHand?.(); }
      else if (k === 'c') { setShowCaptions(s=>!s); }
      else if (k === 'r') { recording ? act.stopRecording?.() : act.startRecording?.(); }
      else if (k === 's') { screenTrackRef.current ? act.stopShare?.() : act.shareScreen?.(); }
      else if (k === 'l') { act.toggleLayout?.(); }
      else if (k === 'p') { act.togglePin?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [joined, recording]);

  // Warn before closing if in a meeting or recording
  useEffect(() => {
    const beforeUnload = (e) => {
      if (joined || recording) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [joined, recording]);

  // Basic network quality polling via getStats
  useEffect(() => {
    if (!joined) return;
    const interval = setInterval(async () => {
      const result = {};
      for (const [otherId, pc] of peersRef.current.entries()) {
        try {
          const stats = await pc.getStats();
          let rtt = 0, jitter = 0, fractionLost = 0;
          stats.forEach(report => {
            if (report.type === 'remote-inbound-rtp' && report.kind === 'video') {
              if (typeof report.fractionLost === 'number') fractionLost = Math.max(fractionLost, report.fractionLost);
              if (typeof report.jitter === 'number') jitter = Math.max(jitter, report.jitter);
            }
            if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime) {
              rtt = Math.max(rtt, report.currentRoundTripTime);
            }
          });
          // crude scoring: start at 4, subtract based on thresholds
          let score = 4;
          if (rtt > 0.4) score -= 2; else if (rtt > 0.25) score -= 1;
          if (jitter > 0.05) score -= 1;
          if (fractionLost > 0.03) score -= 1; else if (fractionLost > 0.01) score -= 0.5;
          score = Math.max(0, Math.round(score));
          result[otherId] = score;
        } catch {}
      }
      setNetQual(prev => ({ ...prev, ...result }));
    }, 2000);
    return () => clearInterval(interval);
  }, [joined]);

  const qualColor = (q) => q >= 4 ? 'green' : q >= 3 ? 'yellow' : q >= 2 ? 'orange' : 'red';

  // Local captions via Web Speech API (when available)
  const startCaptions = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) { toast({ title: 'Captions not supported in this browser', status: 'warning' }); return; }
    const rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = 'en-US';
    rec.onresult = (e) => {
      const last = e.results[e.results.length-1];
      const text = last[0].transcript; socket?.emit('meeting:caption', { roomId, userId: myId, text });
    };
    rec.onerror = ()=>{}; rec.start();
    toast({ title: 'Captions started (local)', status: 'info' });
  };

  // Simple local recording (composite local + remote audio via audio context + local video only)
  const startRecording = () => {
    try {
      const mixed = new MediaStream();
      // local video track
      const lv = localStream?.getVideoTracks()?.[0]; if (lv) mixed.addTrack(lv);
      // mix audio: local + first remote
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ac.createMediaStreamDestination();
      if (localStream?.getAudioTracks().length) ac.createMediaStreamSource(localStream).connect(dest);
      remoteStreamsRef.current.forEach((s) => { try { ac.createMediaStreamSource(s).connect(dest); } catch {} });
      dest.stream.getAudioTracks().forEach(t => mixed.addTrack(t));
      const mr = new MediaRecorder(mixed, { mimeType: 'video/webm;codecs=vp9,opus' });
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `meeting-${roomId}.webm`; a.click();
      };
    mr.start(); mediaRecorderRef.current = mr; setRecording(true); socket?.emit('meeting:recording', { roomId, userId: myId, on: true }); toast({ title: 'Recording started', status: 'info' });
    } catch { toast({ title: 'Recording failed', status: 'error' }); }
  };
  const stopRecording = () => { try { mediaRecorderRef.current?.stop(); setRecording(false); socket?.emit('meeting:recording', { roomId, userId: myId, on: false }); toast({ title: 'Recording saved', status: 'success' }); } catch {} };

  const copyInvite = async () => {
    try {
      const url = `${window.location.origin}/meet?room=${encodeURIComponent(roomId)}${config.hasPasscode ? `&code=${encodeURIComponent(passcode||'')}` : ''}`;
      await navigator.clipboard?.writeText(url);
      toast({ title: 'Invite link copied', status: 'success' });
    } catch { toast({ title: 'Copy failed', status: 'error' }); }
  };

  // Derived helpers
  const me = participants.find(p => p.userId === myId);
  const isHost = me?.role === 'host';
  const nameOf = (id) => participants.find(p=>p.userId===id)?.name || id;
  const spotlightName = spotlightUserId ? (spotlightUserId === myId ? 'Me' : nameOf(spotlightUserId)) : null;

  // Host actions
  const applyConfig = () => { socket?.emit('meeting:config', { roomId, byUserId: myId, lobby: config.lobby, locked: config.locked, passcode: config.hasPasscode ? (passcode||'') : '', muteOnJoin: config.muteOnJoin, allowChat: config.allowChat, allowReactions: config.allowReactions, allowScreenShare: config.allowScreenShare, allowLocalRecording: config.allowLocalRecording }); toast({ title: 'Meeting settings updated', status: 'success' }); };
  const admitUser = (id) => socket?.emit('meeting:admit', { roomId, byUserId: myId, userId: id });
    const denyUser = (id) => socket?.emit('meeting:deny', { roomId, byUserId: myId, userId: id });
  const kickUser = (id) => socket?.emit('meeting:kick', { roomId, byUserId: myId, userId: id });
  const muteUser = (id) => socket?.emit('meeting:mute', { roomId, byUserId: myId, userId: id });
  const endMeeting = () => socket?.emit('meeting:end', { roomId, byUserId: myId });
    const setRole = (userId, role) => socket?.emit('meeting:role', { roomId, byUserId: myId, userId, role });
    const restartIce = async () => {
      try {
        for (const [otherId, pc] of peersRef.current.entries()) {
          try {
            const offer = await pc.createOffer({ iceRestart: true });
            await pc.setLocalDescription(offer);
            socket?.emit('meeting:offer', { roomId, toUserId: otherId, fromUserId: myId, sdp: offer });
          } catch {}
        }
        toast({ title: 'ICE restart sent', status: 'info' });
      } catch {}
    };

  const RemoteVideo = ({ userId }) => {
    const ref = useRef(null);
    const [hasVideo, setHasVideo] = useState(false);
  useEffect(() => {
      const stream = remoteStreamsRef.current.get(userId) || null;
      if (ref.current) ref.current.srcObject = stream;
      try {
        const ok = !!(stream && stream.getVideoTracks().some(t => t.readyState === 'live' && t.enabled !== false));
        setHasVideo(ok);
      } catch { setHasVideo(false); }
  }, [userId]);
    const p = participants.find(p => p.userId === userId);
    return (
      <Box position='relative' w='100%' bg='#000' borderRadius='md' overflow='hidden' style={{ aspectRatio: '16 / 9' }}>
        <video ref={ref} autoPlay playsInline style={{ width:'100%', height:'100%', objectFit:'cover' }} />
        {/* Network quality badge (remote only) */}
        <Box position='absolute' top={1} left={1}>
          <Badge colorScheme={qualColor(netQual[userId] ?? 4)}>{(netQual[userId] ?? 4)}/4</Badge>
        </Box>
        {!hasVideo && (
          <Box position='absolute' inset={0} display='flex' alignItems='center' justifyContent='center'>
            <Box bg='gray.700' color='white' borderRadius='full' px={4} py={2} opacity={0.9}>
              <Text>{p?.name || userId}</Text>
            </Box>
          </Box>
        )}
        <Box position='absolute' bottom={1} left={1}><Badge>{p?.name || userId}</Badge>{hands[userId] && <Badge colorScheme='yellow' ml={2}>✋</Badge>}</Box>
      </Box>
    );
  };

  return (
    <Box p={3}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Meetings</Text>
    {!joined && (
          <VStack align='stretch' spacing={3} borderWidth='1px' borderRadius='md' p={3}>
            <HStack>
              <Input placeholder='Your name' value={name} onChange={e=>setName(e.target.value)} />
            </HStack>
            <HStack>
              <Select value={settings.cam} onChange={e=>{ const id=e.target.value; setSettings(s=>({...s, cam:id})); if (joined) switchDevice('video', id); }}>
                {devices.cams.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||'Camera'}</option>)}
              </Select>
              <Select value={settings.mic} onChange={e=>{ const id=e.target.value; setSettings(s=>({...s, mic:id})); if (joined) switchDevice('audio', id); }}>
                {devices.mics.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||'Microphone'}</option>)}
              </Select>
            </HStack>
            <HStack>
              <Button size='xs' variant={enhance.noiseSuppression? 'solid':'outline'} onClick={()=>setEnhance(e=>({ ...e, noiseSuppression: !e.noiseSuppression }))}>
                Noise Suppression: {enhance.noiseSuppression? 'On':'Off'}
              </Button>
              <Button size='xs' variant={enhance.echoCancellation? 'solid':'outline'} onClick={()=>setEnhance(e=>({ ...e, echoCancellation: !e.echoCancellation }))}>
                Echo Cancellation: {enhance.echoCancellation? 'On':'Off'}
              </Button>
              <Button size='xs' variant={enhance.autoGainControl? 'solid':'outline'} onClick={()=>setEnhance(e=>({ ...e, autoGainControl: !e.autoGainControl }))}>
                Auto Gain: {enhance.autoGainControl? 'On':'Off'}
              </Button>
            </HStack>
            <video ref={localVideoRef} autoPlay playsInline muted style={{ width:'100%', background:'#000', borderRadius:8, transform: mirrorLocal? 'scaleX(-1)': 'none' }} />
            <HStack>
              <Input placeholder='Room ID (e.g., team-standup)' value={roomId} onChange={e=>setRoomId(e.target.value)} />
              <Button colorScheme='purple' onClick={join} leftIcon={<PhoneIcon />}>Join</Button>
      <Button variant='outline' onClick={createRoom}>Create room</Button>
            </HStack>
            <Input placeholder='Passcode (if required)' value={passcode} onChange={e=>setPasscode(e.target.value)} isInvalid={needPasscode} />
            <Button size='xs' variant='outline' onClick={()=>setMirrorLocal(m=>!m)}>Mirror preview: {mirrorLocal? 'On':'Off'}</Button>
          </VStack>
        )}
        {joined && (
          <VStack align='stretch' spacing={3}>
            <HStack>
              <Text>Room: {roomId}</Text>
              {config.locked && <Badge colorScheme='orange'>Locked</Badge>}
              {config.lobby && <Badge colorScheme='blue'>Lobby On</Badge>}
              {config.hasPasscode && <Badge colorScheme='purple'>Passcode</Badge>}
              {recordingUsers.length>0 && <Badge colorScheme='red'>REC {recordingUsers.length}</Badge>}
              {spotlightUserId && <Badge colorScheme='green'>Spotlight: {spotlightName}</Badge>}
              <Badge colorScheme='purple'>Participants: {totalCount}</Badge>
              {screenTrackRef.current && <Badge colorScheme='teal'>Sharing screen</Badge>}
            </HStack>
            {joined && !localStream && (
              <Box borderWidth='1px' borderRadius='md' p={3} bg='red.50'>
                <Text>Camera/Mic unavailable. Check browser permissions or device access.</Text>
              </Box>
            )}
            {isWaiting && (
              <Box borderWidth='1px' borderRadius='md' p={3} bg='yellow.50'>
                <Text>You're in the waiting room. The host will let you in soon.</Text>
              </Box>
            )}
            {isHost && (
              <Box borderWidth='1px' borderRadius='md' p={2}>
                <Text fontWeight='bold' mb={2}>Host controls</Text>
                <HStack spacing={2} mb={2}>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, lobby: !c.lobby}))} variant={config.lobby? 'solid':'outline'} colorScheme='blue'>Lobby: {config.lobby? 'On':'Off'}</Button>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, locked: !c.locked}))} variant={config.locked? 'solid':'outline'} colorScheme='orange'>Lock: {config.locked? 'On':'Off'}</Button>
                  <Input size='sm' placeholder='Set passcode' value={config.hasPasscode ? passcode : ''} onChange={e=>{ setPasscode(e.target.value); setConfig(c=>({...c, hasPasscode: true})); }} width='200px' />
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, hasPasscode: false}))} variant='ghost'>Clear passcode</Button>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, muteOnJoin: !c.muteOnJoin}))} variant={config.muteOnJoin? 'solid':'outline'} colorScheme='pink'>Mute on join: {config.muteOnJoin? 'On':'Off'}</Button>
                  <Divider orientation='vertical' />
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, allowChat: !c.allowChat}))} variant={config.allowChat? 'solid':'outline'}>Chat: {config.allowChat? 'On':'Off'}</Button>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, allowReactions: !c.allowReactions}))} variant={config.allowReactions? 'solid':'outline'}>Reactions: {config.allowReactions? 'On':'Off'}</Button>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, allowScreenShare: !c.allowScreenShare}))} variant={config.allowScreenShare? 'solid':'outline'}>Screen share: {config.allowScreenShare? 'On':'Off'}</Button>
                  <Button size='sm' onClick={()=>setConfig(c=>({...c, allowLocalRecording: !c.allowLocalRecording}))} variant={config.allowLocalRecording? 'solid':'outline'}>Local Rec: {config.allowLocalRecording? 'On':'Off'}</Button>
                  <Button size='sm' colorScheme='green' onClick={applyConfig}>Apply</Button>
                  <Divider orientation='vertical' />
                  <Button size='sm' colorScheme='red' variant='outline' onClick={()=> socket?.emit('meeting:mute-all', { roomId, byUserId: myId })}>Mute all</Button>
                  <Button size='sm' onClick={()=> socket?.emit('meeting:admit-all', { roomId, byUserId: myId })}>Admit all</Button>
                  <Button size='sm' variant='outline' onClick={()=> socket?.emit('meeting:lower-all-hands', { roomId, byUserId: myId })}>Lower all hands</Button>
                  <Button size='sm' colorScheme='red' onClick={endMeeting}>End meeting</Button>
                </HStack>
                <Text fontWeight='semibold'>Waiting room ({waitingList.length})</Text>
                <HStack wrap='wrap'>
                  {waitingList.map(w => (
                    <HStack key={w.userId} spacing={2} borderWidth='1px' borderRadius='md' p={1}>
                      <Text>{w.name || w.userId}</Text>
                        <Button size='xs' onClick={()=>admitUser(w.userId)}>Admit</Button>
                        <Button size='xs' variant='outline' colorScheme='red' onClick={()=>denyUser(w.userId)}>Deny</Button>
                    </HStack>
                  ))}
                </HStack>
              </Box>
            )}
            <HStack spacing={3} align='start'>
              <Box flex='2' borderWidth='1px' borderRadius='md' p={2}>
                <HStack spacing={2} mb={2} wrap='wrap'>
                  <Button size='sm' onClick={toggleMic}>{micOn ? 'Mute' : 'Unmute'}</Button>
                  <Button size='sm' onClick={toggleCam}>{camOn ? 'Stop Cam' : 'Start Cam'}</Button>
                  {(() => { const dis = !config.allowScreenShare && !(isHost || me?.role==='cohost'); return (
                    <Box display='inline-block'>
                      <Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren>
                        <Button size='sm' onClick={shareScreen} isDisabled={dis}>Share</Button>
                      </Tooltip>
                    </Box>
                  ); })()}
                  <Button size='sm' onClick={stopShare} variant='outline' isDisabled={!screenTrackRef.current}>Stop Share</Button>
                  <Button size='sm' onClick={toggleHand}>{hands[myId] ? 'Lower Hand' : 'Raise Hand'}</Button>
                  <Button size='sm' onClick={()=> { if (roomId) window.open(`/paint?room=${encodeURIComponent(roomId)}`, '_blank'); }}>Whiteboard</Button>
                  {(() => { const dis = !config.allowReactions && !(isHost || me?.role==='cohost'); return (
                    <>
                      <Box display='inline-block'><Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren><Button size='sm' onClick={() => sendReaction('👍')} isDisabled={dis}>👍</Button></Tooltip></Box>
                      <Box display='inline-block'><Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren><Button size='sm' onClick={() => sendReaction('❤️')} isDisabled={dis}>❤️</Button></Tooltip></Box>
                      <Box display='inline-block'><Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren><Button size='sm' onClick={() => sendReaction('😂')} isDisabled={dis}>😂</Button></Tooltip></Box>
                    </>
                  ); })()}
                  <Button size='sm' onClick={startCaptions} variant='outline'>Captions</Button>
                  <Button size='sm' onClick={()=>setShowCaptions(s=>!s)} variant={showCaptions? 'solid':'outline'}>CC: {showCaptions? 'On':'Off'}</Button>
                  {!recording ? (
                    (() => { const dis = !config.allowLocalRecording && !(isHost || me?.role==='cohost'); return (
                      <Box display='inline-block'>
                        <Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren>
                          <Button size='sm' onClick={startRecording} variant='outline' isDisabled={dis}>Record</Button>
                        </Tooltip>
                      </Box>
                    ); })()
                  ) : (
                    <Button size='sm' onClick={stopRecording} colorScheme='red'>Stop</Button>
                  )}
                  <Button size='sm' onClick={copyInvite} variant='outline'>Copy invite</Button>
                  <Button size='sm' onClick={()=>{
                      const next = spotlightUserId ? null : gridOrder.activeId; setSpotlightUserId(next);
                      socket?.emit('meeting:spotlight-set', { roomId, byUserId: myId, userId: next });
                    }} variant={spotlightUserId? 'solid':'outline'}>Spotlight</Button>
                  <Button size='sm' onClick={restartIce} variant='outline'>Restart ICE</Button>
                  <Button size='sm' variant='outline' onClick={()=> setLayoutMode(m => m==='grid' ? 'speaker' : 'grid')}>Layout: {layoutMode==='grid' ? 'Grid' : 'Speaker'}</Button>
                  <Button size='sm' variant='outline' onClick={()=> setPinnedUserId(id => id ? null : (spotlightUserId || gridOrder.activeId || myId))}>Pin: {pinnedUserId? 'On':'Off'}</Button>
                  <Button size='sm' variant='outline' onClick={()=> setMirrorLocal(m => !m)}>Mirror: {mirrorLocal? 'On':'Off'}</Button>
                  <Button size='sm' variant='outline' onClick={()=> setHideSelf(h => !h)}>Self view: {hideSelf? 'Off':'On'}</Button>
                  <Button size='sm' colorScheme='red' onClick={leave}>Leave</Button>
                </HStack>
                <HStack align='start' spacing={2}>
                  {layoutMode === 'grid' ? (
                    (() => (
                      <Box flex='3' display='grid' gridTemplateColumns={`repeat(${spotlightUserId ? 1 : gridOrder.cols}, minmax(240px, 1fr))`} gap='8px'>
                        {(spotlightUserId ? [{ userId: spotlightUserId, me: spotlightUserId === myId }] : gridOrder.sorted).filter(Boolean).map(entry => entry.me ? (!hideSelf && (
                          <Box key={'me'} position='relative' w='100%' bg='#000' borderRadius='md' overflow='hidden' boxShadow={levels[myId] > 25 ? '0 0 0 3px #48BB78' : 'none'} style={{ aspectRatio: '16 / 9' }}>
                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform: mirrorLocal? 'scaleX(-1)':'none' }} />
                            {/* Pin toggle for self (local-only) */}
                            <HStack position='absolute' top={1} right={1} spacing={1}>
                              <Button size='xs' variant={pinnedUserId===myId?'solid':'outline'} onClick={()=> setPinnedUserId(id => id===myId ? null : myId)}>Pin</Button>
                            </HStack>
                            {(!localStream || !camOn || !(localStream.getVideoTracks?.()[0]?.readyState==='live' && localStream.getVideoTracks?.()[0]?.enabled!==false)) && (
                              <Box position='absolute' inset={0} display='flex' alignItems='center' justifyContent='center'>
                                <Box bg='gray.700' color='white' borderRadius='full' px={4} py={2} opacity={0.9}><Text>Camera off</Text></Box>
                              </Box>
                            )}
                            <Box position='absolute' bottom={1} left={1}>
                              <Badge>Me{hands[myId] && ' ✋'}</Badge>
                              {!micOn && <Badge ml={2} colorScheme='red'>Muted</Badge>}
                              {recordingUsers.includes(myId) && <Badge ml={2} colorScheme='red'>REC</Badge>}
                            </Box>
                            {/* mic level bar */}
                            <Box position='absolute' bottom={0} left={0} right={0} height='2px' bg='blackAlpha.500'>
                              <Box height='100%' width={`${Math.min(100, Math.max(0, Math.round(((levels[myId]||0)/60)*100))) }%`} bg='#48BB78' />
                            </Box>
                            {showCaptions && captions[myId] && (Date.now()-captions[myId].ts < 5000) && (
                              <Box position='absolute' bottom='8' left='2' right='2' bg='blackAlpha.700' color='white' borderRadius='md' p={1} fontSize='sm'>
                                {captions[myId].text}
                              </Box>
                            )}
                          </Box>
                        )) : (
                          <Box key={entry.userId} position='relative' boxShadow={levels[entry.userId] > 25 ? '0 0 0 3px #48BB78' : 'none'}>
                            <RemoteVideo userId={entry.userId} />
                            {/* Pin toggle for remote */}
                            <HStack position='absolute' top={1} right={1} spacing={1}>
                              <Button size='xs' variant={pinnedUserId===entry.userId?'solid':'outline'} onClick={()=> setPinnedUserId(id => id===entry.userId ? null : entry.userId)}>Pin</Button>
                            </HStack>
                            {(isHost || me?.role==='cohost') && (
                              <HStack position='absolute' top={1} right={1} spacing={1}>
                                <Button size='xs' onClick={()=>muteUser(entry.userId)}>Mute</Button>
                                <Button size='xs' colorScheme='red' onClick={()=>kickUser(entry.userId)}>Kick</Button>
                                <Button size='xs' variant='outline' onClick={()=>setRole(entry.userId, participants.find(p=>p.userId===entry.userId)?.role==='cohost'?'guest':'cohost')}>
                                  {participants.find(p=>p.userId===entry.userId)?.role==='cohost'?'Demote':'Make Co-host'}
                                </Button>
                              </HStack>
                            )}
                            <Box position='absolute' bottom={1} left={1}>
                              {recordingUsers.includes(entry.userId) && <Badge colorScheme='red'>REC</Badge>}
                            </Box>
                            {/* mic level bar */}
                            <Box position='absolute' bottom={0} left={0} right={0} height='2px' bg='blackAlpha.500'>
                              <Box height='100%' width={`${Math.min(100, Math.max(0, Math.round(((levels[entry.userId]||0)/60)*100))) }%`} bg='#48BB78' />
                            </Box>
                            {showCaptions && captions[entry.userId] && (Date.now()-captions[entry.userId].ts < 5000) && (
                              <Box position='absolute' bottom='2' left='2' right='2' bg='blackAlpha.700' color='white' borderRadius='md' p={1} fontSize='sm'>
                                {captions[entry.userId].text}
                              </Box>
                            )}
                          </Box>
                        ))}
                        {/* Waiting placeholder when alone */}
                        {participants.filter(p=>p.userId!==myId).length===0 && (
                          <Box gridColumn='1 / -1' p={4} borderRadius='md' bg='blackAlpha.400' color='white' textAlign='center'>
                            <Text>Waiting for others to join… Share the invite link!</Text>
                          </Box>
                        )}
                      </Box>
                    ))()
                  ) : (
                    // Speaker view: show active or spotlight large, others as thumbnails
                    (() => {
                      const mainId = pinnedUserId || spotlightUserId || gridOrder.activeId || myId;
                      const others = [{ userId: myId, me: true }, ...participants.filter(p=>p.userId!==myId)].filter(e=>e.userId!==mainId);
                      return (
                        <VStack align='stretch' spacing={2} flex='3'>
                          <Box position='relative'>
                            {mainId===myId ? (
                              <Box key={'me-main'} position='relative' w='100%' bg='#000' borderRadius='md' overflow='hidden' style={{ aspectRatio: '16 / 9' }} boxShadow={levels[myId] > 25 ? '0 0 0 3px #48BB78' : 'none'}>
                                <video ref={localVideoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform: mirrorLocal? 'scaleX(-1)':'none' }} />
                                {(!localStream || !camOn || !(localStream.getVideoTracks?.()[0]?.readyState==='live' && localStream.getVideoTracks?.()[0]?.enabled!==false)) && (
                                  <Box position='absolute' inset={0} display='flex' alignItems='center' justifyContent='center'>
                                    <Box bg='gray.700' color='white' borderRadius='full' px={4} py={2} opacity={0.9}><Text>Camera off</Text></Box>
                                  </Box>
                                )}
                                <Box position='absolute' bottom={1} left={1}><Badge>Me</Badge></Box>
                              </Box>
                            ) : (
                              <Box key={mainId} position='relative' borderRadius='md' overflow='hidden' boxShadow={levels[mainId] > 25 ? '0 0 0 3px #48BB78' : 'none'}>
                                <RemoteVideo userId={mainId} />
                              </Box>
                            )}
                          </Box>
                          <HStack spacing={2} overflowX='auto'>
              {others.map(entry => entry.me ? (!hideSelf && (
                              <Box key={'me-thumb'} position='relative' width='160px' bg='#000' borderRadius='md' overflow='hidden' style={{ aspectRatio: '16 / 9' }}>
                                <video ref={localVideoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', transform: mirrorLocal? 'scaleX(-1)':'none' }} />
                                <Box position='absolute' bottom={1} left={1}><Badge>Me</Badge></Box>
                <HStack position='absolute' top={1} right={1}><Button size='xs' variant={pinnedUserId===myId?'solid':'outline'} onClick={()=> setPinnedUserId(id => id===myId ? null : myId)}>Pin</Button></HStack>
                              </Box>
                            )) : (
                              <Box key={entry.userId} position='relative' width='160px' borderRadius='md' overflow='hidden'>
                                <RemoteVideo userId={entry.userId} />
                <HStack position='absolute' top={1} right={1}><Button size='xs' variant={pinnedUserId===entry.userId?'solid':'outline'} onClick={()=> setPinnedUserId(id => id===entry.userId ? null : entry.userId)}>Pin</Button></HStack>
                              </Box>
                            ))}
                          </HStack>
                          {others.length===0 && (
                            <Box p={3} borderRadius='md' bg='blackAlpha.400' color='white' textAlign='center'>
                              <Text>Waiting for others to join…</Text>
                            </Box>
                          )}
                        </VStack>
                      );
                    })()
                  )}
                  <Box flex='1'>
                    {reactions.slice(-8).map((r,i)=>(<Text key={i} fontSize='3xl'>{r.emoji}</Text>))}
                  </Box>
                </HStack>
              </Box>
              <Box flex='1' borderWidth='1px' borderRadius='md' p={2}>
                <Tabs size='sm' variant='enclosed'>
                  <TabList>
                    <Tab>Participants</Tab>
                    <Tab>Chat</Tab>
                    <Tab>Polls</Tab>
                  </TabList>
                  <TabPanels>
                    <TabPanel>
                      <HStack justify='space-between' mb={2}>
                        <Text fontWeight='semibold'>Participants</Text>
                        {(isHost || me?.role==='cohost') && (
                          <HStack>
                            <Button size='xs' variant='outline' onClick={()=>{ setSpotlightUserId(null); socket?.emit('meeting:spotlight-set', { roomId, byUserId: myId, userId: null }); }}>Clear Spotlight</Button>
                          </HStack>
                        )}
                      </HStack>
                      <VStack align='stretch' spacing={2} maxH='40vh' overflowY='auto'>
                        {[{ userId: myId, name: 'Me', role: me?.role || 'guest' }, ...participants.filter(p=>p.userId!==myId)].map(p => (
                          <HStack key={p.userId} justify='space-between' borderWidth='1px' borderRadius='md' p={2}>
                            <HStack>
                              {/* active speaker dot */}
                              <Badge colorScheme={p.userId===gridOrder.activeId? 'green':'gray'}>●</Badge>
                              {/* network quality dot (skip self if unknown) */}
                              {p.userId !== myId && (
                                <Badge colorScheme={qualColor(netQual[p.userId] ?? 4)} title={`Network: ${(netQual[p.userId] ?? 4)}/4`}>●</Badge>
                              )}
                              <Text>{nameOf(p.userId)}</Text>
                              {p.role && <Badge>{p.role}</Badge>}
                            </HStack>
                            {isHost && p.userId !== myId && (
                              <HStack>
                                <Button size='xs' onClick={()=>muteUser(p.userId)}>Mute</Button>
                                <Button size='xs' variant='outline' colorScheme='red' onClick={()=>kickUser(p.userId)}>Kick</Button>
                                <Button size='xs' variant='outline' onClick={()=>socket?.emit('meeting:transfer-host', { roomId, byUserId: myId, userId: p.userId })}>Make Host</Button>
                                <Button size='xs' variant='outline' onClick={()=>socket?.emit('meeting:role', { roomId, byUserId: myId, userId: p.userId, role: p.role==='cohost'?'guest':'cohost' })}>
                                  {p.role==='cohost'?'Demote':'Make Co-host'}
                                </Button>
                                <Button size='xs' variant={spotlightUserId===p.userId?'solid':'outline'} onClick={()=>{ setSpotlightUserId(p.userId); socket?.emit('meeting:spotlight-set', { roomId, byUserId: myId, userId: p.userId }); }}>Spotlight</Button>
                              </HStack>
                            )}
                            {(p.userId === myId) && (isHost || me?.role==='cohost') && (
                              <HStack>
                                <Button size='xs' variant={spotlightUserId===myId?'solid':'outline'} onClick={()=>{ setSpotlightUserId(myId); socket?.emit('meeting:spotlight-set', { roomId, byUserId: myId, userId: myId }); }}>Spotlight me</Button>
                              </HStack>
                            )}
                          </HStack>
                        ))}
                      </VStack>
                      <Divider my={2} />
                      <Text fontSize='sm' mb={1}>Speaker output</Text>
                      <Select value={settings.speaker} onChange={async (e)=>{
                        const id = e.target.value; setSettings(s=>({...s, speaker:id}));
                        try {
                          const vids = document.querySelectorAll('video');
                          vids.forEach(v => { if (typeof v.setSinkId === 'function') v.setSinkId(id); });
                        } catch {}
                      }}>
                        {devices.speakers.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label||'Speaker'}</option>)}
                      </Select>
                    </TabPanel>
                    <TabPanel>
                      <Text fontWeight='bold' mb={2}>Chat {(!config.allowChat && !(isHost || me?.role==='cohost')) && <Badge ml={2}>Disabled by host</Badge>}</Text>
                      <VStack align='stretch' maxH='40vh' overflowY='auto' borderWidth='1px' borderRadius='md' p={2}>
                        {chat.map((m,i)=>(<Text key={i} fontSize='sm'><b>{nameOf(m.userId)}:</b> {m.text}</Text>))}
                      </VStack>
                      <HStack mt={2}>
                        {(() => { const dis = !config.allowChat && !(isHost || me?.role==='cohost'); return (
                          <>
                            <Box flex='1' display='inline-block'>
                              <Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren>
                                <Input placeholder='Type message' value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>{ if(e.key==='Enter') sendMsg(); }} isDisabled={dis} />
                              </Tooltip>
                            </Box>
                            <Box display='inline-block'>
                              <Tooltip label='Disabled by host' isDisabled={!dis} shouldWrapChildren>
                                <Button onClick={sendMsg} isDisabled={dis}>Send</Button>
                              </Tooltip>
                            </Box>
                          </>
                        ); })()}
                      </HStack>
                    </TabPanel>
                    <TabPanel>
                      <VStack align='stretch' spacing={2}>
                        {(isHost || me?.role==='cohost') && (
                          <Box borderWidth='1px' borderRadius='md' p={2}>
                            <Text fontWeight='bold' mb={1}>Create poll</Text>
                            <Input placeholder='Question' value={pollQ} onChange={e=>setPollQ(e.target.value)} mb={2} />
                            {pollOpts.map((o,i)=>(
                              <Input key={i} placeholder={`Option ${i+1}`} value={o} onChange={e=>setPollOpts(arr=>{ const a=[...arr]; a[i]=e.target.value; return a; })} mb={1} />
                            ))}
                            <HStack>
                              <Button size='sm' onClick={()=>setPollOpts(arr=>[...arr,''])} isDisabled={pollOpts.length>=8}>Add option</Button>
                              <Button size='sm' colorScheme='green' onClick={()=>{
                                const options = pollOpts.filter(s=>s.trim()); if (!pollQ.trim()||options.length<2) return;
                                socket?.emit('meeting:poll-create', { roomId, byUserId: myId, question: pollQ.trim(), options }); setPollQ(''); setPollOpts(['','']);
                              }}>Create</Button>
                            </HStack>
                          </Box>
                        )}
                        <VStack align='stretch' spacing={2} maxH='40vh' overflowY='auto'>
                          {polls.map(p => (
                            <Box key={p.id} borderWidth='1px' borderRadius='md' p={2}>
                              <Text fontWeight='bold'>{p.question}</Text>
                              <VStack align='stretch' mt={2}>
                                {p.options.map((opt, idx)=>(
                                  <HStack key={idx} justify='space-between'>
                                    <Button size='sm' onClick={()=>socket?.emit('meeting:poll-vote', { roomId, userId: myId, pollId: p.id, option: idx })} isDisabled={p.closed}>{opt.text}</Button>
                                    <Badge>{opt.votes}</Badge>
                                  </HStack>
                                ))}
                              </VStack>
                              {(isHost || me?.role==='cohost') && !p.closed && (
                                <Button size='xs' mt={2} onClick={()=>socket?.emit('meeting:poll-close', { roomId, byUserId: myId, pollId: p.id })}>Close poll</Button>
                              )}
                            </Box>
                          ))}
                        </VStack>
                      </VStack>
                    </TabPanel>
                  </TabPanels>
                </Tabs>
              </Box>
            </HStack>
          </VStack>
        )}
      </VStack>
    </Box>
  );
}
