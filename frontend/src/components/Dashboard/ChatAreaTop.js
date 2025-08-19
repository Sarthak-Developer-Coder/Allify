import { Flex, Text, Button, Image, Tooltip, SkeletonCircle, Skeleton, Box, Stack, HStack, useToast, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import React, { useCallback, useContext, useEffect } from "react";
import chatContext from "../../context/chatContext";
import { ProfileModal } from "../miscellaneous/ProfileModal";
import { useDisclosure } from "@chakra-ui/react";
import CallModal from "../miscellaneous/CallModal";

const ChatAreaTop = () => {
  const context = useContext(chatContext);

  const {
    receiver,
    setReceiver,
    activeChatId,
    setActiveChatId,
    setMessageList,
    isChatLoading,
    hostName,
    socket,
  } = context;

  const { isOpen, onOpen, onClose } = useDisclosure();
  const callAudio = useDisclosure();
  const callVideo = useDisclosure();
  const toast = useToast();
  const pinsMenu = useDisclosure();
  const [pins, setPins] = React.useState([]);

  const pinLastMessage = async () => {
    try {
      const res = await fetch(`${hostName}/conversation/pin`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ conversationId: activeChatId, messageId: context.messageList?.slice(-1)?.[0]?._id }) });
      if (!res.ok) throw new Error('Failed to pin');
      toast({ title: 'Pinned', status: 'success', duration: 1200 });
    } catch (e) { toast({ title: e.message, status: 'error' }); }
  };

  const loadPins = async () => {
    try {
      const res = await fetch(`${hostName}/conversation/${activeChatId}/pins`, { headers: { 'auth-token': localStorage.getItem('token') } });
      const data = await res.json();
      setPins(data);
    } catch {}
  };

  const unpin = async (messageId) => {
    try {
      await fetch(`${hostName}/conversation/unpin`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ conversationId: activeChatId, messageId }) });
      toast({ title: 'Unpinned', duration: 1000 });
      loadPins();
    } catch {}
  };
  const jumpTo = (messageId) => {
    window.dispatchEvent(new CustomEvent('jumpToMessage', { detail: messageId }));
  };

  const getReceiverOnlineStatus = useCallback(async () => {
    if (!receiver._id) {
      return;
    }

    try {
      const repsonse = await fetch(
        `${hostName}/user/online-status/${receiver._id}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "auth-token": localStorage.getItem("token"),
          },
        }
      );
      const data = await repsonse.json();
      setReceiver((receiver) => ({
        ...receiver,
        isOnline: data.isOnline,
      }));
    } catch (error) {}
  }, [hostName, receiver._id, setReceiver]);

  const handleBack = () => {
    socket.emit("leave-chat", activeChatId);
    setActiveChatId("");
    setMessageList([]);
    setReceiver({});
  };

  const getLastSeenString = (lastSeen) => {
    var lastSeenString = "last seen ";
    if (new Date(lastSeen).toDateString() === new Date().toDateString()) {
      lastSeenString += "today ";
    } else if (
      new Date(lastSeen).toDateString() ===
      new Date(new Date().setDate(new Date().getDate() - 1)).toDateString()
    ) {
      lastSeenString += "yesterday ";
    } else {
      lastSeenString += `on ${new Date(lastSeen).toLocaleDateString()} `;
    }

    lastSeenString += `at ${new Date(lastSeen).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    return lastSeenString;
  };

  useEffect(() => {
    getReceiverOnlineStatus();
  }, [getReceiverOnlineStatus]);
  return (
    <>
  <Flex w={"100%"} alignItems="center" p={2} gap={2} position="relative" zIndex={1}>
        <Button
          aria-label="Back"
          variant="ghost"
          colorScheme="purple"
          size="sm"
          borderRadius="md"
          onClick={handleBack}
          display={{ base: 'inline-flex', md: 'none' }}
        >
          <ArrowBackIcon />
        </Button>
  <Tooltip label="View Profile">
          <Box
            w={"100%"}
            mr={0}
            p={2}
            h={"max-content"}
            borderRadius={"md"}
            onClick={onOpen}
            cursor="pointer"
            bg={{ base: 'whiteAlpha.200', md: 'transparent' }}
          >
            {isChatLoading ? (
              <>
                <Flex>
                  <SkeletonCircle size="10" mx={2} />
                  <Skeleton
                    height="20px"
                    width="250px"
                    borderRadius={"md"}
                    my={2}
                  />
                </Flex>
              </>
            ) : (
              <>
                <Flex gap={2} alignItems={"center"}>
                  <Image
                    borderRadius="full"
                    boxSize="40px"
                    src={receiver.profilePic}
                    alt=""
                  />

                  <Stack
                    justifyContent={"center"}
                    m={0}
                    p={0}
                    lineHeight={1}
                    gap={0}
                    textAlign={"left"}
                  >
                    <Text mx={1} my={receiver.isOnline ? 0 : 2} fontSize="2xl">
                      {receiver.name}
                    </Text>
                    {receiver.isOnline ? (
                      <Text mx={1} fontSize="small" as="span">
                        <Box
                          as="span"
                          w="8px"
                          h="8px"
                          bg="green.500"
                          display="inline-block"
                          borderRadius="full"
                          mx={1}
                        />
                        active now
                      </Text>
                    ) : (
                      <Text my={0} mx={1} fontSize={"xx-small"}>
                        {getLastSeenString(receiver.lastSeen)}
                      </Text>
                    )}
                  </Stack>
      <HStack ml={4} onClick={(e) => e.stopPropagation()}>
                    <Menu isOpen={pinsMenu.isOpen}>
                      <Tooltip label="Pinned">
                        <MenuButton as={Button} size="sm" onClick={() => { pinsMenu.onToggle(); if (!pinsMenu.isOpen) loadPins(); }}>📍</MenuButton>
                      </Tooltip>
                      <MenuList maxH="260px" overflowY="auto">
                        {pins.length === 0 && <MenuItem isDisabled>No pins</MenuItem>}
                        {pins.map((m) => (
                          <MenuItem key={m._id} onClick={() => jumpTo(m._id)}>
                            {(m.text && m.text.slice(0, 40)) || (m.imageUrl ? '📷 Photo' : (m.audioUrl ? '🎤 Voice' : (m.videoUrl ? '🎬 Video' : 'Message')))}
                          </MenuItem>
                        ))}
                        {pins.length > 0 && <MenuItem onClick={() => unpin(pins[0]._id)}>Unpin latest</MenuItem>}
                      </MenuList>
                    </Menu>
                    <Tooltip label="Pin latest">
                      <Button size="sm" onClick={pinLastMessage}>📌</Button>
                    </Tooltip>
                    <Tooltip label="Voice Call">
                      <Button size="sm" onClick={callAudio.onOpen}>📞</Button>
                    </Tooltip>
                    <Tooltip label="Video Call">
                      <Button size="sm" onClick={callVideo.onOpen}>🎥</Button>
                    </Tooltip>
                  </HStack>
                </Flex>
              </>
            )}
    </Box>
        </Tooltip>
      </Flex>

      <ProfileModal isOpen={isOpen} onClose={onClose} user={receiver} />
      <CallModal isOpen={callAudio.isOpen} onClose={callAudio.onClose} socket={socket} user={context.user} receiver={receiver} conversationId={activeChatId} callType="audio" mode="outgoing" />
      <CallModal isOpen={callVideo.isOpen} onClose={callVideo.onClose} socket={socket} user={context.user} receiver={receiver} conversationId={activeChatId} callType="video" mode="outgoing" />
    </>
  );
};

export default ChatAreaTop;
