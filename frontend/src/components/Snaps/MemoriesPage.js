import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Box, VStack, Text, HStack, Button, Input, Image, SimpleGrid, useToast, Tabs, TabList, TabPanels, Tab, TabPanel, Badge } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

export default function MemoriesPage(){
  const { hostName } = useContext(chatContext);
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [q, setQ] = useState('');
  const [albums, setAlbums] = useState([]);
  const toast = useToast();

  const load = useCallback(async () => {
    try { const r = await fetch(hostName + '/memories', { headers: { 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); setItems(Array.isArray(d)?d:[]); } catch { setItems([]); }
  }, [hostName]);
  useEffect(()=>{ load(); }, [load]);
  useEffect(()=>{ (async()=>{ try{ const r=await fetch(hostName+'/memories/albums',{ headers:{'auth-token':localStorage.getItem('token')} }); const d=await r.json(); setAlbums(Array.isArray(d)?d:[]);}catch{ setAlbums([]);} })(); }, [hostName]);

  const upload = async () => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast({ title:'Only images allowed', status:'error' }); return; }
    const form = new FormData(); form.append('file', file); form.append('caption', caption);
    const r = await fetch(hostName + '/memories/upload', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') }, body: form });
    if (!r.ok) return toast({ title:'Upload failed', status:'error' });
    setFile(null); setCaption(''); await load(); toast({ title:'Saved to Memories', status:'success' });
  };

  const doSearch = async () => {
    const term = q.trim(); if (!term) return;
    try { const r = await fetch(hostName + '/memories/search?q=' + encodeURIComponent(term), { headers:{ 'auth-token': localStorage.getItem('token') } }); const d = await r.json(); setItems(Array.isArray(d)?d:[]); } catch {}
  };

  return (
    <Box p={4}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Memories</Text>
        <HStack>
          <Input type='file' accept='image/*' onChange={e=>setFile(e.target.files?.[0]||null)} />
          <Input placeholder='Caption (optional)' value={caption} onChange={e=>setCaption(e.target.value)} />
          <Button onClick={upload}>Upload</Button>
        </HStack>

        <Tabs variant='enclosed'>
          <TabList>
            <Tab>All</Tab>
            <Tab>Search</Tab>
            <Tab>Albums <Badge ml={2}>{albums.length}</Badge></Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <SimpleGrid columns={[2,3,4]} spacing={3}>
                {items.map(it => (
                  <Box key={it._id} borderWidth='1px' borderRadius='md' overflow='hidden'>
                    <Image src={it.mediaUrl} alt={it.caption} />
                    {it.caption && <Box p={2}><Text fontSize='sm'>{it.caption}</Text></Box>}
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>
            <TabPanel>
              <HStack mb={3}>
                <Input placeholder='Search captions or tags' value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doSearch()} />
                <Button onClick={doSearch}>Search</Button>
                <Button variant='ghost' onClick={load}>Reset</Button>
              </HStack>
              <SimpleGrid columns={[2,3,4]} spacing={3}>
                {items.map(it => (
                  <Box key={it._id} borderWidth='1px' borderRadius='md' overflow='hidden'>
                    <Image src={it.mediaUrl} alt={it.caption} />
                    {it.caption && <Box p={2}><Text fontSize='sm'>{it.caption}</Text></Box>}
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>
            <TabPanel>
              <SimpleGrid columns={[1,2,3]} spacing={4}>
                {albums.map(al => (
                  <Box key={al.key} borderWidth='1px' borderRadius='md' overflow='hidden'>
                    <Image src={al.cover} alt={al.key} />
                    <Box p={2}><Text fontWeight='semibold'>{al.key} <Badge ml={2}>{al.count}</Badge></Text></Box>
                  </Box>
                ))}
              </SimpleGrid>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Box>
  );
}
