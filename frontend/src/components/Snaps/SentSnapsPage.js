import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Box, VStack, Text, HStack, Badge } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import MotionButton from '../ui/MotionButton';
import chatContext from '../../context/chatContext';
const MBox = motion(Box);

export default function SentSnapsPage(){
  const { hostName } = useContext(chatContext);
  const [items, setItems] = useState([]);
  const load = useCallback(async () => { try { const r = await fetch(hostName + '/snaps/sent', { headers:{ 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); setItems(Array.isArray(d)?d:[]);}catch{setItems([]);} }, [hostName]);
  useEffect(()=>{ load(); }, [load]);
  const del = async (id) => { try { const r = await fetch(hostName + '/snaps/' + id, { method:'DELETE', headers:{ 'auth-token': localStorage.getItem('token') } }); if (r.ok) load(); } catch {} };
  return (
  <MBox p={4} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Sent Snaps</Text>
        {items.map(s => (
          <HStack key={s._id} justify='space-between' borderWidth='1px' borderRadius='md' p={2}>
            <HStack>
              <Badge colorScheme='purple'>to</Badge>
              <Text>{s.receiver?.name || s.receiver}</Text>
            </HStack>
            <HStack>
              {s.viewedAt ? <Badge colorScheme='green'>Opened</Badge> : <Badge>Delivered</Badge>}
                  {!s.viewedAt && <MotionButton size='sm' onClick={()=>del(s._id)}>Delete</MotionButton>}
            </HStack>
          </HStack>
        ))}
        {items.length===0 && <Text color='gray.500'>No sent snaps.</Text>}
      </VStack>
  </MBox>
  );
}
