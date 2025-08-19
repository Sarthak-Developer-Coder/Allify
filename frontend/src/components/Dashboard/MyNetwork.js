import React, { useContext, useEffect, useState, useCallback } from 'react';
import { Box, Heading, HStack, VStack, Text, Avatar, Button, SimpleGrid, useToast, Input, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

const PersonRow = ({ p, right }) => (
  <HStack key={p._id} p={3} borderWidth='1px' borderRadius='md' justify='space-between'>
    <HStack>
      <Avatar size='sm' name={p.name} src={p.profilePic} />
      <Box>
        <Text fontWeight='semibold'>{p.name}</Text>
        {p.headline && <Text fontSize='sm' color='gray.500'>{p.headline}</Text>}
      </Box>
    </HStack>
    {right}
  </HStack>
);

const MyNetwork = () => {
  const { hostName } = useContext(chatContext);
  const [invites, setInvites] = useState([]);
  const [connections, setConnections] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [sentInvites, setSentInvites] = useState([]);
  const [q, setQ] = useState('');
  const toast = useToast();

  const tokenHeader = { 'auth-token': localStorage.getItem('token') };

  const loadAll = useCallback(async () => {
    const hdr = { 'auth-token': localStorage.getItem('token') };
    try {
      const [inv, con, sug, sent] = await Promise.all([
        fetch(`${hostName}/user/invites`, { headers: hdr }).then(r => r.json()),
        fetch(`${hostName}/user/connections`, { headers: hdr }).then(r => r.json()),
        fetch(`${hostName}/user/non-friends`, { headers: hdr }).then(r => r.json()),
        fetch(`${hostName}/user/invites/sent`, { headers: hdr }).then(r => r.json()),
      ]);
      setInvites(inv || []);
      setConnections(con || []);
      setSuggestions((sug || []).slice(0, 10));
      setSentInvites(sent || []);
    } catch (e) {
      console.log(e);
    }
  }, [hostName]);

  useEffect(() => {
  loadAll();
  // realtime refresh
  const s = window.__appSocket;
  const handler = () => loadAll();
  if (s) s.on('network:update', handler);
  return () => { if (s) s.off('network:update', handler); };
  }, [loadAll]);

  const accept = async (id) => {
    await fetch(`${hostName}/user/connect/${id}/accept`, { method: 'POST', headers: tokenHeader });
    toast({ title: 'Connection accepted', status: 'success', duration: 1500 });
    loadAll();
  };

  const connect = async (id) => {
    await fetch(`${hostName}/user/connect/${id}`, { method: 'POST', headers: tokenHeader });
    toast({ title: 'Invite sent', status: 'info', duration: 1500 });
    loadAll();
  };

  const decline = async (id) => {
    await fetch(`${hostName}/user/connect/${id}/decline`, { method: 'POST', headers: tokenHeader });
    toast({ title: 'Invite declined', status: 'info', duration: 1200 });
    loadAll();
  };

  const cancel = async (id) => {
    await fetch(`${hostName}/user/connect/${id}/cancel`, { method: 'POST', headers: tokenHeader });
    toast({ title: 'Invite withdrawn', status: 'info', duration: 1200 });
    loadAll();
  };

  const remove = async (id) => {
    await fetch(`${hostName}/user/connections/${id}/remove`, { method: 'POST', headers: tokenHeader });
    toast({ title: 'Connection removed', status: 'warning', duration: 1200 });
    loadAll();
  };

  const search = async () => {
    if (!q.trim()) return setSuggestions([]);
    const list = await fetch(`${hostName}/user/network/search?q=${encodeURIComponent(q)}`, { headers: tokenHeader }).then(r => r.json());
    setSuggestions(list || []);
  };

  return (
    <Box p={2}>
      <HStack mb={4}>
        <Input placeholder='Search people' value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} />
        <Button onClick={search}>Search</Button>
      </HStack>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Box>
          <Heading size='md' mb={3}>Invitations</Heading>
          <VStack align='stretch' spacing={3}>
            {invites.length === 0 && <Text color='gray.500'>No pending invites</Text>}
            {invites.map(p => (
              <PersonRow key={p._id} p={p} right={<HStack><Button size='sm' onClick={() => accept(p._id)}>Accept</Button><Button size='sm' variant='outline' onClick={() => decline(p._id)}>Decline</Button></HStack>} />
            ))}
          </VStack>
        </Box>
        <Box>
          <Heading size='md' mb={3}>Connections</Heading>
          <VStack align='stretch' spacing={3}>
            {connections.length === 0 && <Text color='gray.500'>No connections yet</Text>}
            {connections.map(p => (
              <PersonRow key={p._id} p={p} right={<HStack><Text fontSize='sm' color='gray.500'>{p.location || ''}</Text><Button size='xs' variant='outline' onClick={() => remove(p._id)}>Remove</Button></HStack>} />
            ))}
          </VStack>
        </Box>
      </SimpleGrid>

      <Box mt={6}>
        <Tabs variant='enclosed'>
          <TabList>
            <Tab>People you may know</Tab>
            <Tab>Sent invites</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                {suggestions.map(p => (
                  <PersonRow key={p._id} p={p} right={<Button size='sm' variant='outline' onClick={() => connect(p._id)}>Connect</Button>} />
                ))}
              </SimpleGrid>
            </TabPanel>
            <TabPanel>
              <VStack align='stretch' spacing={3}>
                {sentInvites.length === 0 && <Text color='gray.500'>No sent invites</Text>}
                {sentInvites.map(p => (
                  <PersonRow key={p._id} p={p} right={<Button size='sm' variant='outline' onClick={() => cancel(p._id)}>Withdraw</Button>} />
                ))}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Box>
  );
};

export default MyNetwork;
