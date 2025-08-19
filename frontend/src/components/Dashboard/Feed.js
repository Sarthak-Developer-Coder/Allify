import React, { useEffect, useState, useContext } from "react";
import { Box, Button, Image, Text, Avatar, Input, HStack, VStack, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Link, Divider, Switch } from "@chakra-ui/react";
import { Link as RouterLink } from "react-router-dom";
import chatContext from "../../context/chatContext";
import StoriesBar from "./StoriesBar";

const Feed = () => {
  const { hostName } = useContext(chatContext);
  const [posts, setPosts] = useState([]);
  const uploader = useDisclosure();
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [commentText, setCommentText] = useState("");
  const [activeComments, setActiveComments] = useState(null);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${hostName}/social/feed`, { headers: { "auth-token": localStorage.getItem("token") } });
      const data = await res.json();
      setPosts(data);
      const bres = await fetch(`${hostName}/user/bookmarks`, { headers: { "auth-token": localStorage.getItem("token") } });
      const bdata = await bres.json();
      setBookmarks(bdata);
    };
    load();
  }, [hostName]);

  const like = async (id) => {
    const res = await fetch(`${hostName}/social/post/${id}/like`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") } });
    const data = await res.json();
    setPosts((prev) => prev.map((p) => (p._id === id ? { ...p, likes: Array(data.likes).fill(0) } : p)));
  };

  const upload = async () => {
    if (!file) return;
    const body = new FormData();
    body.append("file", file);
    body.append("caption", caption);
    const res = await fetch(`${hostName}/social/post`, { method: "POST", headers: { "auth-token": localStorage.getItem("token") }, body });
    const data = await res.json();
    setPosts((prev) => [data, ...prev]);
    setFile(null); setCaption(""); uploader.onClose();
  };

  const postText = async () => {
    if (!caption.trim()) return;
    const res = await fetch(`${hostName}/social/post/text`, { method: "POST", headers: { "Content-Type": "application/json", "auth-token": localStorage.getItem("token") }, body: JSON.stringify({ text: caption }) });
    const data = await res.json();
    setPosts((prev) => [data, ...prev]);
    setCaption("");
  };

  const openComments = async (postId) => {
    const res = await fetch(`${hostName}/social/post/${postId}/comments`, { headers: { "auth-token": localStorage.getItem("token") } });
    const list = await res.json();
    setActiveComments({ postId, list });
  };

  const addComment = async () => {
    if (!activeComments?.postId || !commentText.trim()) return;
    const res = await fetch(`${hostName}/social/post/${activeComments.postId}/comment`, { method: "POST", headers: { "Content-Type": "application/json", "auth-token": localStorage.getItem("token") }, body: JSON.stringify({ text: commentText.trim() }) });
    const c = await res.json();
    setActiveComments((prev) => ({ ...prev, list: [c, ...(prev?.list || [])] }));
    setCommentText("");
  };

  const list = showBookmarks ? bookmarks : posts;

  return (
    <Box p={2}>
  <StoriesBar />
      <HStack justify="space-between">
        <HStack>
          <Text fontSize="xl" fontWeight="bold">{showBookmarks ? 'Bookmarks' : 'Explore'}</Text>
          <HStack ml={4}>
            <Text fontSize="sm">Show bookmarks</Text>
            <Switch isChecked={showBookmarks} onChange={(e) => setShowBookmarks(e.target.checked)} />
          </HStack>
        </HStack>
        <Button onClick={uploader.onOpen}>Create</Button>
      </HStack>
      <VStack spacing={4} mt={3} align="stretch">
        {list.map((p) => (
          <Box key={p._id} p={3} borderWidth="1px" borderRadius="lg" bg="blackAlpha.200">
            <HStack>
              <Avatar src={p.author?.profilePic} name={p.author?.name} />
              <Link as={RouterLink} to={`/profile/${p.author?._id}`} fontWeight="semibold">{p.author?.name}</Link>
            </HStack>
            {p.repostOf && (
              <Text fontSize="xs" color="whiteAlpha.700">Reposted</Text>
            )}
            {p.text && <Text mt={2}>{p.text}</Text>}
            {p.mediaUrl && p.mediaType === "image" && (
              <Image src={p.mediaUrl} alt="post" mt={2} borderRadius="lg" />
            )}
            {p.mediaUrl && p.mediaType === "video" && (
              <video src={p.mediaUrl} controls style={{ width: "100%", borderRadius: 12, marginTop: 8 }} />
            )}
            {p.caption && <Text mt={2}>{p.caption}</Text>}
            <HStack mt={2} spacing={4}>
              <Button size="sm" onClick={() => like(p._id)}>❤️ Like</Button>
              <Text fontSize="sm">{(p.likes || []).length} likes</Text>
              <Button size="sm" onClick={() => openComments(p._id)}>💬 Comments</Button>
              <Button size="sm" onClick={async () => {
                const res = await fetch(`${hostName}/social/post/${p._id}/repost`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({}) });
                const data = await res.json();
                setPosts((prev) => [data, ...prev]);
              }}>🔁 Repost</Button>
              {!showBookmarks ? (
                <Button size="sm" onClick={async () => { await fetch(`${hostName}/user/bookmark/${p._id}`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } }); const b = await (await fetch(`${hostName}/user/bookmarks`, { headers: { 'auth-token': localStorage.getItem('token') } })).json(); setBookmarks(b); }}>🔖 Bookmark</Button>
              ) : (
                <Button size="sm" onClick={async () => { await fetch(`${hostName}/user/unbookmark/${p._id}`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } }); setBookmarks((prev) => prev.filter((bp) => bp._id !== p._id)); }}>🗑️ Remove</Button>
              )}
            </HStack>
            {activeComments?.postId === p._id && (
              <Box mt={2} p={2} bg="blackAlpha.300" borderRadius="md">
                <HStack>
                  <Input placeholder="Write a comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} />
                  <Button onClick={addComment}>Post</Button>
                </HStack>
                <Divider my={2} />
                <VStack align="stretch" spacing={2} maxH="200px" overflowY="auto">
                  {(activeComments.list || []).map((c) => (
                    <HStack key={c._id}>
                      <Avatar size="sm" src={c.author?.profilePic} name={c.author?.name} />
                      <Text><b>{c.author?.name}</b>: {c.text}</Text>
                    </HStack>
                  ))}
                </VStack>
              </Box>
            )}
          </Box>
        ))}
      </VStack>

      <Modal isOpen={uploader.isOpen} onClose={uploader.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create post</ModalHeader>
          <ModalBody>
            <Input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} mb={2} />
            {file && file.type.startsWith("image/") && (
              <Image src={URL.createObjectURL(file)} alt="preview" borderRadius="md" mb={2} />
            )}
            <Input placeholder="Write a caption or text..." value={caption} onChange={(e) => setCaption(e.target.value)} />
            <Button mt={2} onClick={postText}>Post text only</Button>
          </ModalBody>
          <ModalFooter>
            <Button onClick={upload} isDisabled={!file}>Post</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Feed;
