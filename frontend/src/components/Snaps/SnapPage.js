import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { Box, Button, HStack, VStack, Text, Select, Input, useToast, Badge, Spacer, Slider, SliderTrack, SliderFilledTrack, SliderThumb, Tag, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Progress, Checkbox, SimpleGrid, Switch } from '@chakra-ui/react';
import MotionButton from '../ui/MotionButton';
import chatContext from '../../context/chatContext';

export default function SnapPage(){
  const { hostName } = useContext(chatContext);
  const toast = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  // Stream ref only via video element, no local state needed
  const [facing, setFacing] = useState('user');
  const [timer, setTimer] = useState(5);
  const [inbox, setInbox] = useState([]);
  const [to, setTo] = useState('');
  const [connections, setConnections] = useState([]); // from user connections
  const [chatFriends, setChatFriends] = useState([]); // from conversations
  const [caption, setCaption] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBlob, setPreviewBlob] = useState(null);
  const [quickFriends, setQuickFriends] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [filters, setFilters] = useState({ brightness: 100, contrast: 100, saturate: 100 });
  const [stickers, setStickers] = useState([]); // array of emoji strings
  const [reactionCounts, setReactionCounts] = useState({});
  const [replyToId, setReplyToId] = useState(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSnap, setViewerSnap] = useState(null);
  const [viewerTick, setViewerTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(true);
  const [autoCaption, setAutoCaption] = useState(false);
  const [faceOverlay, setFaceOverlay] = useState(false);
  // Video recording is disabled; images only for snaps

  const startCam = useCallback(async () => {
    try {
  const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } });
  if (videoRef.current) videoRef.current.srcObject = s;
    } catch { toast({ title: 'Camera access failed', status: 'error' }); }
  }, [facing, toast]);
  useEffect(()=>{
    startCam();
    const v = videoRef.current;
    return ()=>{
      const src = v && v.srcObject;
      try { if (src && typeof src.getTracks === 'function') src.getTracks().forEach(t=>t.stop()); } catch {}
      if (v) v.srcObject = null;
    };
  }, [startCam]);

  const snapPhoto = async () => {
    const v = videoRef.current, c = canvasRef.current; if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight; const ctx = c.getContext('2d'); ctx.drawImage(v, 0, 0);
    c.toBlob(async (blob) => {
      // Show preview; user can add caption, send, or retake
      if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
      setPreviewBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    }, 'image/jpeg', 0.9);
  };

  const sendBlob = async (blob) => {
    if (!blob) return;
    if (!to) { toast({ title:'Select a receiver', status:'warning' }); return; }
    const form = new FormData();
    form.append('file', blob, 'snap.jpg');
    form.append('timer', String(timer));
    if (!replyToId) form.append('to', to);
    if (caption) form.append('caption', caption);
    if (autoCaption && !caption) form.append('autoCaption', '1');
    // Multi-select bulk
    if (!replyToId && to === '__MULTI__') {
      const ids = selectedIds.filter(Boolean);
      if (!ids.length) { toast({ title:'No recipients selected', status:'warning' }); return; }
      ids.forEach(id => form.append('toList', id));
      const bulkRes = await fetch(hostName + '/snaps/bulk', { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') }, body: form });
      if (!bulkRes.ok) return toast({ title:'Send failed', status:'error' });
      toast({ title:'Sent to selected', status:'success' });
    } else {
      const url = replyToId ? (hostName + '/snaps/reply/' + replyToId) : (hostName + '/snaps/send');
      const res = await fetch(url, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') }, body: form });
      if (!res.ok) return toast({ title:'Send failed', status:'error' });
      toast({ title: replyToId ? 'Reply sent' : 'Snap sent', status:'success' });
    }
    // clear preview
    if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
    setPreviewUrl(null); setPreviewBlob(null); setCaption(''); setReplyToId(null); setSelectedIds([]);
    loadInbox();
  // Navigate to the friend's profile after send (single target)
  try { if (to && to !== '__ALL__' && to !== '__MULTI__') window.location.href = '/friend/' + to; } catch {}
  };

  const loadInbox = useCallback(async () => {
    try { const res = await fetch(hostName + '/snaps/inbox', { headers: { 'auth-token': localStorage.getItem('token') } }); const data = await res.json(); setInbox(Array.isArray(data)?data:[]); } catch { setInbox([]); }
  }, [hostName]);
  useEffect(()=>{ loadInbox(); }, [loadInbox]);
  useEffect(()=>{ // fetch reaction counts for current inbox
    const ids = inbox.map(s=>s._id);
    if (!ids.length) { setReactionCounts({}); return; }
    (async()=>{
      try {
        const r = await fetch(hostName + '/reactions/counts', { method:'POST', headers:{ 'Content-Type':'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ snapIds: ids }) });
        const d = await r.json(); setReactionCounts(d||{});
      } catch { setReactionCounts({}); }
    })();
  }, [inbox, hostName]);

  const loadConnections = useCallback(async () => {
    try { const res = await fetch(hostName + '/user/connections', { headers: { 'auth-token': localStorage.getItem('token') } }); const data = await res.json(); setConnections(Array.isArray(data)?data:[]); } catch { setConnections([]); }
  }, [hostName]);
  useEffect(()=>{ loadConnections(); }, [loadConnections]);

  const loadChatFriends = useCallback(async () => {
    try { const res = await fetch(hostName + '/conversation', { headers: { 'auth-token': localStorage.getItem('token') } }); const data = await res.json();
      const list = Array.isArray(data) ? data.flatMap(c => c.members || []) : [];
      // Deduplicate by _id
      const map = new Map();
      list.forEach(u => { if (u && u._id && !map.has(u._id)) map.set(u._id, u); });
      setChatFriends(Array.from(map.values()));
    } catch { setChatFriends([]); }
  }, [hostName]);
  useEffect(()=>{ loadChatFriends(); }, [loadChatFriends]);

  // Build quick-send list from recent inbox senders + chat friends fallback
  useEffect(()=>{
    const byId = new Map();
    // score from inbox recency
    inbox.forEach((s, idx) => {
      const id = s.sender?._id || s.sender; if (!id) return;
      const score = 1000 - idx; // simple decay by order
      byId.set(id, (byId.get(id)||0) + score);
    });
    // small bonus for chat friends
    chatFriends.forEach(u => { if (u && u._id) byId.set(u._id, (byId.get(u._id)||0) + 10); });
    const ranked = Array.from(byId.entries()).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([id])=>{
      const u = chatFriends.find(x=>x._id===id) || connections.find(x=>x._id===id) || { _id:id, name:id };
      return u;
    });
    setQuickFriends(ranked);
  }, [inbox, chatFriends, connections]);

  // Preselect receiver from ?to= query param
  useEffect(()=>{
    try {
      const params = new URLSearchParams(window.location.search);
      const qto = params.get('to');
      if (qto) setTo(qto);
    } catch {}
  }, []);

  const viewSnap = async (s) => {
    setViewerSnap(s);
    setViewerTick(s.viewTimerSec || 5);
    setViewerOpen(true);
    // mark viewed immediately; auto-delete will be scheduled server-side
    try { await fetch(hostName + '/snaps/view/' + s._id, { method:'POST', headers: { 'auth-token': localStorage.getItem('token') } }); } catch {}
  };

  // countdown effect for viewer
  useEffect(()=>{
    if (!viewerOpen) return;
    if (viewerTick <= 0) { setViewerOpen(false); setViewerSnap(null); loadInbox(); return; }
    const t = setTimeout(()=>setViewerTick(v=>v-1), 1000);
    return ()=>clearTimeout(t);
  }, [viewerOpen, viewerTick, loadInbox]);

  const onUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!to) { toast({ title:'Select a receiver', status:'warning' }); return; }
    if (!file.type.startsWith('image/')) { toast({ title:'Only images allowed', status:'error' }); return; }
  if (to === '__ALL__') {
      const ids = chatFriends.map(u=>u._id);
      if (!ids.length) { toast({ title:'No chats to send', status:'warning' }); return; }
      const form = new FormData();
      form.append('file', file);
      form.append('timer', String(timer));
      ids.forEach(id => form.append('toList', id));
      const r = await fetch(hostName + '/snaps/bulk', { method:'POST', headers:{'auth-token': localStorage.getItem('token')}, body: form });
      if(!r.ok) return toast({ title:'Send failed', status:'error' });
      toast({ title:'Sent to all chats', status:'success' });
      e.target.value = '';
      return;
    }
    if (to === '__MULTI__') {
      const ids = selectedIds.filter(Boolean);
      if (!ids.length) { toast({ title:'No recipients selected', status:'warning' }); return; }
      const f = new FormData(); f.append('file', file); f.append('timer', String(timer)); if (caption) f.append('caption', caption); if (autoCaption && !caption) f.append('autoCaption', '1');
      ids.forEach(id => f.append('toList', id));
      const r2 = await fetch(hostName + '/snaps/bulk', { method:'POST', headers:{'auth-token': localStorage.getItem('token')}, body: f });
      if(!r2.ok) return toast({ title:'Send failed', status:'error' });
      toast({ title:'Sent to selected', status:'success' });
      e.target.value = ''; setSelectedIds([]);
      return;
    }
  const form = new FormData(); form.append('file', file); form.append('timer', String(timer)); if (!replyToId) form.append('to', to);
  if (caption) form.append('caption', caption); if (autoCaption && !caption) form.append('autoCaption', '1');
  const url = replyToId ? (hostName + '/snaps/reply/' + replyToId) : (hostName + '/snaps/send');
  const res = await fetch(url, { method:'POST', headers:{'auth-token': localStorage.getItem('token')}, body: form });
    if(!res.ok) return toast({ title:'Send failed', status:'error' });
  toast({ title: replyToId ? 'Reply sent' : 'Snap sent', status:'success' });
  e.target.value = ''; setReplyToId(null);
    try { if (to) window.location.href = '/friend/' + to; } catch {}
  };

  // Re-render preview with filters and stickers applied
  const applyEditsToBlob = async () => {
    if (!previewUrl) return previewBlob;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)`;
        ctx.drawImage(img, 0, 0);
        // draw stickers as text emojis at preset positions
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.font = `${Math.floor(Math.max(32, c.width*0.06))}px sans-serif`;
        let x = 10, y = 10; const step = Math.floor(c.height*0.12);
        stickers.forEach(s => { ctx.fillText(s, x, y); y += step; if (y>c.height-60){ y=10; x+=step; } });
        const finalize = () => c.toBlob((b)=>resolve(b), 'image/jpeg', 0.9);
        // Optional simple AR: draw sunglasses emoji over detected faces (fallback to center)
        if (faceOverlay) {
          try {
            // FaceDetector API (experimental)
            // eslint-disable-next-line no-undef
            const FaceDetectorCtor = window.FaceDetector || null;
            if (FaceDetectorCtor) {
              const fd = new FaceDetectorCtor({ fastMode: true, maxDetectedFaces: 3 });
              // Need an ImageBitmap or HTMLImageElement; we already have img
              fd.detect(img).then((faces) => {
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const sz = Math.floor(c.width * 0.15);
                ctx.font = `${sz}px sans-serif`;
                faces.forEach(f => {
                  const cx = f.boundingBox.x + f.boundingBox.width/2;
                  const cy = f.boundingBox.y + f.boundingBox.height*0.35;
                  ctx.fillText('🕶️', cx, cy);
                });
                finalize();
              }).catch(() => { // fallback draw once at top center
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.font = `${Math.floor(c.width*0.15)}px sans-serif`;
                ctx.fillText('🕶️', c.width/2, c.height*0.2);
                finalize();
              });
              return;
            } else {
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.font = `${Math.floor(c.width*0.15)}px sans-serif`;
              ctx.fillText('🕶️', c.width/2, c.height*0.2);
            }
          } catch {}
        }
        finalize();
      };
      img.crossOrigin = 'anonymous';
      img.src = previewUrl;
    });
  };

  return (
    <Box p={3}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Snaps</Text>
        {!previewUrl ? (
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', borderRadius: 8, background: '#000' }} />
        ) : (
          <img src={previewUrl} alt="preview" style={{ width: '100%', borderRadius: 8, background: '#000', objectFit:'contain', filter: `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%)` }} />
        )}
        <canvas ref={canvasRef} style={{ display:'none' }} />
        <HStack>
          <Select value={facing} onChange={e=>setFacing(e.target.value)} w='40'>
            <option value='user'>Front</option>
            <option value='environment'>Back</option>
          </Select>
          <Select value={timer} onChange={e=>setTimer(parseInt(e.target.value))} w='36'>
            {[1,2,3,5,7,10].map(s => <option key={s} value={s}>{s}s</option>)}
          </Select>
          <Select placeholder='Select receiver' value={to} onChange={e=>setTo(e.target.value)} w='60'>
            <option value='__ALL__'>All Chats</option>
            <option value='__MULTI__'>Multi-select…</option>
            <optgroup label='Chats'>
              {chatFriends.map(u => <option key={'chat-'+u._id} value={u._id}>{u.name || u.email || u._id}</option>)}
            </optgroup>
            <optgroup label='Connections'>
              {connections.map(u => <option key={'conn-'+u._id} value={u._id}>{u.name || u._id}</option>)}
            </optgroup>
          </Select>
          <MotionButton onClick={()=>{ if (to && to !== '__ALL__' && to !== '__MULTI__') window.location.href = '/friend/' + to; }} disabled={!to || to==='__ALL__' || to==='__MULTI__'}>Profile</MotionButton>
          <HStack pl={2}>
            <Text fontSize='sm'>AI caption</Text>
            <Switch isChecked={autoCaption} onChange={e=>setAutoCaption(e.target.checked)} />
          </HStack>
          <HStack pl={2}>
            <Text fontSize='sm'>Face filter</Text>
            <Switch isChecked={faceOverlay} onChange={e=>setFaceOverlay(e.target.checked)} />
          </HStack>
        </HStack>
        {to==='__MULTI__' && (
          <Box borderWidth='1px' borderRadius='md' p={2}>
            <Text fontWeight='semibold' mb={1}>Select recipients</Text>
            <SimpleGrid columns={[2,3]} spacing={2}>
              {[...chatFriends, ...connections].map(u => (
                <Checkbox key={'sel-'+u._id} isChecked={selectedIds.includes(u._id)} onChange={e=>{
                  setSelectedIds(list => e.target.checked ? [...new Set([...list, u._id])] : list.filter(x=>x!==u._id));
                }}>{u.name || u._id}</Checkbox>
              ))}
            </SimpleGrid>
          </Box>
        )}
  {/* Quick send chips */}
  <HStack flexWrap='wrap'>
          {quickFriends.map(u => (
            <Tag key={u._id} size='lg' colorScheme={to===u._id?'purple':'gray'} cursor='pointer' onClick={()=>setTo(u._id)}>
              {u.name || u._id}
            </Tag>
          ))}
          {!previewUrl ? (
            <MotionButton onClick={snapPhoto}>Capture</MotionButton>
          ) : (
            <>
              <MotionButton variant='outline' onClick={()=>setEditMode(v=>!v)}>{editMode?'Hide Edit':'Edit'}</MotionButton>
              <MotionButton onClick={async ()=>{
                if (to === '__ALL__') {
                  // bulk send to all unique chat friends
                  if (!previewBlob) return;
                  const ids = chatFriends.map(u=>u._id);
                  if (!ids.length) { toast({ title:'No chats to send', status:'warning' }); return; }
                  const form = new FormData();
                  const edited = await applyEditsToBlob();
                  form.append('file', edited || previewBlob, 'snap.jpg');
                  form.append('timer', String(timer));
                  form.append('caption', caption);
                  ids.forEach(id => form.append('toList', id));
                  const res = await fetch(hostName + '/snaps/bulk', { method:'POST', headers: { 'auth-token': localStorage.getItem('token') }, body: form });
                  if (!res.ok) return toast({ title:'Send failed', status:'error' });
                  toast({ title:'Sent to all chats', status:'success' });
                  if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} }
                  setPreviewUrl(null); setPreviewBlob(null); setCaption('');
                  loadInbox();
                } else {
                  const edited = await applyEditsToBlob();
                  await sendBlob(edited || previewBlob);
                }
              }}>Send</MotionButton>
              <MotionButton onClick={()=>{ if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} } setPreviewUrl(null); setPreviewBlob(null); setReplyToId(null); }}>Retake</MotionButton>
              <MotionButton onClick={()=>{ if (previewBlob) { const a = document.createElement('a'); a.href = previewUrl; a.download = 'snap.jpg'; a.click(); } }}>Save</MotionButton>
              <MotionButton variant='outline' onClick={async ()=>{ if (!previewBlob) return; // Post to Story
                const form = new FormData(); form.append('file', previewBlob, 'story.jpg');
                const r = await fetch(hostName + '/stories/upload', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') }, body: form });
                if (!r.ok) return toast({ title:'Story upload failed', status:'error' }); toast({ title:'Story posted', status:'success' });
              }}>Post Story</MotionButton>
              <MotionButton variant='outline' onClick={async ()=>{ if (!previewBlob) return; const f = new FormData(); f.append('file', previewBlob, 'memory.jpg'); const r = await fetch(hostName + '/memories/upload', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') }, body: f }); if (!r.ok) return toast({ title:'Save failed', status:'error' }); toast({ title:'Saved to Memories', status:'success' }); }}>Save to Memories</MotionButton>
            </>
          )}
        </HStack>
  {editMode && previewUrl && (
          <VStack align='stretch' p={2} borderWidth='1px' borderRadius='md'>
            <Text fontWeight='semibold'>Filters</Text>
            <HStack>
              <Text w='24'>Brightness</Text>
              <Slider value={filters.brightness} min={50} max={150} step={1} onChange={v=>setFilters(f=>({...f, brightness: v}))}>
                <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text w='24'>Contrast</Text>
              <Slider value={filters.contrast} min={50} max={150} step={1} onChange={v=>setFilters(f=>({...f, contrast: v}))}>
                <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text w='24'>Saturate</Text>
              <Slider value={filters.saturate} min={50} max={200} step={1} onChange={v=>setFilters(f=>({...f, saturate: v}))}>
                <SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
              </Slider>
            </HStack>
            <HStack>
              <Text w='24'>Stickers</Text>
              {['😎','🔥','🌟','🎉','❤️','😂'].map(em => (
                <MotionButton key={em} size='sm' onClick={()=>setStickers(list=>[...list, em])}>{em}</MotionButton>
              ))}
              <MotionButton size='sm' variant='outline' onClick={()=>setStickers([])}>Clear</MotionButton>
            </HStack>
          </VStack>
        )}
        <HStack>
          <Spacer />
          <MotionButton as='label' variant='outline' cursor='pointer'>
            Upload Image
            <Input type='file' accept='image/*' onChange={onUpload} display='none' />
          </MotionButton>
          <MotionButton variant='outline' onClick={()=>{ window.location.href = '/streaks'; }}>Streaks</MotionButton>
          <MotionButton variant='outline' onClick={()=>{ window.location.href = '/stories'; }}>Stories</MotionButton>
        </HStack>
        {replyToId && (
          <HStack>
            <Tag colorScheme='purple'>Replying…</Tag>
            <MotionButton size='xs' variant='ghost' onClick={()=>setReplyToId(null)}>Cancel</MotionButton>
          </HStack>
        )}
        <Input placeholder='Add a caption (optional)' value={caption} onChange={e=>setCaption(e.target.value)} />
        <Box>
          <HStack justify='space-between' mb={2}>
            <Text fontWeight='semibold'>Inbox</Text>
            <HStack>
              <Switch isChecked={showUnreadOnly} onChange={e=>setShowUnreadOnly(e.target.checked)} />
              <Text fontSize='sm'>Unread only</Text>
              <MotionButton size='sm' variant='outline' onClick={async ()=>{ const r = await fetch(hostName + '/snaps/view-all', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); if (r.ok) { const d = await r.json(); toast({ title: `Marked ${d.count||0} as viewed`, status:'success' }); loadInbox(); } else { toast({ title: 'Failed to mark all', status:'error' }); } }}>Mark all viewed</MotionButton>
            </HStack>
          </HStack>
          <VStack align='stretch'>
            {(showUnreadOnly ? inbox.filter(s=>!s.viewedAt) : inbox).map(s => (
              <HStack key={s._id} justify='space-between' borderWidth='1px' borderRadius='md' p={2}>
                <HStack>
                  <Badge colorScheme={s.mediaType==='image'?'green':'orange'}>{s.mediaType}</Badge>
                  <Text>From {s.sender?.name || s.sender}</Text>
                  {s.replyTo && <Badge colorScheme='purple'>reply</Badge>}
                </HStack>
                <HStack>
                  <MotionButton size='sm' onClick={()=>viewSnap(s)}>View</MotionButton>
                  <MotionButton size='sm' variant='outline' onClick={()=>{ setTo(s.sender?._id || s.sender || ''); setReplyToId(s._id); window.scrollTo({ top: 0, behavior: 'smooth' }); toast({ title:'Reply ready — capture your snap', status:'info' }); }}>Reply</MotionButton>
                  <MotionButton size='sm' variant='outline' onClick={async ()=>{ try { await fetch(hostName + '/memories/from-snap', { method:'POST', headers:{ 'Content-Type':'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ mediaUrl: s.mediaUrl, caption: s.caption||'' }) }); toast({ title:'Saved to Memories', status:'success' }); } catch { toast({ title:'Save failed', status:'error' }); } }}>Save</MotionButton>
                  <MotionButton size='sm' variant='outline' onClick={async ()=>{ try { const r = await fetch(s.mediaUrl); const b = await r.blob(); if (previewUrl) { try { URL.revokeObjectURL(previewUrl); } catch {} } setPreviewBlob(b); setPreviewUrl(URL.createObjectURL(b)); window.scrollTo({ top: 0, behavior: 'smooth' }); toast({ title:'Ready to forward — pick receiver and Send', status:'info' }); } catch { toast({ title:'Forward failed', status:'error' }); } }}>Forward</MotionButton>
                  <MotionButton size='sm' variant='outline' onClick={async ()=>{ const r = await fetch(hostName + '/snaps/report/' + s._id, { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); if (r.ok) toast({ title:'Reported', status:'success' }); else toast({ title:'Report failed', status:'error' }); }}>Report</MotionButton>
                  <MotionButton size='sm' variant='outline' onClick={()=>{ const fid = s.sender?._id || s.sender; if (fid) window.location.href = '/friend/' + fid; }}>Profile</MotionButton>
                </HStack>
                <HStack>
                  {['❤️','😂','🔥','😮'].map(em => (
                    <Button key={em} size='xs' variant='ghost' onClick={async ()=>{ await fetch(hostName + '/reactions/toggle', { method:'POST', headers:{ 'Content-Type':'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ snapId: s._id, emoji: em }) }); const r = await fetch(hostName + '/reactions/counts', { method:'POST', headers:{ 'Content-Type':'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ snapIds: [s._id] }) }); const d = await r.json(); setReactionCounts(prev=>({ ...prev, ...d })); }}>{em} {reactionCounts[s._id]?.[em]||''}</Button>
                  ))}
                </HStack>
              </HStack>
            ))}
            {inbox.length===0 && <Text color='gray.500'>No snaps.</Text>}
          </VStack>
        </Box>
      </VStack>
      {/* Viewer Modal */}
      <Modal isOpen={viewerOpen} onClose={()=>{}} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Snap</ModalHeader>
          <ModalCloseButton isDisabled />
          <ModalBody>
            {viewerSnap && (
              <VStack>
                <img src={viewerSnap.mediaUrl} alt="snap" style={{ width:'100%', borderRadius:8 }} />
                {!!(viewerSnap.caption) && <Text>{viewerSnap.caption}</Text>}
                <Progress value={((viewerTick||0)/(viewerSnap.viewTimerSec||5))*100} w='100%' size='sm' colorScheme='purple' />
                <Text color='gray.500'>{viewerTick}s</Text>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            {viewerSnap && !viewerSnap.replayUsed && (
              <Button size='sm' onClick={async ()=>{ try { const r = await fetch(hostName + '/snaps/replay/' + viewerSnap._id, { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); if (r.ok) { const d = await r.json(); setViewerTick(d.timer||viewerSnap.viewTimerSec||5); } else { toast({ title:'Replay not available', status:'warning' }); } } catch {} }}>Replay</Button>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
