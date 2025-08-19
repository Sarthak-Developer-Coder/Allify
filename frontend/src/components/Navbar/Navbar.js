import React, { useContext, useEffect, useState } from "react";
import { Box, Button, Flex, Text, Link, useDisclosure, useColorMode, IconButton, Menu, MenuButton, MenuList, MenuItem, Badge, HStack, Select, Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, Input, VStack } from "@chakra-ui/react";
import { FaGithub, FaMoon, FaSun } from "react-icons/fa";
import { BellIcon } from "@chakra-ui/icons";
import ProfileMenu from "./ProfileMenu";
import chatContext from "../../context/chatContext";
import { motion } from "framer-motion";
import MotionButton from "../ui/MotionButton";

const Navbar = (props) => {
  const context = useContext(chatContext);
  const { isAuthenticated, hostName } = context;
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const [icon, seticon] = useState(colorMode === "dark" ? <FaSun /> : <FaMoon />);
  const [notifications, setNotifications] = useState([]);
  const unread = notifications.filter(n => !n.read).length;
  const [themeFlair, setThemeFlair] = useState(localStorage.getItem('flair') || 'anime');
  const imagesModal = useDisclosure();
  const [newImage, setNewImage] = useState('');
  const [images, setImages] = useState(() => {
    try { const raw = localStorage.getItem('animeImages'); const arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch { return []; }
  });

  const path = window.location.pathname;

  const handleToggle = () => {
  const next = colorMode === "dark" ? "light" : "dark";
  seticon(next === "dark" ? <FaSun /> : <FaMoon />);
  toggleColorMode();
  };

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await fetch(`${hostName}/notifications`, { headers: { 'auth-token': localStorage.getItem('token') } });
        const data = await res.json();
        setNotifications(Array.isArray(data) ? data : []);
      } catch {}
    };
    if (isAuthenticated) fetchNotifs();
  }, [hostName, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onRealtime = (n) => {
      setNotifications((prev) => [{ _id: `${Date.now()}`, type: n?.type || 'notification', data: n?.data || {}, read: false, createdAt: new Date().toISOString() }, ...prev].slice(0, 50));
    };
    try {
      // socket is exposed via context; import lazily to avoid circular deps
      const globalSocket = window.__appSocket;
      if (globalSocket) {
        globalSocket.on('notification', onRealtime);
        return () => globalSocket.off('notification', onRealtime);
      }
    } catch {}
  }, [isAuthenticated]);

  const markAllRead = async () => {
    try {
      await fetch(`${hostName}/notifications/read`, { method: 'POST', headers: { 'auth-token': localStorage.getItem('token') } });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch {}
  };

  useEffect(() => {
    // apply flair as class on body for future flair-specific styles
    localStorage.setItem('flair', themeFlair);
    document.body.classList.remove('flair-anime', 'flair-neon', 'flair-minimal');
    document.body.classList.add(`flair-${themeFlair}`);
  }, [themeFlair]);

  const saveImages = (list) => {
    localStorage.setItem('animeImages', JSON.stringify(list));
    setImages(list);
    window.dispatchEvent(new Event('anime-images-change'));
  };
  const addImage = () => {
    const url = newImage.trim();
    if (!url) return;
    if (images.includes(url)) return;
    const list = [...images, url];
    saveImages(list);
    setNewImage('');
  };
  const removeImage = (url) => {
    const list = images.filter((u) => u !== url);
    saveImages(list);
  };

  return (
    <>
      {!path.includes("dashboard") && (
        <Box
          position={"absolute"}
          top={5}
          left={5}
          display={{
            md: "none",
            base: "flex",
          }}
        >
          <Button
            p={3}
            borderRadius={"full"}
            borderWidth={1}
            fontSize={"small"}
            backgroundColor={"transparent"}
            onClick={handleToggle}
            mx={1}
          >
            {icon}
          </Button>
          <Link
            p={3}
            borderRadius={"full"}
            borderWidth={1}
            fontSize={"small"}
            backgroundColor={"transparent"}
            href="https://github.com/Sarthak-Developer-Coder"
            mx={1}
          >
            <FaGithub />
          </Link>
        </Box>
      )}
      <Box
        position="sticky"
        top={0}
        zIndex={10}
        p={3}
        w={{ base: "94vw", md: "99vw" }}
        m={2}
        borderRadius="2xl"
        bgGradient={
          colorMode === "dark"
            ? "linear(to-r, blackAlpha.400, whiteAlpha.100)"
            : "linear(to-r, whiteAlpha.800, whiteAlpha.500)"
        }
        backdropFilter="blur(10px)"
        borderWidth="1px"
        borderColor={colorMode === "dark" ? "whiteAlpha.300" : "blackAlpha.200"}
        display={{ base: "none", md: "block" }}
        boxShadow="lg"
      >
        <Flex justify={"space-between"} align="center">
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Text fontSize="2xl" fontWeight="extrabold" bgGradient="linear(to-r, brand.400, cyan.300)" bgClip="text">
              Allify
            </Text>
          </motion.div>

          <Box
            display={{ base: "none", md: "block" }}
            justifyContent="space-between"
            alignItems="center"
          >
            <Select size="sm" value={themeFlair} onChange={(e) => setThemeFlair(e.target.value)} w="36" mr={2} variant="filled">
              <option value="anime">Anime</option>
              <option value="neon">Neon</option>
              <option value="minimal">Minimal</option>
            </Select>
            <MotionButton size="sm" variant="outline" mr={2} onClick={imagesModal.onOpen}>Anime images</MotionButton>
            <Button
              onClick={handleToggle}
              mr={2}
              borderRadius="full"
              fontSize="sm"
              variant="ghost"
              _hover={{ bg: colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.100" }}
              p={3}
            >
              {icon}
            </Button>
            {isAuthenticated && (
              <Menu>
                <MenuButton as={IconButton} variant="ghost" borderRadius="full" mr={2} icon={
                  <HStack>
                    <BellIcon />
                    {unread > 0 && <Badge colorScheme="red" borderRadius="full">{unread}</Badge>}
                  </HStack>
                } />
                <MenuList maxW="sm">
                  <MenuItem onClick={markAllRead}>Mark all as read</MenuItem>
                  {notifications.length === 0 && <MenuItem isDisabled>No notifications</MenuItem>}
                  {notifications.map(n => (
                    <MenuItem key={n._id}>
                      <Box>
                        <Text fontSize="sm" fontWeight={n.read ? 'normal' : 'semibold'}>{n.type}</Text>
                        {n.data && n.data.text && <Text fontSize="xs" color="gray.500">{n.data.text}</Text>}
                      </Box>
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            )}
            <Button
              borderRadius="full"
              fontSize="sm"
              variant="ghost"
              p={3}
              mr={2}
              _hover={{ bg: colorMode === "dark" ? "whiteAlpha.200" : "blackAlpha.100" }}
              onClick={() => {
                window.open("https://github.com/Sarthak-Developer-Coder");
              }}
            >
              <FaGithub />
            </Button>
            {isAuthenticated && (
              <ProfileMenu isOpen={isOpen} onOpen={onOpen} onClose={onClose} />
            )}
            {isAuthenticated && (
              <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/portfolio'; }}>Portfolio</MotionButton>
            )}
            <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/paint'; }}>Paint</MotionButton>
            <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/meet'; }}>Meet</MotionButton>
            <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/snaps'; }}>Snaps</MotionButton>
            <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/music'; }}>Music</MotionButton>
            <MotionButton size="sm" ml={2} onClick={() => { window.location.href = '/assistant'; }}>Assistant</MotionButton>
          </Box>
        </Flex>
      </Box>

      {/* Anime Images Modal */}
      <Modal isOpen={imagesModal.isOpen} onClose={imagesModal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Anime Background Images</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <HStack>
              <Input placeholder="Paste image URL" value={newImage} onChange={(e) => setNewImage(e.target.value)} />
              <Button onClick={addImage}>Add</Button>
            </HStack>
            <VStack align="stretch" spacing={2} mt={3} maxH="40vh" overflowY="auto">
              {images.length === 0 && <Text color="gray.500">No images added yet.</Text>}
              {images.map((url) => (
                <HStack key={url} justify="space-between" borderWidth="1px" borderRadius="md" p={2}>
                  <Text noOfLines={1} maxW="80%">{url}</Text>
                  <Button size="sm" variant="outline" onClick={() => removeImage(url)}>Remove</Button>
                </HStack>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={imagesModal.onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Navbar;
