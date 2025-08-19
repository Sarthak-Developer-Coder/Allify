import React, { useEffect, useRef, useState, useContext } from "react";
import { Box, VStack, Text, IconButton, Spinner, useToast } from "@chakra-ui/react";
import { FaHeart, FaComment, FaVolumeMute, FaVolumeUp } from "react-icons/fa";
import chatContext from "../../context/chatContext";

// A minimal vertical Reels/Shorts viewer: auto-plays one video at a time, swipe/keys to change
const Reels = () => {
  const { hostName } = useContext(chatContext);
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const vref = useRef(null);
  const [muted, setMuted] = useState(true);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${hostName}/social/reels`, { headers: { "auth-token": localStorage.getItem("token") } });
        const data = await res.json();
        setList(data);
      } catch {}
      setLoading(false);
    };
    load();
  }, [hostName]);

  useEffect(() => {
  const r = list[idx];
  if (!r) return;
  vref.current?.play?.().catch(() => {});
  setLikeCount(r.likes?.length || 0);
  setLiked((r.likes || []).includes(r.me));
  }, [idx, list]);

  const onWheel = (e) => {
    if (e.deltaY > 0) setIdx((i) => Math.min(i + 1, Math.max(0, list.length - 1)));
    else setIdx((i) => Math.max(0, i - 1));
  };

  if (loading) return <Spinner />;
  if (!list.length) return <Text p={3}>No reels yet.</Text>;

  const reel = list[idx];

  const toggleLike = async () => {
    try {
      const res = await fetch(`${hostName}/social/post/${reel._id}/like`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } });
      if (!res.ok) throw new Error('Like failed');
      setLiked((s) => !s);
      setLikeCount((c) => (liked ? Math.max(0, c - 1) : c + 1));
    } catch (e) { toast({ title: e.message, status: 'error' }); }
  };

  const onDoubleTap = (() => {
    let last = 0;
    return () => {
      const now = Date.now();
      if (now - last < 300) toggleLike();
      last = now;
    };
  })();

  return (
    <Box h={{ base: "80vh", md: "88vh" }} onWheel={onWheel} display="flex" alignItems="center" justifyContent="center">
      <Box position="relative" w={{ base: "90vw", md: "420px" }} h={{ base: "70vh", md: "75vh" }} borderRadius="xl" overflow="hidden" bg="black" onClick={onDoubleTap}>
        <video ref={vref} src={reel.mediaUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted={muted} controls={false} autoPlay playsInline />
        <IconButton aria-label={muted ? 'unmute' : 'mute'} icon={muted ? <FaVolumeMute /> : <FaVolumeUp />} position="absolute" top={2} left={2} size="sm" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} />
        <VStack position="absolute" right={2} bottom={4} spacing={3}>
          <IconButton aria-label="like" icon={<FaHeart color={liked ? 'red' : 'white'} />} onClick={(e) => { e.stopPropagation(); toggleLike(); }} />
          <Text color="white" fontSize="sm">{likeCount}</Text>
          <IconButton aria-label="comment" icon={<FaComment />} onClick={(e) => { e.stopPropagation(); toast({ title: 'Comments UI coming soon' }); }} />
        </VStack>
        <Box position="absolute" left={3} bottom={3} right={60} color="white">
          <Text fontWeight="bold">{reel.author?.name}</Text>
          {reel.caption && <Text noOfLines={2} opacity={0.9}>{reel.caption}</Text>}
        </Box>
      </Box>
    </Box>
  );
};

export default Reels;
