import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Box, VStack, HStack, Text, Avatar, Badge, Button, Divider, useToast } from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import chatContext from '../../context/chatContext';

export default function FriendProfile(){
  const { id } = useParams();
  const navigate = useNavigate();
  const { hostName } = useContext(chatContext);
  const [data, setData] = useState(null);
  const [rxCounts, setRxCounts] = useState({});
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${hostName}/friend/${id}/overview`, { headers: { 'auth-token': localStorage.getItem('token') } });
      const d = await res.json(); setData(d);
    } catch { setData(null); }
  }, [hostName, id]);

  useEffect(()=>{ load(); }, [load]);

  useEffect(()=>{
    (async ()=>{
      try {
        const ids = (data?.snaps||[]).map(s=>s._id);
        if (!ids.length) return;
        const r = await fetch(hostName + '/reactions/counts', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token'), 'Content-Type':'application/json' }, body: JSON.stringify({ snapIds: ids }) });
        const d = await r.json(); setRxCounts(d||{});
      } catch { setRxCounts({}); }
    })();
  }, [hostName, data]);

  const viewReactions = async (snapId) => {
    try {
      const r = await fetch(hostName + '/reactions/' + snapId, { headers:{ 'auth-token': localStorage.getItem('token') } });
      const d = await r.json();
      if (!Array.isArray(d) || d.length===0) { return; }
      const txt = d.map(x=>`${x.emoji} ${x.user?.name||'Someone'}`).join(', ');
      alert('Reactions: ' + txt);
    } catch {}
  };

  if (!data) return <Box p={4}><Text>Loading…</Text></Box>;
  const { friend, snaps = [], messages = [], streak } = data;

  return (
    <Box p={4}>
      <VStack align='stretch' spacing={3}>
        <HStack>
          <Avatar src={friend?.profilePic} name={friend?.name} />
          <VStack align='start' spacing={0}>
            <Text fontSize='xl' fontWeight='bold'>{friend?.name || id}</Text>
            <Text color='gray.500'>{friend?.headline || ''}</Text>
          </VStack>
          <Badge ml='auto' colorScheme={friend?.isOnline ? 'green' : 'gray'}>{friend?.isOnline ? 'Online' : 'Offline'}</Badge>
        </HStack>

        {streak && (
          <HStack>
            <Badge colorScheme={streak.hourglass ? 'orange' : 'purple'}>Streak {streak.count}</Badge>
            <Text color='gray.600'>Time left: {Math.ceil((streak.timeLeftMs||0)/3600000)}h</Text>
          </HStack>
        )}

        <HStack>
          <Button onClick={()=>navigate('/snaps?to='+id)}>Send Snap</Button>
          <Button variant='outline' onClick={()=>navigate('/dashboard')}>Open Chat</Button>
        </HStack>

        <Divider />
        <Text fontWeight='semibold'>Snaps</Text>
        <VStack align='stretch' spacing={2}>
          {snaps.map(s => (
            <HStack key={s._id} justify='space-between' borderWidth='1px' borderRadius='md' p={2}>
              <HStack>
                <Badge colorScheme={s.mediaType==='image'?'green':'orange'}>{s.mediaType}</Badge>
                <Text>{String(s.sender)===String(id) ? 'From friend' : 'Sent by you'}</Text>
              </HStack>
              <HStack>
                <Button size='sm' onClick={()=>window.open(s.mediaUrl, '_blank')}>Open</Button>
                <Button size='sm' variant='outline' onClick={async ()=>{ const r = await fetch(hostName + '/memories/from-snap', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token'), 'Content-Type':'application/json' }, body: JSON.stringify({ mediaUrl: s.mediaUrl, caption: s.caption }) }); if (!r.ok) return toast({ title:'Save failed', status:'error' }); toast({ title:'Saved to Memories', status:'success' }); }}>Save</Button>
                <Button size='sm' variant='ghost' onClick={()=>viewReactions(s._id)}>See reactions</Button>
                {['🔥','😍','😂','👍','😮'].map(e => (
                  <Button key={e} size='sm' variant='ghost' onClick={async ()=>{
                    const r = await fetch(hostName + '/reactions/toggle', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token'), 'Content-Type':'application/json' }, body: JSON.stringify({ snapId: s._id, emoji: e }) });
                    if (!r.ok) return toast({ title:'Failed', status:'error' }); toast({ title:'Reacted', status:'success' });
                  }}>{e}</Button>
                ))}
              </HStack>
            </HStack>
          ))}
          {snaps.map(s => (
            <HStack key={s._id+':rx'} pl={2} pb={2}>
              <Text fontSize='sm' color='gray.600'>
                {Object.entries(rxCounts[s._id]||{}).map(([emoji,count])=>`${emoji} ${count}`).join('  ')}
              </Text>
            </HStack>
          ))}
          {snaps.length===0 && <Text color='gray.500'>No snaps yet.</Text>}
        </VStack>

        <Divider />
        <Text fontWeight='semibold'>Recent Messages</Text>
        <VStack align='stretch' spacing={2}>
          {messages.map(m => (
            <Box key={m._id} borderWidth='1px' borderRadius='md' p={2}>
              <Text color='gray.600' fontSize='sm'>{new Date(m.createdAt).toLocaleString()}</Text>
              {m.text && <Text>{m.text}</Text>}
              {m.imageUrl && <Button size='sm' onClick={()=>window.open(m.imageUrl, '_blank')}>Open Image</Button>}
              {m.audioUrl && <Text>🎤 Voice</Text>}
              {m.videoUrl && <Text>🎬 Video</Text>}
            </Box>
          ))}
          {messages.length===0 && <Text color='gray.500'>No messages yet.</Text>}
        </VStack>
      </VStack>
    </Box>
  );
}
