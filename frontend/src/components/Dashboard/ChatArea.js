import React, { useState, useEffect, useContext } from "react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import Lottie from "react-lottie";
import animationdata from "../../typingAnimation.json";
import {
  Box,
  InputGroup,
  Input,
  Text,
  InputRightElement,
  FormControl,
  InputLeftElement,
  useToast,
  useDisclosure,
} from "@chakra-ui/react";
import { FaFileUpload } from "react-icons/fa";
import { marked } from "marked";

import chatContext from "../../context/chatContext";
import ChatAreaTop from "./ChatAreaTop";
import FileUploadModal from "../miscellaneous/FileUploadModal";
import VoiceRecorderModal from "../miscellaneous/VoiceRecorderModal";
import CallModal from "../miscellaneous/CallModal";
import ChatLoadingSpinner from "../miscellaneous/ChatLoadingSpinner";
import axios from "axios";
import MotionButton from "../ui/MotionButton";
import SingleMessage from "./SingleMessage";
import { SparklesCore } from '../ui/sparkles';

const scrollbarconfig = {
  "&::-webkit-scrollbar": {
    width: "5px",
    height: "5px",
  },
  "&::-webkit-scrollbar-thumb": {
    backgroundColor: "gray.300",
    borderRadius: "5px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    backgroundColor: "gray.400",
  },
  "&::-webkit-scrollbar-track": {
    display: "none",
  },
};

const markdownToHtml = (markdownText) => {
  const html = marked(markdownText || "");
  return { __html: html };
};

export const ChatArea = () => {
  const context = useContext(chatContext);
  const {
    hostName,
    user,
    receiver,
    socket,
    activeChatId,
    messageList,
    setMessageList,
    isOtherUserTyping,
    setIsOtherUserTyping,
    setActiveChatId,
    setReceiver,
    setMyChatList,
    myChatList,
    isChatLoading,
  } = context;
  const [typing, settyping] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const voiceDisclosure = useDisclosure();
  const incomingCall = useDisclosure();
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [replyToId, setReplyToId] = useState(null);

  // Lottie Options for typing
  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationdata,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  useEffect(() => {
    const onJump = (e) => {
      const id = e.detail;
      const el = document.getElementById(`msg-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.outline = '2px solid gold';
        setTimeout(() => { el.style.outline = ''; }, 1500);
      }
    };
    window.addEventListener('jumpToMessage', onJump);
    return () => window.removeEventListener('jumpToMessage', onJump);
  }, []);

  useEffect(() => {
    // Listen for reply target changes from message items
    const onReplyChange = (e) => setReplyToId(e.detail || null);
    window.addEventListener("replyToChange", onReplyChange);
    return () => window.removeEventListener("replyToChange", onReplyChange);
  }, []);

  useEffect(() => {
    return () => {
      window.addEventListener("popstate", () => {
        socket.emit("leave-chat", activeChatId);
        setActiveChatId("");
        setMessageList([]);
        setReceiver({});
      });
    };
  }, [socket, activeChatId, setActiveChatId, setMessageList, setReceiver]);

  useEffect(() => {
    socket.on("user-joined-room", (userId) => {
      const updatedList = messageList.map((message) => {
        if (message.senderId === user._id && userId !== user._id) {
          const index = message.seenBy.findIndex(
            (seen) => seen.user === userId
          );
          if (index === -1) {
            message.seenBy.push({ user: userId, seenAt: new Date() });
          }
        }
        return message;
      });
      setMessageList(updatedList);
    });

    socket.on("typing", (data) => {
      if (data.typer !== user._id) {
        setIsOtherUserTyping(true);
      }
    });

    socket.on("stop-typing", (data) => {
      if (data.typer !== user._id) {
        setIsOtherUserTyping(false);
      }
    });

    socket.on("receive-message", (data) => {
      setMessageList((prev) => [...prev, data]);
      setTimeout(() => {
        document.getElementById("chat-box")?.scrollTo({
          top: document.getElementById("chat-box").scrollHeight,
          behavior: "smooth",
        });
      }, 100);
    });

    socket.on("incoming-call", (payload) => {
      setIncomingCallData(payload);
      incomingCall.onOpen();
    });

    socket.on("message-deleted", (data) => {
      const { messageId } = data;
      setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
    });

    socket.on("message-reacted", ({ messageId, reaction }) => {
      setMessageList((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, reaction } : m))
      );
    });

    socket.on("message-edited", ({ messageId, text }) => {
      setMessageList((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, text } : m))
      );
    });

    return () => {
      socket.off("typing");
      socket.off("stop-typing");
      socket.off("receive-message");
      socket.off("message-deleted");
  socket.off("incoming-call");
  socket.off("message-edited");
  };
  }, [socket, messageList, setMessageList, user._id, setIsOtherUserTyping, incomingCall]);

  const handleTyping = () => {
    const messageInput = document.getElementById("new-message");
    if (!messageInput) return;

    if (messageInput.value === "" && typing) {
      settyping(false);
      socket.emit("stop-typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    } else if (messageInput.value !== "" && !typing) {
      settyping(true);
      socket.emit("typing", {
        typer: user._id,
        conversationId: activeChatId,
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSendMessage(e);
    }
  };


  const handleSendMessage = async (e, messageText, file) => {
    e.preventDefault();

    if (!messageText) {
      messageText = document.getElementById("new-message")?.value || "";
    }

    socket.emit("stop-typing", {
      typer: user._id,
      conversationId: activeChatId,
    });

    if (messageText === "" && !file) {
      toast({
        title: "Message cannot be empty",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

  const replyTo = replyToId || window.__replyTo || null;
  if (file) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("conversationId", activeChatId);
        formData.append("sender", user._id);
        formData.append("text", messageText);
        if (replyTo) formData.append("replyTo", replyTo);

  const response = await axios.post(
          `${hostName}/message/send`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
              "auth-token": localStorage.getItem("token"),
            },
          }
        );

        if (response.status !== 200) {
          throw new Error("Failed to send message with file");
        }
  const created = response.data;
  if (replyTo) created.replyTo = replyTo;
        setMessageList((prev) => [...prev, created]);
        // Broadcast via socket so receiver gets it without polling
        const receiverId = receiver?._id;
        if (receiverId) {
          socket.emit("broadcast-existing-message", { message: created, receiverId });
        }
        return;
      } catch (error) {
        toast({
          title: error.message,
          status: "error",
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }

  const data = {
      text: messageText,
      conversationId: activeChatId,
      senderId: user._id,
      imageUrl: null,
      replyTo,
    };

    socket.emit("send-message", data);

    const inputElem = document.getElementById("new-message");
    if (inputElem) {
      inputElem.value = "";
    }
    if (replyTo) {
      window.__replyTo = null;
      setReplyToId(null);
      window.dispatchEvent(new CustomEvent('replyToChange', { detail: null }));
    }

    setTimeout(() => {
      document.getElementById("chat-box")?.scrollTo({
        top: document.getElementById("chat-box").scrollHeight,
        behavior: "smooth",
      });
    }, 100);

    setMyChatList(
      await myChatList
        .map((chat) => {
          if (chat._id === activeChatId) {
            chat.latestmessage = messageText;
            chat.updatedAt = new Date().toUTCString();
          }
          return chat;
        })
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    );
  };

  const onVoiceRecorded = (msg) => {
    setMessageList((prev) => [...prev, msg]);
    setTimeout(() => {
      document.getElementById("chat-box")?.scrollTo({
        top: document.getElementById("chat-box").scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const removeMessageFromList = (messageId) => {
    setMessageList((prev) => prev.filter((msg) => msg._id !== messageId));
  };

  // Drag-and-drop upload handler
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (!file) return;
    await handleSendMessage(new Event("submit"), "", file);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <>
      {activeChatId !== "" ? (
        <>
          <Box
            justifyContent="space-between"
            h="100%"
            w={{
              base: "100vw",
              md: "100%",
            }}
          >
            <ChatAreaTop />

            {isChatLoading && <ChatLoadingSpinner />}

            <Box
              id="chat-box"
              h="85%"
              overflowY="auto"
              sx={scrollbarconfig}
              mt={2}
              mx={1}
              bg={{ base: "blackAlpha.200", md: "blackAlpha.200" }}
              borderRadius="lg"
              p={2}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
      {messageList?.map((message, idx) =>
                !message.deletedby?.includes(user._id) ? (
                  <SingleMessage
        key={message._id || message.id || `${message.senderId}-${message.createdAt || idx}`}
                    message={message}
                    user={user}
                    receiver={receiver}
                    markdownToHtml={markdownToHtml}
                    scrollbarconfig={scrollbarconfig}
                    socket={socket}
                    activeChatId={activeChatId}
                    removeMessageFromList={removeMessageFromList}
                    toast={toast}
                    hostName={hostName}
                    conversations={myChatList}
                  />
                ) : null
              )}
            </Box>

            <Box
              py={2}
              position="fixed"
              w={{
                base: "100%",
                md: "70%",
              }}
              bottom={{
                base: 1,
                md: 3,
              }}
              backgroundColor={
                localStorage.getItem("chakra-ui-color-mode") === "dark"
                  ? "#1a202c"
                  : "white"
              }
              borderTopRadius="xl"
              boxShadow="0 -4px 12px rgba(0,0,0,0.2)"
              zIndex={1}
            >
              <Box
                mx={{
                  base: 6,
                  md: 3,
                }}
                w="fit-content"
              >
                {isOtherUserTyping && (
                  <Lottie
                    options={defaultOptions}
                    height={20}
                    width={20}
                    isStopped={false}
                    isPaused={false}
                  />
                )}
              </Box>
              <FormControl>
                <InputGroup
                  w={{
                    base: "95%",
                    md: "98%",
                  }}
                  m="auto"
                  onKeyDown={handleKeyPress}
                >
                  {!receiver?.email?.includes("bot") && (
                    <InputLeftElement>
                      <MotionButton
                        mx={2}
                        size="sm"
                        onClick={onOpen}
                        borderRadius="lg"
                      >
                        <FaFileUpload />
                      </MotionButton>
                      <MotionButton ml={1} size="sm" borderRadius="lg" onClick={voiceDisclosure.onOpen}>🎤</MotionButton>
                    </InputLeftElement>
                  )}

                  <Input
                    placeholder="Type a message"
                    id="new-message"
                    onChange={handleTyping}
                    borderRadius="10px"
                    bg="whiteAlpha.100"
                    _hover={{ bg: "whiteAlpha.200" }}
                    _focus={{ bg: "whiteAlpha.300" }}
                  />
                  {(replyToId || window.__replyTo) && (() => {
                    const rid = replyToId || window.__replyTo;
                    const replied = messageList.find((m) => m._id === rid);
                    const preview = replied
                      ? (replied.text ? replied.text.slice(0, 80) : (replied.imageUrl || replied.imageurl ? '📷 Photo' : (replied.audioUrl ? '🎤 Voice' : (replied.videoUrl ? '🎬 Video' : 'Message'))))
                      : `#${String(rid).slice(-6)}`;
                    return (
                      <Box position="absolute" left={4} bottom={12} bg="blackAlpha.500" color="white" px={3} py={2} borderRadius={8} fontSize="xs" maxW="70%" boxShadow="sm">
                        <Text noOfLines={2}>Replying to: {preview}</Text>
                        <MotionButton size="xs" ml={2} mt={1} onClick={() => { window.__replyTo = null; setReplyToId(null); window.dispatchEvent(new CustomEvent('replyToChange', { detail: null })); }}>Cancel</MotionButton>
                      </Box>
                    );
                  })()}

                  <InputRightElement>
                    <MotionButton
                      onClick={(e) =>
                        handleSendMessage(
                          e,
                          document.getElementById("new-message")?.value
                        )
                      }
                      size="sm"
                      mx={2}
                      borderRadius="10px"
                      bgGradient="linear(to-r, brand.500, cyan.400)"
                      color="white"
                      _hover={{ filter: "brightness(1.1)" }}
                    >
                      <ArrowForwardIcon />
                    </MotionButton>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
            </Box>
          </Box>
          <FileUploadModal
            isOpen={isOpen}
            onClose={onClose}
            handleSendMessage={handleSendMessage}
          />
          <VoiceRecorderModal
            isOpen={voiceDisclosure.isOpen}
            onClose={voiceDisclosure.onClose}
            hostName={hostName}
            activeChatId={activeChatId}
            user={user}
            token={localStorage.getItem("token")}
            onRecorded={onVoiceRecorded}
          />
        </>
      ) : (
        !isChatLoading && (
          <Box
            display={{
              base: "none",
              md: "block",
            }}
            mx="auto"
            w="fit-content"
            mt="30vh"
            textAlign="center"
            position="relative"
          >
            <Box position="absolute" inset={0} w="100vw" h="60vh" left="50%" transform="translateX(-50%)" zIndex={0}>
              <SparklesCore id="tsparticles-chat-empty" background="transparent" particleDensity={90} minSize={0.6} maxSize={1.2} className="w-full h-full" particleColor="#ffffff" />
            </Box>
            <Box position="relative" zIndex={1}>
              <Text fontSize="6vw" fontWeight="bold" fontFamily="Work sans">
                Allify
              </Text>
              <Text fontSize="2vw">Where chatting, fun, and friends come alive</Text>
              <Text fontSize="md">Select a chat to start messaging</Text>
            </Box>
          </Box>
        )
      )}
      {/* Incoming call modal */}
      {incomingCallData && (
        <CallModal
          isOpen={incomingCall.isOpen}
          onClose={incomingCall.onClose}
          socket={socket}
          user={user}
          receiver={{ _id: incomingCallData.fromUserId, name: receiver?.name || "Incoming" }}
          conversationId={incomingCallData.conversationId}
          callType={incomingCallData.callType || "audio"}
          mode="incoming"
        />
      )}
    </>
  );
};
