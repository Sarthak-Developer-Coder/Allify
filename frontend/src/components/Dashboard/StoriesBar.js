import React, { useEffect, useState, useContext } from "react";
import { Box, HStack, Avatar, Button, useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, Image, Text, Spinner } from "@chakra-ui/react";
import chatContext from "../../context/chatContext";

const StoriesBar = () => {
  const { hostName } = useContext(chatContext);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const uploader = useDisclosure();
  const viewer = useDisclosure();
  const [file, setFile] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${hostName}/social/stories`, { headers: { 'auth-token': localStorage.getItem('token') } });
        const data = await res.json();
        setStories(data);
      } catch {}
      setLoading(false);
    };
    run();
  }, [hostName]);

  const createStory = async () => {
    if (!file) return;
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${hostName}/social/stories`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') }, body });
    if (res.ok) {
      uploader.onClose();
      setFile(null);
      // refresh
      const r = await fetch(`${hostName}/social/stories`, { headers: { 'auth-token': localStorage.getItem('token') } });
      const d = await r.json();
      setStories(d);
    }
  };

  return (
    <Box px={1} py={2} overflowX="auto" whiteSpace="nowrap">
      <HStack spacing={3}>
        <Button size="sm" onClick={uploader.onOpen}>+ Add Story</Button>
        {loading ? <Spinner size="sm" /> : stories.map((s) => (
          <Box key={s._id} textAlign="center">
            <Avatar src={s.author?.profilePic} name={s.author?.name} borderWidth="2px" borderColor="purple.400" cursor="pointer" onClick={() => { setActive(s); viewer.onOpen(); }} />
            <Text fontSize="xs" mt={1} noOfLines={1} maxW="60px">{s.author?.name}</Text>
          </Box>
        ))}
      </HStack>

      {/* Upload story */}
      <Modal isOpen={uploader.isOpen} onClose={uploader.onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Story</ModalHeader>
          <ModalBody>
            <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0])} />
          </ModalBody>
          <ModalFooter>
            <Button onClick={createStory} isDisabled={!file}>Upload</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* View story */}
      <Modal isOpen={viewer.isOpen} onClose={viewer.onClose} size="xl" isCentered>
        <ModalOverlay />
        <ModalContent bg="black">
          <ModalHeader color="white">{active?.author?.name}</ModalHeader>
          <ModalBody display="flex" justifyContent="center">
            {active?.mediaType === 'image' ? (
              <Image src={active?.mediaUrl} maxH="70vh" borderRadius={8} />
            ) : (
              <video src={active?.mediaUrl} controls autoPlay style={{ maxHeight: '70vh', borderRadius: 8 }} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default StoriesBar;
