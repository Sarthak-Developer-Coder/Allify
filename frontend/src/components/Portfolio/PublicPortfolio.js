import React, { useEffect, useState, useContext } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Heading, Text, HStack, VStack, Avatar, SimpleGrid, Link, Tag, Image, Wrap, WrapItem } from '@chakra-ui/react';
import chatContext from '../../context/chatContext';

export default function PublicPortfolio() {
  const { slug } = useParams();
  const { hostName } = useContext(chatContext);
  const [data, setData] = useState();

  useEffect(()=>{ (async()=>{
    const res = await fetch(`${hostName}/portfolio/public/${slug}`);
    if (res.ok) setData(await res.json());
  })(); }, [hostName, slug]);

  if (!data) return null;
  const { user, profile, stats } = data;

  const accent = profile?.accentColor || '#805AD5';
  const isDark = (profile?.theme||'light') === 'dark';
  return (
    <Box p={6} maxW='1000px' m='0 auto' bg={isDark?'blackAlpha.200':'whiteAlpha.700'} borderRadius='lg'>
      <HStack>
        <Avatar src={user?.profilePic} name={user?.name} size='lg' />
        <VStack align='start' spacing={0}>
          <Heading size='md' color={accent}>{user?.name}</Heading>
          <Text color='gray.500'>{profile?.headline}</Text>
        </VStack>
      </HStack>
      <Text mt={4}>{profile?.bio}</Text>
      <HStack mt={2} spacing={4}>
        {profile?.website && <Link href={profile.website} color={accent} fontWeight='bold' isExternal>Website</Link>}
        {profile?.socials?.github && <Link href={profile.socials.github} color={accent} fontWeight='bold' isExternal>GitHub</Link>}
        {profile?.socials?.linkedin && <Link href={profile.socials.linkedin} color={accent} fontWeight='bold' isExternal>LinkedIn</Link>}
        {profile?.socials?.twitter && <Link href={profile.socials.twitter} color={accent} fontWeight='bold' isExternal>Twitter</Link>}
      </HStack>
      {Array.isArray(profile?.badges) && profile.badges.length > 0 && (
        <Box mt={4}>
          <Heading size='sm' mb={2}>Badges</Heading>
          <Wrap>
            {profile.badges.map((b, idx) => (
              <WrapItem key={idx}>
                <HStack borderWidth='1px' borderRadius='md' p={2}>
                  {b.iconUrl ? <Image src={b.iconUrl} alt={b.title} boxSize='20px' /> : null}
                  <Tag colorScheme='purple' variant='subtle'>{b.title}</Tag>
                </HStack>
              </WrapItem>
            ))}
          </Wrap>
        </Box>
      )}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mt={6}>
        <Box borderWidth='1px' borderRadius='md' p={3}><Heading size='sm' color={accent}>Questions</Heading><Text fontSize='2xl' fontWeight='bold' color={accent}>{stats?.questions||0}</Text></Box>
        <Box borderWidth='1px' borderRadius='md' p={3}><Heading size='sm' color={accent}>Sheets</Heading><Text fontSize='2xl' fontWeight='bold' color={accent}>{stats?.sheets||0}</Text></Box>
        <Box borderWidth='1px' borderRadius='md' p={3}><Heading size='sm' color={accent}>Upcoming</Heading><Text fontSize='2xl' fontWeight='bold' color={accent}>{stats?.upcoming||0}</Text></Box>
      </SimpleGrid>
      {Array.isArray(profile?.projects) && profile.projects.length > 0 && (
        <Box mt={6}>
          <Heading size='sm' mb={2}>Projects</Heading>
          {profile.projects.map(pr => (
            <Box key={pr._id} borderWidth='1px' borderRadius='md' p={3} mb={2}>
              <HStack justify='space-between'>
                <Text fontWeight='bold'>{pr.title}</Text>
                {pr.url && <Link href={pr.url} color='purple.500' isExternal>Open</Link>}
              </HStack>
              {pr.tags?.length ? <Text mt={1} fontSize='sm'>Tags: {pr.tags.join(', ')}</Text> : null}
              {pr.description ? <Text mt={1} fontSize='sm' color='gray.600'>{pr.description}</Text> : null}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}
