import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { Box, Button, HStack, VStack, Text, Input, Select, useToast, Badge, Progress, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Tab, Tabs, TabList, TabPanels, TabPanel, Divider } from '@chakra-ui/react';
import MotionButton from '../ui/MotionButton';
import chatContext from '../../context/chatContext';
import io from 'socket.io-client';

export default function MusicPage() {
  const toast = useToast();
  const { hostName } = useContext(chatContext);
  const [tracks, setTracks] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('trending');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [cover, setCover] = useState(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genres, setGenres] = useState('');
  const [tags, setTags] = useState('');
  const [year, setYear] = useState('');
  const [bpm, setBpm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [current, setCurrent] = useState(null); // track object
  const audioRef = useRef(null);
  const audioNextRef = useRef(null); // for crossfade/gapless
  const [crossfadeSec, setCrossfadeSec] = useState(2);
  const [useHls, setUseHls] = useState(false);
  const [waveform, setWaveform] = useState([]);
  const [roomId, setRoomId] = useState('');
  const [roomConnected, setRoomConnected] = useState(false);
  const socketRef = useRef(null);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [roomPin, setRoomPin] = useState('');
  const myUserId = useRef(localStorage.getItem('userId') || Math.random().toString(36).slice(2,9));
  // Room settings state (host/mod actions)
  const [roomCfg, setRoomCfg] = useState({ allowAllReorder: true, allowAllControl: true });
  const [moderators, setModerators] = useState([]);
  const [hasPin, setHasPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [modInput, setModInput] = useState('');
  // queue controls
  const [queue, setQueue] = useState([]); // array of track ids
  const [queueIdx, setQueueIdx] = useState(-1);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState('off'); // off | one | all
  // playlists
  const [playlists, setPlaylists] = useState([]);
  const [plOpen, setPlOpen] = useState(false);
  const [plName, setPlName] = useState('');
  const [trackToAdd, setTrackToAdd] = useState(null);
  // comments & user lists
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [history, setHistory] = useState([]);
  const [likedTracks, setLikedTracks] = useState([]);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [editLyrics, setEditLyrics] = useState('');
  const [showQueue, setShowQueue] = useState(false);
  const [publicPlaylists, setPublicPlaylists] = useState([]);
  const [genreFilter, setGenreFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [minLikes, setMinLikes] = useState('');
  const [sleepMinutes, setSleepMinutes] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [yearMax, setYearMax] = useState('');
  const [durMin, setDurMin] = useState('');
  const [durMax, setDurMax] = useState('');
  const [bpmMin, setBpmMin] = useState('');
  const [bpmMax, setBpmMax] = useState('');

  // Apply audio settings
  useEffect(() => {
    if (!(roomConnected && socketRef.current && roomId)) return;
    const s = socketRef.current;
    const onState = ({ queue: q, idx, paused, ts, lastSeek }) => {
      try {
        if (Array.isArray(q)) setQueue(q);
        if (typeof idx === 'number') setQueueIdx(idx);
        const id = (Array.isArray(q) && typeof idx==='number' && idx>=0 && idx<q.length) ? q[idx] : null;
        const t = id ? tracks.find(x=>x._id===id) : null;
        if (t) setCurrent(t);
        // update audio element
        const el = audioRef.current; if (!el || !t) return;
        const src = useHls ? (hostName + '/music/hls/' + t._id + '/master.m3u8') : (hostName + '/music/stream/' + t._id);
        if (el.src !== src) el.src = src;
        const drift = Math.max(0, (Date.now() - (ts||Date.now()))/1000);
        const pos = (lastSeek||0) + (paused ? 0 : drift);
        try { el.currentTime = pos; } catch {}
        if (paused) el.pause(); else el.play().catch(()=>{});
      } catch {}
    };
  const onQueue = ({ queue: q }) => { if (Array.isArray(q)) setQueue(q); };
  const onSeek = ({ position }) => { try { if (audioRef.current) audioRef.current.currentTime = position; } catch {} };
  const onJoinDenied = ({ reason }) => { setRoomConnected(false); toast({ title: reason==='pin' ? 'Wrong PIN' : 'Join denied', status: 'error' }); };
  const onConfig = (cfg) => { if (cfg && typeof cfg === 'object') setRoomCfg(prev => ({ ...prev, ...cfg })); };
  const onModerators = ({ list }) => { if (Array.isArray(list)) setModerators(list); };
  const onPinUpdated = ({ hasPin }) => { setHasPin(!!hasPin); };
  s.on('music:state', onState);
  s.on('music:queue', onQueue);
  s.on('music:seek', onSeek);
  s.on('music:join-denied', onJoinDenied);
  s.on('music:config', onConfig);
  s.on('music:moderators', onModerators);
  s.on('music:pin-updated', onPinUpdated);
  return () => { s.off('music:state', onState); s.off('music:queue', onQueue); s.off('music:seek', onSeek); s.off('music:join-denied', onJoinDenied); s.off('music:config', onConfig); s.off('music:moderators', onModerators); s.off('music:pin-updated', onPinUpdated); };
  }, [roomConnected, roomId, tracks, hostName, useHls, toast]);

  // keep server informed when local pause/play happens (if user uses native controls)
  useEffect(() => {
    const el = audioRef.current; if (!(el && roomConnected && socketRef.current && roomId)) return;
  const onPlay = () => socketRef.current.emit('music:play', { roomId, userId: myUserId.current, index: queueIdx });
  const onPause = () => socketRef.current.emit('music:pause', { roomId, userId: myUserId.current, position: el.currentTime||0 });
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    return () => { el.removeEventListener('play', onPlay); el.removeEventListener('pause', onPause); };
  }, [roomConnected, roomId, queueIdx]);
  // Apply audio settings (volume/mute)
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  // Track time & duration
  useEffect(() => {
    const el = audioRef.current; if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => setDuration(el.duration || 0);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    return () => { el.removeEventListener('timeupdate', onTime); el.removeEventListener('loadedmetadata', onMeta); };
  }, [audioRef]);

  const seek = (t) => { const el = audioRef.current; if (!el) return; try { el.currentTime = t; } catch {} };
  // when in room, broadcast seek
  const seekShared = useCallback((t) => { seek(t); if (roomConnected && socketRef.current && roomId) { socketRef.current.emit('music:seek', { roomId, userId: myUserId.current, position: t }); } }, [roomConnected, roomId]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!audioRef.current) return;
      if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
      if (e.code === 'Space') { e.preventDefault(); audioRef.current.paused ? audioRef.current.play().catch(()=>{}) : audioRef.current.pause(); }
  if (e.code === 'ArrowRight') { seekShared(Math.min((audioRef.current.currentTime||0)+5, duration)); }
  if (e.code === 'ArrowLeft') { seekShared(Math.max((audioRef.current.currentTime||0)-5, 0)); }
      if (e.key === '+') setVolume(v=>Math.min(1, v+0.05));
      if (e.key === '-') setVolume(v=>Math.max(0, v-0.05));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [duration, seekShared]);

  // Load persisted settings
  useEffect(() => {
    try {
      const v = localStorage.getItem('music_volume'); if (v) setVolume(parseFloat(v));
      const m = localStorage.getItem('music_muted'); if (m) setMuted(m === '1');
      const r = localStorage.getItem('music_rate'); if (r) setPlaybackRate(parseFloat(r));
    } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem('music_volume', String(volume)); } catch {} }, [volume]);
  useEffect(() => { try { localStorage.setItem('music_muted', muted ? '1' : '0'); } catch {} }, [muted]);
  useEffect(() => { try { localStorage.setItem('music_rate', String(playbackRate)); } catch {} }, [playbackRate]);

  // Persist current and queue
  useEffect(() => { try { localStorage.setItem('music_queue', JSON.stringify(queue)); localStorage.setItem('music_queue_idx', String(queueIdx)); } catch {} }, [queue, queueIdx]);
  useEffect(() => { try { localStorage.setItem('music_current', current?._id || ''); } catch {} }, [current]);

  // Deep linking & restore state
  useEffect(() => {
    const hash = window.location.hash?.slice(1);
    const openTrack = (t) => {
      setCurrent(t); setQueue([t._id]); setQueueIdx(0);
      const src = hostName + '/music/stream/' + t._id;
      if (audioRef.current) { audioRef.current.src = src; audioRef.current.play().catch(()=>{}); }
      fetch(hostName + '/music/tracks/' + t._id + '/comments').then(r=>r.json()).then(d=> setComments(Array.isArray(d)? d : [])).catch(()=> setComments([]));
    };
    const openPlaylist = async (pid) => {
      try { const res=await fetch(hostName+'/music/playlist/'+pid); const data=await res.json(); const ids=(data.tracks||[]).map(x=>x._id); setQueue(ids); setQueueIdx(0); if (data.tracks && data.tracks[0]) openTrack(data.tracks[0]); } catch {}
    };
    if (hash) {
      if (hash.startsWith('pl:')) openPlaylist(hash.slice(3));
      else fetch(hostName + '/music/tracks/' + hash).then(r=>r.json()).then(t => { if (t && t._id) openTrack(t); }).catch(()=>{});
    } else {
      // restore last session
      try {
        const lastId = localStorage.getItem('music_current');
        const savedQ = JSON.parse(localStorage.getItem('music_queue')||'[]');
        const savedIdx = parseInt(localStorage.getItem('music_queue_idx')||'-1');
        if (lastId) fetch(hostName + '/music/tracks/' + lastId).then(r=>r.json()).then(t => { if (t && t._id) openTrack(t); }).catch(()=>{});
        if (Array.isArray(savedQ) && savedQ.length) setQueue(savedQ);
        if (!Number.isNaN(savedIdx)) setQueueIdx(savedIdx);
      } catch {}
    }
  }, [hostName]);

  // When current changes, update hash and lyrics state
  useEffect(() => {
    if (current && current._id) {
      try { window.history.replaceState(null, '', '#'+current._id); } catch {}
      setEditLyrics(current.lyrics || '');
    }
  }, [current]);

  const load = useCallback(async () => {
    try {
      const url = new URL(hostName + '/music/tracks');
      if (search) url.searchParams.set('search', search);
      if (sort) url.searchParams.set('sort', sort);
      if (genreFilter) url.searchParams.set('genre', genreFilter);
      if (tagFilter) url.searchParams.set('tag', tagFilter);
      if (minLikes) url.searchParams.set('minLikes', minLikes);
    if (yearMin) url.searchParams.set('yearMin', yearMin);
    if (yearMax) url.searchParams.set('yearMax', yearMax);
    if (durMin) url.searchParams.set('durMin', durMin);
    if (durMax) url.searchParams.set('durMax', durMax);
    if (bpmMin) url.searchParams.set('bpmMin', bpmMin);
    if (bpmMax) url.searchParams.set('bpmMax', bpmMax);
      const res = await fetch(url.toString());
      const data = await res.json();
      setTracks(Array.isArray(data) ? data : []);
    } catch { toast({ title: 'Failed to load tracks', status: 'error' }); }
  }, [hostName, search, sort, genreFilter, tagFilter, minLikes, yearMin, yearMax, durMin, durMax, bpmMin, bpmMax, toast]);
  useEffect(() => { load(); }, [load]);

  const onSearch = async () => { await load(); };

  // HLS helper (dynamic) to attach media source
  const attachHls = useCallback((el, src) => {
    if (!el) return Promise.reject(new Error('no element'));
    if (el.canPlayType('application/vnd.apple.mpegurl')) { el.src = src; return Promise.resolve(); }
    return new Promise((resolve, reject) => {
      const boot = () => {
        try {
          const hls = new window.Hls();
          hls.loadSource(src);
          hls.attachMedia(el);
          hls.on(window.Hls.Events.MANIFEST_PARSED, () => resolve());
          hls.on(window.Hls.Events.ERROR, (_, data) => { if (data?.fatal) reject(new Error('HLS fatal')); });
        } catch (e) { reject(e); }
      };
      if (window.Hls) return boot();
      const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest'; s.onload = boot; s.onerror = () => reject(new Error('hls.js load failed')); document.body.appendChild(s);
    });
  }, []);

  const setNowPlaying = useCallback((t) => {
    setCurrent(t);
    const src = useHls ? (hostName + '/music/hls/' + t._id + '/master.m3u8') : (hostName + '/music/stream/' + t._id);
    if (audioRef.current) {
      const el = audioRef.current;
      const start = () => el.play().catch(() => { toast({ title: 'Press Play to start audio', status: 'info' }); });
      if (useHls) attachHls(el, src).then(start).catch(()=>{ el.src = hostName + '/music/stream/' + t._id; start(); });
      else { el.src = src; start(); }
    }
    // fetch waveform
    fetch(hostName + '/music/tracks/' + t._id + '/waveform').then(r=>r.json()).then(d=> setWaveform(Array.isArray(d?.peaks)? d.peaks : [])).catch(()=> setWaveform([]));
  }, [hostName, toast, useHls, attachHls]);

  const play = (t, listContext) => {
    // Build queue from provided list context when available
    if (Array.isArray(listContext) && listContext.length) {
      const ids = listContext.map(x => x._id);
      const idx = Math.max(0, ids.indexOf(t._id));
      if (roomConnected && socketRef.current && roomId) {
        socketRef.current.emit('music:queue-set', { roomId, userId: myUserId.current, queue: ids, index: idx });
      } else { setQueue(ids); setQueueIdx(idx); }
    } else {
      if (roomConnected && socketRef.current && roomId) {
        socketRef.current.emit('music:queue-set', { roomId, userId: myUserId.current, queue: [t._id], index: 0 });
      } else { setQueue([t._id]); setQueueIdx(0); }
    }
    setNowPlaying(t);
  // load comments for the current track
  fetch(hostName + '/music/tracks/' + t._id + '/comments').then(r=>r.json()).then(d=> setComments(Array.isArray(d)? d : [])).catch(()=> setComments([]));
  };

  const playByIndex = useCallback((idx) => {
    if (idx < 0 || idx >= queue.length) return;
    const id = queue[idx];
    const t = tracks.find(x => x._id === id);
    if (t) {
      if (roomConnected && socketRef.current && roomId) {
        socketRef.current.emit('music:play', { roomId, userId: myUserId.current, index: idx });
      } else {
        setQueueIdx(idx); setNowPlaying(t);
      }
    }
  }, [queue, tracks, setNowPlaying, roomConnected, roomId]);

  const next = useCallback(() => {
    if (repeat === 'one') { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(()=>{}); } return; }
    if (queue.length === 0) return;
    if (shuffle) {
      const ni = Math.floor(Math.random() * queue.length);
      playByIndex(ni);
    } else {
      let ni = queueIdx + 1;
      if (ni >= queue.length) { if (repeat === 'all') ni = 0; else return; }
      playByIndex(ni);
    }
  }, [queue, queueIdx, shuffle, repeat, playByIndex]);

  const prev = useCallback(() => {
    if (queue.length === 0) return;
    if (shuffle) {
      const pi = Math.floor(Math.random() * queue.length);
      playByIndex(pi);
    } else {
      let pi = queueIdx - 1;
      if (pi < 0) { if (repeat === 'all') pi = queue.length - 1; else return; }
      playByIndex(pi);
    }
  }, [queue, queueIdx, shuffle, repeat, playByIndex]);

  useEffect(() => {
    const el = audioRef.current; if (!el) return;
    const onEnded = () => next();
    const onTime = () => {
      if (!audioRef.current || !audioNextRef.current || !current) return;
      const remain = (audioRef.current.duration || 0) - (audioRef.current.currentTime || 0);
      if (remain < Math.max(0.2, crossfadeSec) && audioNextRef.current.src === '') {
        // preload next
        const getNextIdx = () => {
          if (repeat === 'one') return queueIdx;
          if (shuffle) return Math.floor(Math.random() * queue.length);
          let ni = queueIdx + 1; if (ni >= queue.length) ni = (repeat==='all') ? 0 : -1; return ni;
        };
        const ni = getNextIdx(); if (ni === -1) return;
        const id = queue[ni]; const t = tracks.find(x=>x._id===id); if (!t) return;
        const nextEl = audioNextRef.current;
        const nextSrc = useHls ? (hostName + '/music/hls/' + t._id + '/master.m3u8') : (hostName + '/music/stream/' + t._id);
        if (useHls) {
          attachHls(nextEl, nextSrc).catch(()=>{ nextEl.src = hostName + '/music/stream/' + t._id; });
        } else { nextEl.src = nextSrc; nextEl.load(); }
        audioNextRef.current.volume = 0;
        audioNextRef.current.play().then(()=>{
          // apply simple crossfade
          const start = Date.now();
          const fade = () => {
            const dt = (Date.now() - start) / 1000;
            const p = Math.min(1, dt / Math.max(0.1, crossfadeSec));
            if (audioRef.current) audioRef.current.volume = (1 - p) * (muted ? 0 : volume);
            if (audioNextRef.current) audioNextRef.current.volume = p * (muted ? 0 : volume);
            if (p < 1) requestAnimationFrame(fade);
            else {
              // swap refs
              if (audioRef.current && audioNextRef.current) {
                audioRef.current.pause();
                audioRef.current.src = '';
                const tmp = audioRef.current; audioRef.current = audioNextRef.current; audioNextRef.current = tmp;
                setQueueIdx(ni);
                setCurrent(t);
              }
            }
          };
          requestAnimationFrame(fade);
        }).catch(()=>{});
      }
    };
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
  return () => { el.removeEventListener('ended', onEnded); el.removeEventListener('timeupdate', onTime); };
  }, [next, crossfadeSec, queue, queueIdx, repeat, shuffle, tracks, hostName, useHls, volume, muted, current, attachHls]);
  const like = async (t) => {
    try {
      const res = await fetch(hostName + '/music/like/' + t._id, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } });
      const data = await res.json();
      setTracks(list => list.map(x => x._id === data._id ? data : x));
      if (current && current._id === data._id) setCurrent(data);
    } catch {}
  };
  const unlike = async (t) => {
    try {
      const res = await fetch(hostName + '/music/unlike/' + t._id, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } });
      const data = await res.json();
      setTracks(list => list.map(x => x._id === data._id ? data : x));
      if (current && current._id === data._id) setCurrent(data);
    } catch {}
  };

  const canUpload = !!localStorage.getItem('token');
  // PWA install prompt capture
  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);
  const triggerInstall = async () => { try { await deferredPrompt?.prompt(); setDeferredPrompt(null); } catch {} };

  const doUpload = async () => {
    if (!file) return;
    setUploading(true); setProgress(0);
    try {
      const form = new FormData();
      form.append('file', file);
      if (cover) form.append('cover', cover);
      if (title) form.append('title', title);
      if (artist) form.append('artist', artist);
      if (album) form.append('album', album);
  if (genres) form.append('genres', genres);
  if (tags) form.append('tags', tags);
  if (year) form.append('year', year);
  if (bpm) form.append('bpm', bpm);
      const res = await fetch(hostName + '/music/upload', {
        method: 'POST',
        headers: { 'auth-token': localStorage.getItem('token') },
        body: form,
      });
      if (!res.ok) {
        let msg = 'Upload failed';
        try { const err = await res.json(); if (err && err.error) msg = err.error; } catch {}
        throw new Error(msg);
      }
      const data = await res.json();
      toast({ title: 'Uploaded', status: 'success' });
  setUploadOpen(false); setFile(null); setCover(null); setTitle(''); setArtist(''); setAlbum(''); setGenres(''); setTags(''); setYear(''); setBpm('');
      setTracks(list => [data, ...list]);
      setCurrent(data);
      setTimeout(() => { if (audioRef.current) { audioRef.current.src = hostName + '/music/stream/' + data._id; audioRef.current.play().catch(()=>toast({ title:'Press Play to start audio', status:'info' })); } }, 0);
    } catch (e) {
      toast({ title: e.message || 'Upload failed', status: 'error' });
    } finally { setUploading(false); setProgress(0); }
  };

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith('audio/')) { toast({ title: 'Select an audio file', status: 'warning' }); return; }
    setFile(f); if (!title) setTitle(f.name);
  };
  const onCoverChange = (e) => {
    const f = e.target.files?.[0]; if (!f) return; if (!f.type.startsWith('image/')) { toast({ title:'Select an image', status:'warning' }); return; } setCover(f);
  };

  // Queue helpers
  const queueAddEnd = (t) => {
  if (roomConnected && socketRef.current && roomId) socketRef.current.emit('music:enqueue', { roomId, userId: myUserId.current, trackId: t._id });
    else setQueue(q => [...q, t._id]);
  };
  const queueAddNext = (t) => {
  if (roomConnected && socketRef.current && roomId) socketRef.current.emit('music:enqueue', { roomId, userId: myUserId.current, trackId: t._id });
    else setQueue(q => { if (queueIdx < 0) return [t._id]; const copy = q.slice(); copy.splice(queueIdx+1, 0, t._id); return copy; });
  };
  const queueRemoveAt = (i) => {
  if (roomConnected && socketRef.current && roomId) socketRef.current.emit('music:dequeue', { roomId, userId: myUserId.current, index: i });
    else setQueue(q => q.filter((_,idx)=>idx!==i));
  };
  const queueMove = (i, dir) => {
  if (roomConnected && socketRef.current && roomId) socketRef.current.emit('music:reorder', { roomId, userId: myUserId.current, from: i, to: i+dir });
    else setQueue(q => { const j = i + dir; if (j<0 || j>=q.length) return q; const copy = q.slice(); const [it]=copy.splice(i,1); copy.splice(j,0,it); return copy; });
  };

  return (
    <Box p={3}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Music</Text>
        <HStack>
          <Input placeholder='Search songs, artists, albums' value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=> (e.key==='Enter') && onSearch()} />
          <Select value={sort} onChange={e=>setSort(e.target.value)} w='48'>
            <option value='trending'>Trending</option>
            <option value='likes'>Top liked</option>
            <option value='new'>New</option>
            <option value='alpha'>A-Z</option>
          </Select>
          <Input placeholder='Genre' value={genreFilter} onChange={e=>setGenreFilter(e.target.value)} w='32' />
          <Input placeholder='Tag' value={tagFilter} onChange={e=>setTagFilter(e.target.value)} w='28' />
          <Input placeholder='Min likes' value={minLikes} onChange={e=>setMinLikes(e.target.value)} w='24' />
          <Input placeholder='Year min' value={yearMin} onChange={e=>setYearMin(e.target.value)} w='24' />
          <Input placeholder='Year max' value={yearMax} onChange={e=>setYearMax(e.target.value)} w='24' />
          <Input placeholder='Dur min s' value={durMin} onChange={e=>setDurMin(e.target.value)} w='24' />
          <Input placeholder='Dur max s' value={durMax} onChange={e=>setDurMax(e.target.value)} w='24' />
          <Input placeholder='BPM min' value={bpmMin} onChange={e=>setBpmMin(e.target.value)} w='24' />
          <Input placeholder='BPM max' value={bpmMax} onChange={e=>setBpmMax(e.target.value)} w='24' />
          <MotionButton onClick={onSearch}>Search</MotionButton>
          <MotionButton variant='outline' onClick={()=>setUseHls(v=>!v)}>{useHls? 'HLS On' : 'HLS Off'}</MotionButton>
          {canUpload && <MotionButton onClick={()=>setUploadOpen(true)}>Upload</MotionButton>}
          {canUpload && <MotionButton variant='outline' onClick={async()=>{ try{ const res=await fetch(hostName+'/music/playlist/mine',{ headers:{'auth-token':localStorage.getItem('token')} }); const data=await res.json(); setPlaylists(Array.isArray(data)?data:[]); setTrackToAdd(null); setPlOpen(true);}catch{ toast({ title:'Failed to load playlists', status:'error' }); } }}>Playlists</MotionButton>}
        </HStack>
        <HStack>
          <MotionButton onClick={()=>{ const id = 'rm_' + Math.random().toString(36).slice(2, 8); setRoomId(id); }}>Create Id</MotionButton>
          <Input placeholder='Room id' value={roomId} onChange={e=>setRoomId(e.target.value)} w='44' />
          <Input placeholder='Pin (optional)' value={roomPin} onChange={e=>setRoomPin(e.target.value)} w='36' />
          {!roomConnected ? (
            <>
              <MotionButton onClick={()=>{ if (!roomId) return; if (!socketRef.current) socketRef.current = io(hostName); socketRef.current.emit('music:create', { roomId, userId: myUserId.current, pin: roomPin }); socketRef.current.emit('music:join', { roomId, userId: myUserId.current, pin: roomPin }); setRoomConnected(true); }}>Create & Join</MotionButton>
              <MotionButton variant='outline' onClick={()=>{ if (!roomId) return; if (!socketRef.current) socketRef.current = io(hostName); socketRef.current.emit('music:join', { roomId, userId: myUserId.current, pin: roomPin }); setRoomConnected(true); }}>Join</MotionButton>
            </>
          ) : (
            <MotionButton variant='outline' onClick={()=>{ socketRef.current?.emit('music:leave', { roomId, userId: myUserId.current }); setRoomConnected(false); }}>Leave</MotionButton>
          )}
          {deferredPrompt && <MotionButton variant='outline' onClick={triggerInstall}>Install App</MotionButton>}
        </HStack>
        {roomConnected && (
          <Box borderWidth='1px' borderRadius='md' p={2}>
            <HStack justify='space-between'>
              <HStack>
                <Text fontWeight='semibold'>Room settings</Text>
                <Badge colorScheme={hasPin?'purple':'gray'}>{hasPin ? 'PIN set' : 'No PIN'}</Badge>
              </HStack>
              <HStack>
                <Text fontSize='sm'>Allow all reorder</Text>
                <Select size='sm' value={roomCfg.allowAllReorder ? '1' : '0'} onChange={e=>{ const v = e.target.value==='1'; setRoomCfg(c=>({...c, allowAllReorder: v})); socketRef.current?.emit('music:config', { roomId, byUserId: myUserId.current, allowAllReorder: v }); }}>
                  <option value='1'>Yes</option>
                  <option value='0'>No</option>
                </Select>
                <Text fontSize='sm'>Allow all control</Text>
                <Select size='sm' value={roomCfg.allowAllControl ? '1' : '0'} onChange={e=>{ const v = e.target.value==='1'; setRoomCfg(c=>({...c, allowAllControl: v})); socketRef.current?.emit('music:config', { roomId, byUserId: myUserId.current, allowAllControl: v }); }}>
                  <option value='1'>Yes</option>
                  <option value='0'>No</option>
                </Select>
              </HStack>
            </HStack>
            <HStack mt={2}>
              <Input placeholder='Set/clear PIN' value={newPin} onChange={e=>setNewPin(e.target.value)} w='40' />
              <Button size='sm' onClick={()=>{ socketRef.current?.emit('music:pin-set', { roomId, byUserId: myUserId.current, pin: newPin }); setNewPin(''); }}>Save PIN</Button>
              <Input placeholder='Moderator userId' value={modInput} onChange={e=>setModInput(e.target.value)} w='40' />
              <Button size='sm' onClick={()=>{ const uid = modInput.trim(); if (!uid) return; socketRef.current?.emit('music:mod-add', { roomId, byUserId: myUserId.current, userId: uid }); setModInput(''); }}>Add mod</Button>
            </HStack>
            {moderators?.length>0 && (
              <HStack mt={2} wrap='wrap'>
                {moderators.map(uid => (
                  <HStack key={uid} borderWidth='1px' borderRadius='md' p={1}>
                    <Text fontSize='sm'>{uid}</Text>
                    <Button size='xs' colorScheme='red' variant='outline' onClick={()=> socketRef.current?.emit('music:mod-remove', { roomId, byUserId: myUserId.current, userId: uid })}>Remove</Button>
                  </HStack>
                ))}
              </HStack>
            )}
          </Box>
        )}
        {current && (
          <Box borderWidth='1px' borderRadius='md' p={3}>
            <HStack justify='space-between'>
              <VStack align='start' spacing={0}>
                <Text fontWeight='bold'>{current.title}</Text>
                <Text fontSize='sm' color='gray.500'>{current.artist}{current.album ? ' · ' + current.album : ''}</Text>
              </VStack>
              <HStack>
                <Badge colorScheme='pink'>{current.likes || 0} likes</Badge>
                <Button size='sm' onClick={()=>like(current)}>Like</Button>
                <Button size='sm' variant='outline' onClick={()=>unlike(current)}>Unlike</Button>
                <Button size='sm' as='a' href={`${hostName}/music/stream/${current?._id}?download=1`}>Download</Button>
              </HStack>
            </HStack>
            {current.coverUrl && <img alt='cover' src={current.coverUrl} style={{ maxHeight: 160, objectFit: 'cover', marginTop: 8, borderRadius: 8 }} />}
            <HStack mt={2} spacing={2}>
              <Button size='sm' onClick={prev}>Prev</Button>
              <Button size='sm' onClick={()=>{ if (!audioRef.current) return; if (roomConnected && socketRef.current && roomId) { if (audioRef.current.paused) { socketRef.current.emit('music:play', { roomId, userId: myUserId.current, index: queueIdx }); } else { socketRef.current.emit('music:pause', { roomId, userId: myUserId.current, position: audioRef.current.currentTime||0 }); } } else { if (audioRef.current.paused) audioRef.current.play().catch(()=>{}); else audioRef.current.pause(); } }}>Play/Pause</Button>
              <Button size='sm' onClick={next}>Next</Button>
              <Divider orientation='vertical' />
              <Button size='sm' variant={shuffle?'solid':'outline'} onClick={()=>setShuffle(s=>!s)}>Shuffle {shuffle?'On':'Off'}</Button>
              <Button size='sm' variant='outline' onClick={()=> setRepeat(r => r==='off' ? 'one' : r==='one' ? 'all' : 'off')}>Repeat: {repeat}</Button>
              <Text fontSize='sm' color='gray.500'>Queue {queueIdx+1}/{queue.length}</Text>
              <Button size='sm' variant='outline' onClick={()=>setShowQueue(s=>!s)}>{showQueue?'Hide Queue':'Show Queue'}</Button>
              <Button size='sm' variant='outline' onClick={()=>{ if (roomConnected && socketRef.current && roomId) socketRef.current.emit('music:queue-clear', { roomId, userId: myUserId.current }); else { setQueue([]); setQueueIdx(-1); } }}>Clear Queue</Button>
              <Button size='sm' variant='outline' onClick={async()=>{ const name = prompt('Save current queue as playlist (name)'); if(!name) return; try{ const res=await fetch(hostName+'/music/playlist', { method:'POST', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ name }) }); const pl=await res.json(); for (const id of queue){ try{ await fetch(hostName+'/music/playlist/'+pl._id+'/add',{ method:'POST', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ trackId: id }) }); }catch{} } toast({ title:'Playlist saved', status:'success' }); }catch{ toast({ title:'Save failed', status:'error' }); } }}>Save as Playlist</Button>
              <Button size='sm' variant='outline' onClick={()=>{ navigator.clipboard?.writeText(window.location.origin + '/music#'+(current?._id||'')); toast({ title:'Link copied', status:'success' }); }}>Copy link</Button>
              <HStack>
                <Text fontSize='sm'>Crossfade</Text>
                <Select size='sm' value={crossfadeSec} onChange={e=>setCrossfadeSec(parseFloat(e.target.value))}>
                  <option value={0}>Off</option>
                  <option value={1}>1s</option>
                  <option value={2}>2s</option>
                  <option value={3}>3s</option>
                  <option value={5}>5s</option>
                </Select>
              </HStack>
            </HStack>
            {waveform.length>0 && (
              <Box mt={2}>
                <div style={{ display:'flex', gap:1, height:40, alignItems:'flex-end', cursor:'pointer', background:'#f5f5f5', padding:2, borderRadius:4 }}
                  onClick={(e)=>{
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left; const p = Math.min(1, Math.max(0, x / rect.width));
                    seek(p * (duration||0));
                  }}>
                  {waveform.map((v,i)=> <div key={i} style={{ width: (100/waveform.length)+'%', height: (v*100)+'%', background:'#8a2be2' }} />)}
                </div>
              </Box>
            )}
            <HStack mt={2} spacing={3}>
              <HStack>
                <Text fontSize='sm'>Seek</Text>
                <input type='range' min='0' max={Math.max(1, duration)} step='1' value={currentTime} onChange={e=>seekShared(parseFloat(e.target.value))} style={{ width: 200 }} />
                <Text fontSize='xs' color='gray.500'>{Math.floor(currentTime)}/{Math.floor(duration)}s</Text>
              </HStack>
              <HStack>
                <Text fontSize='sm'>Vol</Text>
                <input type='range' min='0' max='1' step='0.01' value={muted?0:volume} onChange={e=>{ setMuted(false); setVolume(parseFloat(e.target.value)); }} />
                <Button size='xs' onClick={()=>setMuted(m=>!m)}>{muted?'Unmute':'Mute'}</Button>
              </HStack>
              <HStack>
                <Text fontSize='sm'>Speed</Text>
                <Select size='sm' value={playbackRate} onChange={e=>setPlaybackRate(parseFloat(e.target.value))}>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2x</option>
                </Select>
              </HStack>
              <HStack>
                <Text fontSize='sm'>Sleep</Text>
                <Select size='sm' value={sleepMinutes} onChange={e=>setSleepMinutes(e.target.value)}>
                  <option value=''>Off</option>
                  <option value='15'>15 min</option>
                  <option value='30'>30 min</option>
                  <option value='60'>60 min</option>
                </Select>
              </HStack>
              <Button size='sm' variant='outline' onClick={()=>setShowLyrics(s=>!s)}>{showLyrics ? 'Hide lyrics' : 'Show lyrics'}</Button>
            </HStack>
            {showLyrics && (
              <Box mt={2} borderWidth='1px' borderRadius='md' p={2}>
                {current?.lyrics ? <Text whiteSpace='pre-wrap'>{current.lyrics}</Text> : <Text color='gray.500'>No lyrics yet.</Text>}
                {!!localStorage.getItem('token') && current?.uploader && (
                  <>
                    <Divider my={2}/>
                    <Text fontSize='sm' color='gray.500'>Edit lyrics (uploader only)</Text>
                    <textarea value={editLyrics} onChange={e=>setEditLyrics(e.target.value)} rows={6} style={{ width: '100%' }} />
                    <Button size='sm' mt={2} onClick={async()=>{ try{ const res=await fetch(hostName+'/music/tracks/'+current._id,{ method:'PUT', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ lyrics: editLyrics }) }); if(!res.ok) throw new Error('Save failed'); const data=await res.json(); setCurrent(data); toast({ title:'Lyrics saved', status:'success' }); }catch{ toast({ title:'Save failed', status:'error' }); } }}>Save</Button>
                  </>
                )}
              </Box>
            )}
            {showQueue && (
              <Box mt={2} borderWidth='1px' borderRadius='md' p={2}>
                <Text fontWeight='semibold' mb={2}>Queue</Text>
                <VStack align='stretch' spacing={1}>
                  {queue.map((id, i) => {
                    const t = tracks.find(x=>x._id===id) || (current && current._id===id ? current : null);
                    return (
                      <HStack key={id+':'+i} justify='space-between' borderWidth='1px' borderRadius='md' p={1}>
                        <HStack>
                          {t?.coverUrl && <img alt='cover' src={t.coverUrl} style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 4 }} />}
                          <Text fontSize='sm'>{t?.title || 'Track'}</Text>
                        </HStack>
                        <HStack>
                          <Button size='xs' onClick={()=>{ if (roomConnected && socketRef.current) socketRef.current.emit('music:play', { roomId, userId: myUserId.current, index: i }); else setQueueIdx(i); }}>Go</Button>
                          <Button size='xs' onClick={()=>queueMove(i,-1)}>Up</Button>
                          <Button size='xs' onClick={()=>queueMove(i,1)}>Down</Button>
                          <Button size='xs' colorScheme='red' variant='outline' onClick={()=>queueRemoveAt(i)}>Remove</Button>
                        </HStack>
                      </HStack>
                    );
                  })}
                  {queue.length===0 && <Text color='gray.500'>Queue is empty.</Text>}
                </VStack>
              </Box>
            )}
            <audio ref={audioRef} controls style={{ width: '100%', marginTop: 8 }} />
            <audio ref={audioNextRef} style={{ display:'none' }} />
          </Box>
        )}
        <Tabs variant='enclosed'>
          <TabList>
            <Tab>All tracks</Tab>
            <Tab>My uploads</Tab>
            <Tab>History</Tab>
            <Tab>Liked</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <VStack align='stretch' spacing={2}>
                {tracks.map(t => (
                  <HStack key={t._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
                    <HStack>
                      {t.coverUrl && <img alt='cover' src={t.coverUrl} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
                      <VStack align='start' spacing={0}>
                        <Text fontWeight='semibold'>{t.title}</Text>
                        <Text fontSize='sm' color='gray.500'>{t.artist}{t.album ? ' · ' + t.album : ''}</Text>
                      </VStack>
                    </HStack>
                    <HStack>
                      <Badge>{(t.genres||[]).join(', ')}</Badge>
                      <Badge colorScheme='pink'>{t.likes || 0}</Badge>
                      <Button size='sm' onClick={()=>play(t, tracks)}>Play</Button>
                      <Button size='sm' variant='outline' onClick={()=>queueAddNext(t)}>Queue Next</Button>
                      <Button size='sm' variant='outline' onClick={()=>queueAddEnd(t)}>Queue End</Button>
                      <Button size='sm' variant='outline' onClick={()=>like(t)}>Like</Button>
                      {canUpload && <Button size='sm' variant='outline' onClick={async()=>{ const nt = {
                        title: prompt('Title', t.title) ?? t.title,
                        artist: prompt('Artist', t.artist) ?? t.artist,
                        album: prompt('Album', t.album) ?? t.album,
                        genres: prompt('Genres (comma separated)', (t.genres||[]).join(',')) ?? (t.genres||[]).join(',')
                      }; try{ const res=await fetch(hostName+'/music/tracks/'+t._id,{ method:'PUT', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify(nt) }); if(!res.ok) throw new Error('Update failed'); const data=await res.json(); setTracks(list=>list.map(x=>x._id===data._id?data:x)); if(current && current._id===data._id) setCurrent(data); toast({ title:'Updated', status:'success' }); }catch{ toast({ title:'Update failed', status:'error' }); } }}>Edit</Button>}
                      {canUpload && (
                        <Button size='sm' colorScheme='red' variant='outline' onClick={async()=>{
                          if (!window.confirm('Delete this track?')) return;
                          try{
                            const res=await fetch(hostName+'/music/tracks/'+t._id,{ method:'DELETE', headers:{'auth-token':localStorage.getItem('token')} });
                            if(!res.ok){
                              try{const err=await res.json(); if(err && err.error) throw new Error(err.error);}catch{}
                              throw new Error('Delete failed');
                            }
                            setTracks(list=>list.filter(x=>x._id!==t._id));
                            if(current && current._id===t._id){ setCurrent(null); if(audioRef.current){ audioRef.current.pause(); audioRef.current.src=''; } }
                            toast({ title:'Deleted', status:'success' });
                          }catch(e){ toast({ title:e.message||'Delete failed', status:'error' }); }
                        }}>Delete</Button>
                      )}
                    </HStack>
                  </HStack>
                ))}
                {tracks.length === 0 && <Text color='gray.500'>No tracks found.</Text>}
              </VStack>
            </TabPanel>
            <TabPanel>
              <MyUploads hostName={hostName} onPlay={play} />
            </TabPanel>
            <TabPanel>
              <HistoryTab hostName={hostName} onPlay={(t)=>play(t, history.map(h=>h.track).filter(Boolean))} items={history} setItems={setHistory} />
            </TabPanel>
            <TabPanel>
              <LikedTab hostName={hostName} onPlay={(t)=>play(t, likedTracks)} items={likedTracks} setItems={setLikedTracks} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>

      <Modal isOpen={uploadOpen} onClose={()=>setUploadOpen(false)} size='lg'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Upload audio</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align='stretch' spacing={2}>
              <Input type='file' accept='audio/*' onChange={onFileChange} />
              <Input type='file' accept='image/*' onChange={onCoverChange} />
              {cover && (
                <HStack>
                  <img alt='cover preview' src={URL.createObjectURL(cover)} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                  <Text fontSize='sm' color='gray.500'>Cover preview</Text>
                </HStack>
              )}
              <Input placeholder='Title' value={title} onChange={e=>setTitle(e.target.value)} />
              <HStack>
                <Input placeholder='Artist' value={artist} onChange={e=>setArtist(e.target.value)} />
                <Input placeholder='Album' value={album} onChange={e=>setAlbum(e.target.value)} />
              </HStack>
              <Input placeholder='Genres (comma separated)' value={genres} onChange={e=>setGenres(e.target.value)} />
              <HStack>
                <Input placeholder='Tags (comma separated)' value={tags} onChange={e=>setTags(e.target.value)} />
                <Input placeholder='Year' value={year} onChange={e=>setYear(e.target.value)} />
                <Input placeholder='BPM' value={bpm} onChange={e=>setBpm(e.target.value)} />
              </HStack>
              {uploading && <Progress value={progress} size='sm' />}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button mr={3} onClick={()=>setUploadOpen(false)}>Cancel</Button>
            <Button colorScheme='purple' isLoading={uploading} onClick={doUpload}>Upload</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {/* Playlists modal */}
      <Modal isOpen={plOpen} onClose={()=>{ setPlOpen(false); setTrackToAdd(null); }} size='md'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>My Playlists</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align='stretch' spacing={2}>
              <HStack>
                <Input placeholder='New playlist name' value={plName} onChange={e=>setPlName(e.target.value)} />
                <Button onClick={async()=>{ const name = plName.trim(); if (!name) return; try { const res = await fetch(hostName+'/music/playlist', { method:'POST', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ name }) }); const data = await res.json(); setPlaylists(p=>[data, ...p]); setPlName(''); toast({ title:'Playlist created', status:'success' }); } catch { toast({ title:'Create failed', status:'error' }); } }}>Create</Button>
                <Button variant='outline' onClick={async()=>{ try{ const res=await fetch(hostName+'/music/playlist/public'); const data=await res.json(); setPublicPlaylists(Array.isArray(data)?data:[]); toast({ title:'Loaded public', status:'success' }); }catch{ toast({ title:'Load public failed', status:'error' }); } }}>Public</Button>
              </HStack>
              {publicPlaylists.length>0 && (
                <Box borderWidth='1px' borderRadius='md' p={2}>
                  <Text fontWeight='semibold' mb={1}>Public playlists</Text>
                  <VStack align='stretch' spacing={1}>
                    {publicPlaylists.map(pl => (
                      <HStack key={'pub-'+pl._id} justify='space-between' borderWidth='1px' borderRadius='md' p={1}>
                        <Text>{pl.name}</Text>
                        <Button size='sm' onClick={async()=>{ try{ const res=await fetch(hostName+'/music/playlist/'+pl._id); const data=await res.json(); const ids=(data.tracks||[]).map(x=>x._id); setQueue(ids); setQueueIdx(0); if (data.tracks && data.tracks[0]) setCurrent(data.tracks[0]); setPlOpen(false); setTrackToAdd(null); } catch { toast({ title:'Open failed', status:'error' }); } }}>Open</Button>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              )}
              {playlists.map(pl => (
                <HStack key={pl._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
                  <Text>{pl.name}</Text>
                  <HStack>
                    {trackToAdd && <Button size='sm' variant='outline' onClick={async()=>{ try{ await fetch(hostName+'/music/playlist/'+pl._id+'/add', { method:'POST', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ trackId: trackToAdd._id }) }); toast({ title:'Added to '+pl.name, status:'success' }); } catch { toast({ title:'Add failed', status:'error' }); } }}>Add</Button>}
                    <Button size='sm' onClick={async()=>{ try{ const res=await fetch(hostName+'/music/playlist/'+pl._id); const data=await res.json(); const ids=(data.tracks||[]).map(x=>x._id); setQueue(ids); setQueueIdx(0); if (data.tracks && data.tracks[0]) setCurrent(data.tracks[0]); setPlOpen(false); setTrackToAdd(null); } catch { toast({ title:'Open failed', status:'error' }); } }}>Open</Button>
                    <Button size='sm' variant='outline' onClick={async()=>{ const newName = prompt('Rename playlist', pl.name); if(newName===null) return; try{ const res=await fetch(hostName+'/music/playlist/'+pl._id,{ method:'PUT', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ name: newName }) }); if(!res.ok) throw new Error('Rename failed'); const data=await res.json(); setPlaylists(arr=>arr.map(x=>x._id===pl._id?data:x)); toast({ title:'Renamed', status:'success' }); }catch{ toast({ title:'Rename failed', status:'error' }); } }}>Rename</Button>
                    <Button size='sm' variant='outline' onClick={async()=>{ const v = !pl.isPublic; try{ const res=await fetch(hostName+'/music/playlist/'+pl._id,{ method:'PUT', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ isPublic: v }) }); if(!res.ok) throw new Error('Update failed'); const data=await res.json(); setPlaylists(arr=>arr.map(x=>x._id===pl._id?data:x)); toast({ title: v?'Made public':'Made private', status:'success' }); }catch{ toast({ title:'Update failed', status:'error' }); } }}>{/* toggle */}{pl.isPublic?'Make Private':'Make Public'}</Button>
                  </HStack>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={()=>{ setPlOpen(false); setTrackToAdd(null); }}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      {current && (
        <Box mt={3} borderWidth='1px' borderRadius='md' p={3}>
          <Text fontWeight='semibold' mb={2}>Comments</Text>
          <VStack align='stretch' spacing={2} maxH='240px' overflowY='auto'>
            {comments.map(c => (
              <Box key={c._id} borderWidth='1px' borderRadius='md' p={2}>
                <Text fontSize='sm' color='gray.600'>{c.user?.name || c.user?.email || 'User'} · {new Date(c.createdAt).toLocaleString()}</Text>
                <Text>{c.text}</Text>
                <CommentActions hostName={hostName} c={c} setComments={setComments} />
              </Box>
            ))}
            {comments.length===0 && <Text color='gray.500'>No comments yet.</Text>}
          </VStack>
          {!!localStorage.getItem('token') && (
            <HStack mt={2}>
              <Input placeholder='Write a comment' value={newComment} onChange={e=>setNewComment(e.target.value)} />
              <Button onClick={async()=>{ const text=newComment.trim(); if(!text) return; try{ const res=await fetch(hostName+'/music/tracks/'+current._id+'/comments',{ method:'POST', headers:{ 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ text }) }); const data=await res.json(); setComments(cs=>[data, ...cs]); setNewComment(''); }catch{ toast({ title:'Comment failed', status:'error' }); } }}>Post</Button>
            </HStack>
          )}
        </Box>
      )}
    </Box>
  );
}

function MyUploads({ hostName, onPlay }) {
  const [list, setList] = useState([]);
  const toast = useToast();
  const loadMine = useCallback(async () => {
    try {
      const res = await fetch(hostName + '/music/me/tracks', { headers: { 'auth-token': localStorage.getItem('token') } });
      const data = await res.json();
      setList(Array.isArray(data) ? data : []);
    } catch { toast({ title: 'Failed to load', status: 'error' }); }
  }, [hostName, toast]);
  useEffect(() => { loadMine(); }, [loadMine]);
  return (
    <VStack align='stretch' spacing={2}>
      {list.map(t => (
        <HStack key={t._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
          <HStack>
            {t.coverUrl && <img alt='cover' src={t.coverUrl} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
            <VStack align='start' spacing={0}>
              <Text fontWeight='semibold'>{t.title}</Text>
              <Text fontSize='sm' color='gray.500'>{t.artist}{t.album ? ' · ' + t.album : ''}</Text>
            </VStack>
          </HStack>
          <HStack>
            <Badge colorScheme='pink'>{t.likes || 0}</Badge>
            <Button size='sm' onClick={()=>onPlay(t, list)}>Play</Button>
            <Button size='sm' colorScheme='red' variant='outline' onClick={async()=>{ if(!window.confirm('Delete this track?')) return; try{ const res=await fetch(hostName+'/music/tracks/'+t._id,{ method:'DELETE', headers:{'auth-token':localStorage.getItem('token')} }); if(!res.ok) throw new Error('Delete failed'); 
              // update list view
              setList(arr=>arr.filter(x=>x._id!==t._id));
            }catch{ toast({ title:'Delete failed', status:'error' }); } }}>Delete</Button>
          </HStack>
        </HStack>
      ))}
      {list.length === 0 && <Text color='gray.500'>No uploads.</Text>}
    </VStack>
  );
}

function HistoryTab({ hostName, onPlay, items, setItems }) {
  const toast = useToast();
  const load = useCallback(async () => {
    try { const res = await fetch(hostName + '/music/me/history', { headers: { 'auth-token': localStorage.getItem('token') } }); const data = await res.json(); setItems(Array.isArray(data) ? data : []); } catch { toast({ title: 'Failed to load', status: 'error' }); }
  }, [hostName, setItems, toast]);
  useEffect(() => { load(); }, [load]);
  return (
    <VStack align='stretch' spacing={2}>
      {items.map(h => h.track && (
        <HStack key={h._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
          <HStack>
            {h.track.coverUrl && <img alt='cover' src={h.track.coverUrl} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
            <VStack align='start' spacing={0}>
              <Text fontWeight='semibold'>{h.track.title}</Text>
              <Text fontSize='sm' color='gray.500'>{h.track.artist}{h.track.album ? ' · ' + h.track.album : ''}</Text>
            </VStack>
          </HStack>
          <HStack>
            <Badge colorScheme='purple'>{new Date(h.createdAt).toLocaleString()}</Badge>
            <Button size='sm' onClick={()=>onPlay(h.track)}>Play</Button>
          </HStack>
        </HStack>
      ))}
      {items.length===0 && <Text color='gray.500'>No history yet.</Text>}
    </VStack>
  );
}

function LikedTab({ hostName, onPlay, items, setItems }) {
  const toast = useToast();
  const load = useCallback(async () => {
    try { const res = await fetch(hostName + '/music/me/liked', { headers: { 'auth-token': localStorage.getItem('token') } }); const data = await res.json(); setItems(Array.isArray(data) ? data : []); } catch { toast({ title: 'Failed to load', status: 'error' }); }
  }, [hostName, setItems, toast]);
  useEffect(() => { load(); }, [load]);
  return (
    <VStack align='stretch' spacing={2}>
      {items.map(t => (
        <HStack key={t._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
          <HStack>
            {t.coverUrl && <img alt='cover' src={t.coverUrl} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 6 }} />}
            <VStack align='start' spacing={0}>
              <Text fontWeight='semibold'>{t.title}</Text>
              <Text fontSize='sm' color='gray.500'>{t.artist}{t.album ? ' · ' + t.album : ''}</Text>
            </VStack>
          </HStack>
          <HStack>
            <Badge colorScheme='pink'>{t.likes || 0}</Badge>
            <Button size='sm' onClick={()=>onPlay(t)}>Play</Button>
          </HStack>
        </HStack>
      ))}
      {items.length===0 && <Text color='gray.500'>No liked tracks.</Text>}
    </VStack>
  );
}

function CommentActions({ hostName, c, setComments }){
  const toast = useToast();
  const myId = localStorage.getItem('userId');
  if (!myId || !c?.user?._id || String(c.user._id) !== String(myId)) return null;
  return (
    <Button size='xs' variant='ghost' colorScheme='red' onClick={async()=>{ try{ await fetch(hostName+'/music/tracks/'+c.track+'/comments/'+c._id,{ method:'DELETE', headers:{'auth-token':localStorage.getItem('token')} }); setComments(prev=>prev.filter(x=>x._id!==c._id)); }catch{ toast({ title:'Delete failed', status:'error' }); } }}>Delete</Button>
  );
}
