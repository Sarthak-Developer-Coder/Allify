import React, { useEffect, useState, useContext } from 'react';
import { Box, Heading, VStack, HStack, Avatar, Text } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

export default function PortfolioLeaderboard() {
  const { hostName } = useContext(chatContext);
  const [rows, setRows] = useState([]);

  useEffect(() => { (async () => {
    try {
      const res = await fetch(`${hostName}/portfolio/leaderboard`);
      if (res.ok) setRows(await res.json());
    } catch {}
  })(); }, [hostName]);

  return (
    <Box>
      <Heading size='md' mb={3}>Leaderboard</Heading>
      <VStack align='stretch' spacing={2}>
        {rows.map((r, i) => (
          <HStack key={i} borderWidth='1px' borderRadius='md' p={2} justify='space-between'>
            <HStack>
              <Text w='24px' textAlign='right' color='gray.500'>#{i+1}</Text>
              <Avatar size='sm' src={r.user?.profilePic} name={r.user?.name} />
              <Text>{r.user?.name}</Text>
            </HStack>
            <Text fontWeight='bold'>{r.solved} solved</Text>
          </HStack>
        ))}
        {rows.length === 0 && <Text color='gray.500'>No data yet.</Text>}
      </VStack>
    </Box>
  );
}
