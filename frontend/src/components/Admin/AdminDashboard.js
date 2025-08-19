import React, { useEffect, useState, useContext } from 'react';
import { Box, VStack, Text, SimpleGrid, Stat, StatLabel, StatNumber, Alert, AlertIcon } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import chatContext from '../../context/chatContext';
const MBox = motion(Box);

export default function AdminDashboard(){
  const { hostName } = useContext(chatContext);
  const [m, setM] = useState({ users: 0, snaps7d: 0, stories7d: 0, spotlights7d: 0 });
  const [forbidden, setForbidden] = useState(false);
  useEffect(()=>{ (async()=>{
    try {
      const r = await fetch(hostName + '/admin/metrics', { headers:{ 'auth-token': localStorage.getItem('token') } });
      if (r.status === 403) { setForbidden(true); return; }
      const d = await r.json(); setM(d||{});
    } catch { setForbidden(true); }
  })(); }, [hostName]);
  return (
    <MBox p={4} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <VStack align='stretch' spacing={4}>
        <Text fontSize='2xl' fontWeight='bold'>Admin Dashboard</Text>
        {forbidden && (
          <Alert status='warning'>
            <AlertIcon /> Admin access required.
          </Alert>
        )}
        <SimpleGrid columns={[2,2,4]} spacing={4}>
          <Stat borderWidth='1px' borderRadius='md' p={3}><StatLabel>Users</StatLabel><StatNumber>{m.users||0}</StatNumber></Stat>
          <Stat borderWidth='1px' borderRadius='md' p={3}><StatLabel>Snaps (7d)</StatLabel><StatNumber>{m.snaps7d||0}</StatNumber></Stat>
          <Stat borderWidth='1px' borderRadius='md' p={3}><StatLabel>Stories (7d)</StatLabel><StatNumber>{m.stories7d||0}</StatNumber></Stat>
          <Stat borderWidth='1px' borderRadius='md' p={3}><StatLabel>Spotlight (7d)</StatLabel><StatNumber>{m.spotlights7d||0}</StatNumber></Stat>
        </SimpleGrid>
      </VStack>
  </MBox>
  );
}
