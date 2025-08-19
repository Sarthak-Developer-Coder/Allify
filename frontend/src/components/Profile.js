import React, { useEffect, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { Box, Avatar, Text, Button, HStack, VStack, useToast, SimpleGrid, Image as Img } from "@chakra-ui/react";
import chatContext from "../context/chatContext";

const Profile = () => {
  const { id } = useParams();
  const { hostName, user } = useContext(chatContext);
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${hostName}/user/profile/${id}`, { headers: { "auth-token": localStorage.getItem("token") } });
      const data = await res.json();
      setProfile(data);
      const pres = await fetch(`${hostName}/social/user/${id}/posts`, { headers: { 'auth-token': localStorage.getItem('token') } });
      const plist = await pres.json();
      setPosts(plist);
      setLoading(false);
    };
    load();
  }, [hostName, id]);

  const follow = async () => {
    await fetch(`${hostName}/user/${id}/follow`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") } });
    const res = await fetch(`${hostName}/user/profile/${id}`, { headers: { "auth-token": localStorage.getItem("token") } });
    const data = await res.json();
    setProfile(data);
  };

  const unfollow = async () => {
    await fetch(`${hostName}/user/${id}/unfollow`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") } });
    const res = await fetch(`${hostName}/user/profile/${id}`, { headers: { "auth-token": localStorage.getItem("token") } });
    const data = await res.json();
    setProfile(data);
  };

  const block = async () => {
    await fetch(`${hostName}/user/block/${id}`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") } });
    toast({ title: "Blocked", duration: 1200 });
  };
  const unblock = async () => {
    await fetch(`${hostName}/user/unblock/${id}`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") } });
    toast({ title: "Unblocked", duration: 1200 });
  };

  if (loading || !profile) return <Text p={3}>Loading...</Text>;

  const isMe = user?._id === profile._id;

  return (
    <Box p={4}>
      <HStack spacing={4}>
        <Avatar size="xl" src={profile.profilePic} name={profile.name} />
        <VStack align="start" spacing={1}>
          <Text fontSize="xl" fontWeight="bold">{profile.name}</Text>
          <Text>{profile.about}</Text>
          <HStack>
            <Text>{profile.followersCount} followers</Text>
            <Text>•</Text>
            <Text>{profile.followingCount} following</Text>
          </HStack>
          {!isMe && (
            <HStack>
              <Button onClick={follow}>Follow</Button>
              <Button variant="outline" onClick={unfollow}>Unfollow</Button>
              <Button variant="ghost" onClick={block}>Block</Button>
              <Button variant="ghost" onClick={unblock}>Unblock</Button>
            </HStack>
          )}
        </VStack>
      </HStack>
      {!!posts.length && (
        <Box mt={6}>
          <Text fontWeight="bold" mb={2}>Posts</Text>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2}>
            {posts.map((p) => (
              <Box key={p._id} bg="blackAlpha.300" borderRadius={8} overflow="hidden">
                {p.mediaUrl ? (
                  p.mediaType === 'image' ? (
                    <Img src={p.mediaUrl} alt="post" />
                  ) : (
                    <video src={p.mediaUrl} style={{ width: '100%' }} />
                  )
                ) : (
                  <Box p={2}><Text noOfLines={4}>{p.text || p.caption}</Text></Box>
                )}
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Box>
  );
};

export default Profile;
