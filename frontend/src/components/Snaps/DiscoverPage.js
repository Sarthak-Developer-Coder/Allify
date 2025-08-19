import React, { useEffect, useState, useContext, useCallback } from 'react';
import { Box, VStack, Text, HStack, Button, Input, SimpleGrid, Image, Badge, useToast } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

export default function DiscoverPage(){
  const { hostName } = useContext(chatContext);
  const [items, setItems] = useState([]);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState('');
  const [q, setQ] = useState('');
  const toast = useToast();

  const load = useCallback(async (term='') => {
    try { const r = await fetch(hostName + '/spotlight/feed' + (term? ('?q='+encodeURIComponent(term)) : '' )); const d = await r.json(); setItems(Array.isArray(d)?d:[]); } catch { setItems([]); }
  }, [hostName]);
  useEffect(()=>{ load(); }, [load]);

  const create = async () => {
    if (!file) return; if (!file.type.startsWith('image/')) return toast({ title:'Only images', status:'error' });
    const f = new FormData(); f.append('file', file); f.append('caption', caption); f.append('tags', tags);
    const r = await fetch(hostName + '/spotlight/create', { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') }, body: f });
    if (!r.ok) return toast({ title:'Post failed', status:'error' });
    setFile(null); setCaption(''); setTags(''); toast({ title:'Posted', status:'success' }); load();
  };

  const like = async (id) => {
    try { await fetch(hostName + '/spotlight/like/'+id, { method:'POST', headers:{ 'auth-token': localStorage.getItem('token') } }); load(q); } catch {}
  };

  return (
    <Box p={4}>
      <VStack align='stretch' spacing={3}>
        <Text fontSize='2xl' fontWeight='bold'>Discover</Text>
        <HStack>
          <Input placeholder='Search Discover' value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(q)} />
          <Button onClick={()=>load(q)}>Search</Button>
        </HStack>
        <HStack>
          <Input type='file' accept='image/*' onChange={e=>setFile(e.target.files?.[0]||null)} />
          <Input placeholder='Caption' value={caption} onChange={e=>setCaption(e.target.value)} />
          <Input placeholder='tags comma-separated' value={tags} onChange={e=>setTags(e.target.value)} />
          <Button onClick={create}>Post</Button>
        </HStack>
        <SimpleGrid columns={[2,3,4]} spacing={3}>
          {items.map(it => (
            <Box key={it._id} borderWidth='1px' borderRadius='md' overflow='hidden'>
              <Image src={it.mediaUrl} alt={it.caption} />
              <Box p={2}>
                <HStack justify='space-between'>
                  <Text fontSize='sm'>{it.author?.name || 'User'}</Text>
                  <Button size='xs' onClick={()=>like(it._id)}>❤️ {it.likes?.length||0}</Button>
                </HStack>
                {it.caption && <Text fontSize='sm' mt={1}>{it.caption}</Text>}
                <HStack mt={1} wrap='wrap'>
                  {(it.tags||[]).map(t => <Badge key={t} colorScheme='purple'>#{t}</Badge>)}
                </HStack>
              </Box>
            </Box>
          ))}
        </SimpleGrid>
      </VStack>
    </Box>
  );
}
