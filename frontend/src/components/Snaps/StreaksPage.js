import React, { useEffect, useState, useContext } from 'react';
import { motion } from 'framer-motion';
import { Box, VStack, Text, HStack, Badge, Progress, Button } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';
const MBox = motion(Box);

export default function StreaksPage(){
  const { hostName } = useContext(chatContext);
  const [mine, setMine] = useState([]);
  const [top, setTop] = useState([]);
  useEffect(()=>{ fetch(hostName+'/streaks/mine',{headers:{'auth-token':localStorage.getItem('token')}}).then(r=>r.json()).then(setMine).catch(()=>setMine([])); fetch(hostName+'/streaks/leaderboard').then(r=>r.json()).then(setTop).catch(()=>setTop([])); }, [hostName]);
  const hide = async (id) => { await fetch(hostName+'/streaks/hide/'+id,{ method:'POST', headers:{'auth-token':localStorage.getItem('token')} }); setMine(m=>m.filter(s=>s._id!==id)); };
  return (
    <MBox p={3} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Streaks</Text>
        <Box>
          <Text fontWeight='semibold' mb={1}>Active</Text>
          <VStack align='stretch'>
            {mine.map(s => (
              <HStack key={s._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
                <HStack>
                  <span role='img' aria-label='fire'>🔥</span>
                  <Text>Friend: {s.friend}</Text>
                  <Badge colorScheme='orange'>{s.count} days</Badge>
                </HStack>
                <HStack>
                  <Progress value={Math.max(0, 100 - (s.timeLeftMs/864000)*10)} w='200px' size='sm' />
                  {s.hourglass && <span role='img' aria-label='hourglass'>⏳</span>}
                  <Button size='sm' variant='outline' onClick={()=>hide(s._id)}>Hide</Button>
                </HStack>
              </HStack>
            ))}
            {mine.length===0 && <Text color='gray.500'>No active streaks.</Text>}
          </VStack>
        </Box>
        <Box>
          <Text fontWeight='semibold' mb={1}>Leaderboard</Text>
          <VStack align='stretch'>
            {top.map(s => (
              <HStack key={'top-'+s._id} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
                <Text>{s.a} ↔ {s.b}</Text>
                <Badge colorScheme='purple'>{s.count}</Badge>
              </HStack>
            ))}
          </VStack>
        </Box>
      </VStack>
    </MBox>
  );
}
