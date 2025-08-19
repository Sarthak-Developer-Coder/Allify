import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, HStack, VStack, Text, Progress, IconButton, Button } from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import chatContext from '../../context/chatContext';
import { motion } from 'framer-motion';
import MotionButton from '../ui/MotionButton';
const MBox = motion(Box);

export default function StoriesViewer(){
  const { hostName } = useContext(chatContext);
  const [stories, setStories] = useState([]);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0); // 0-100
  const timerRef = useRef(null);

  useEffect(()=>{
    let mounted = true;
    (async ()=>{
      try { const r = await fetch(hostName + '/stories/feed', { headers: { 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); if (mounted) setStories(Array.isArray(d)?d:[]); } catch {}
    })();
    return ()=>{ mounted = false; };
  }, [hostName]);

  const current = stories[i] || null;

  // Mark story as viewed when it becomes current
  useEffect(()=>{
    if (!current) return;
    (async ()=>{
      try { await fetch(hostName + '/stories/view/' + current._id, { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); } catch {}
    })();
  }, [current, hostName]);

  useEffect(()=>{
    clearInterval(timerRef.current);
    setProgress(0);
    if (!current) return;
    const duration = 4000; // 4s per story
    const start = Date.now();
    timerRef.current = setInterval(()=>{
      if (paused) return;
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p >= 100) {
        clearInterval(timerRef.current);
        setI(prev => (prev + 1 < stories.length ? prev + 1 : 0));
      }
    }, 50);
    return ()=>clearInterval(timerRef.current);
  }, [i, current, paused, stories.length]);

  const onLeft = () => setI(prev => (prev - 1 + stories.length) % stories.length);
  const onRight = () => setI(prev => (prev + 1) % stories.length);

  if (!stories.length) return <Box p={4}><Text>No stories yet.</Text></Box>;

  return (
  <MBox p={3} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} position='relative' w='100%' h='calc(100vh - 80px)' bg='black' onMouseDown={()=>setPaused(true)} onMouseUp={()=>setPaused(false)} onTouchStart={()=>setPaused(true)} onTouchEnd={()=>setPaused(false)}>
      {current && (
        <>
          <img src={current.mediaUrl} alt='story' style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'contain' }} />
          <VStack position='absolute' top={0} left={0} right={0} p={3} spacing={2}>
            <HStack w='100%'>
              {stories.map((_, idx) => (
                <Progress key={idx} value={idx < i ? 100 : idx === i ? progress : 0} size='xs' colorScheme='purple' w='100%' />
              ))}
            </HStack>
            <HStack w='100%' color='white' textShadow='0 0 4px rgba(0,0,0,0.8)'>
              <Text fontWeight='bold'>{current.author?.name || 'Story'}</Text>
              <Text fontSize='sm' opacity={0.8}>{new Date(current.createdAt).toLocaleString()}</Text>
              <Button size='xs' ml='auto' onClick={async ()=>{ try{ const r = await fetch(hostName + '/stories/viewers/' + current._id, { headers:{ 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); const names = (Array.isArray(d)?d:[]).map(v=>v.name||'Someone'); alert('Viewers ('+names.length+'): '+names.join(', ')); }catch{}}}>Viewers</Button>
              <MotionButton size='xs' ml='auto' onClick={async ()=>{ try{ const r = await fetch(hostName + '/stories/viewers/' + current._id, { headers:{ 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); const names = (Array.isArray(d)?d:[]).map(v=>v.name||'Someone'); alert('Viewers ('+names.length+'): '+names.join(', ')); }catch{}}}>Viewers</MotionButton>
              <MotionButton size='xs' variant='outline' onClick={async ()=>{ try{ const r = await fetch(hostName + '/stories/' + current._id + '/save', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); if (!r.ok) return; alert('Saved to Memories'); }catch{}}}>Save</MotionButton>
            </HStack>
          </VStack>
          <HStack position='absolute' inset={0} justify='space-between' p={2}>
            <IconButton aria-label='prev' icon={<ChevronLeftIcon />} onClick={onLeft} />
            <IconButton aria-label='next' icon={<ChevronRightIcon />} onClick={onRight} />
          </HStack>
        </>
      )}
  </MBox>
  );
}
