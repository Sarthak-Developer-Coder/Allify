import React, { useState } from "react";
import {
  Box,
  Image,
  Text,
  Button,
  Tooltip,
  Flex,
  Circle,
  Stack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  ModalFooter,
} from "@chakra-ui/react";
import { CopyIcon, DeleteIcon, CheckCircleIcon } from "@chakra-ui/icons";
import DeleteMessageModal from "../miscellaneous/DeleteMessageModal";

const SingleMessage = ({
  message,
  user,
  receiver,
  markdownToHtml,
  scrollbarconfig,
  socket,
  activeChatId,
  removeMessageFromList,
  toast,
  hostName,
  conversations = [],
}) => {
  const isSender = message.senderId === user._id;
  const messageTime = `${new Date(message.createdAt).getHours()}:${new Date(
    message.createdAt
  ).getMinutes()}`;

  const [isHovered, setIsHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftText, setDraftText] = useState(message.text || "");
  const imageLightbox = useDisclosure();
  const [showForward, setShowForward] = useState(false);
  const [forwardConvId, setForwardConvId] = useState("");
  const [forwardSearch, setForwardSearch] = useState("");

  const quickReactions = ["👍", "❤️", "😂", "🔥", "👏"]; 

  const handleReact = (emoji) => {
    socket.emit("react-message", {
      conversationId: activeChatId,
      messageId: message._id,
      reaction: emoji,
    });
    setShowReactions(false);
  };

  const {
    isOpen: isDeleteModalOpen,
    onOpen: onOpenDeleteModal,
    onClose: onCloseDeleteModal,
  } = useDisclosure();

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      toast({
        duration: 1000,
        render: () => (
          <Box color="white" p={3} bg="purple.300" borderRadius="lg">
            Message copied to clipboard!!
          </Box>
        ),
      });
    });
  };

  const handleDeleteMessage = async (deletefrom) => {
    // Remove message from UI
    removeMessageFromList(message._id);
    onCloseDeleteModal();

    const deleteFrom = [user._id];
    if (deletefrom === 2) {
      deleteFrom.push(receiver._id);
    }

    const data = {
      messageId: message._id,
      conversationId: activeChatId,
      deleteFrom,
    };

    socket.emit("delete-message", data);
  };

  return (
    <>
      <Flex
        justify={isSender ? "end" : "start"}
        mx={2}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        id={`msg-${message._id}`}
      >
  {isSender && isHovered && (
          <Box margin={2} display="flex">
            <Tooltip label="Copy" placement="top">
              <Button
                size="sm"
                variant="ghost"
                mr={2}
                onClick={handleCopy}
                borderRadius="md"
              >
                <CopyIcon />
              </Button>
            </Tooltip>

            <Tooltip label="Delete" placement="top">
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.preventDefault();
                  onOpenDeleteModal();
                }}
                borderRadius="md"
              >
                <DeleteIcon />
              </Button>
            </Tooltip>
          </Box>
        )}
        <Flex w="max-content" position="relative">
          {!isSender && receiver?.profilePic && (
            <Image
              borderRadius="50%"
              src={receiver.profilePic}
              alt="Sender"
              w="20px"
              h="20px"
              mr={1}
              alignSelf="center"
            />
          )}

          <Stack spacing={0} position="relative">
      {message.replyTo && (
              <Box
                my={1}
                p={2}
                borderRadius={10}
                bg={isSender ? "purple.200" : "blue.200"}
                mx={2}
                color="white"
                w="max-content"
                maxW="60vw"
                alignSelf={isSender ? "flex-end" : "flex-start"}
              >
        Replying to #{String(message.replyTo).slice(-6)}
              </Box>
            )}

            <Box
              alignSelf={isSender ? "flex-end" : "flex-start"}
              position="relative"
              my={1}
              p={2}
              borderRadius={10}
              bg={isSender ? "purple.500" : "blue.500"}
              color="white"
              w="max-content"
              maxW="60vw"
              boxShadow="sm"
              opacity={0.95}
            >
              {(message.imageurl || message.imageUrl) && (
                <Image
                  src={message.imageurl || message.imageUrl}
                  alt="loading..."
                  w="200px"
                  maxW="40vw"
                  borderRadius="10px"
                  mb={2}
                  cursor="zoom-in"
                  onClick={imageLightbox.onOpen}
                />
              )}
              {message.audioUrl && (
                <audio src={message.audioUrl} controls style={{ width: "240px", maxWidth: "50vw" }} />
              )}
              {message.videoUrl && (
                <video src={message.videoUrl} controls style={{ width: "260px", maxWidth: "55vw", borderRadius: 10 }} />
              )}
              {isEditing ? (
                <input
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      socket.emit("edit-message", { conversationId: activeChatId, messageId: message._id, text: draftText });
                      setIsEditing(false);
                    } else if (e.key === "Escape") {
                      setDraftText(message.text || "");
                      setIsEditing(false);
                    }
                  }}
                  style={{ width: "100%", color: "white", background: "transparent", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: 6 }}
                />
              ) : (
                <Text
                  overflowX="scroll"
                  sx={scrollbarconfig}
                  dangerouslySetInnerHTML={markdownToHtml(message.text)}
                ></Text>
              )}
              <Flex justify="end" align="center" mt={1}>
                <Text align="end" fontSize="10px" color="#e6e5e5">
                  {messageTime}
                </Text>

                {isSender &&
                  message.seenBy?.find(
                    (element) => element.user === receiver._id
                  ) && (
                    <Circle ml={1} fontSize="x-small" color="green.100">
                      <CheckCircleIcon />
                    </Circle>
                  )}
              </Flex>
              {/* Reactions bubble */}
              {message.reaction && (
                <Box
                  fontSize="xs"
                  position="absolute"
                  bg={isSender ? "purple.500" : "blue.500"}
                  bottom={-1}
                  left={-1}
                  borderRadius="lg"
                >
                  {message.reaction}
                </Box>
              )}

              {/* Hover controls */}
              {isHovered && (
                <Box position="absolute" top="0" right="-60px" display="flex" flexDir="column" alignItems="center" onClick={(e) => e.stopPropagation()}>
                  <Tooltip label="Copy" placement="top">
                    <Button
                      size="sm"
                      variant="ghost"
                      mr={2}
                      onClick={handleCopy}
                      borderRadius="md"
                    >
                      <CopyIcon />
                    </Button>
                  </Tooltip>
                  {isSender && (
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing((s) => !s)} borderRadius="md" mt={1}>
                      ✏️
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    // set reply draft
                    const input = document.getElementById('new-message');
                    if (input) input.focus();
                    // store replyTo and notify UI
                    window.__replyTo = message._id;
                    window.dispatchEvent(new CustomEvent('replyToChange', { detail: message._id }));
                    toast({ title: 'Reply mode', description: 'Your next message will reply to this.', duration: 1200 });
                  }} borderRadius="md" mt={1}>↩️</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowForward(true)} borderRadius="md" mt={1}>⏩</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowReactions((s) => !s)} borderRadius="md" mt={1}>
                    🙂
                  </Button>
                  {showReactions && (
                    <Box bg="blackAlpha.600" borderRadius="md" p={1} mt={1}>
                      <Flex>
                        {quickReactions.map((emo) => (
                          <Button key={emo} size="xs" variant="ghost" onClick={() => handleReact(emo)} mx={0.5}>
                            {emo}
                          </Button>
                        ))}
                      </Flex>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          </Stack>
        </Flex>
      </Flex>

      {/* Forward modal */}
      {showForward && (
        <Modal isOpen={showForward} onClose={() => setShowForward(false)} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalBody>
              <Text fontSize="md" mb={2}>Forward to</Text>
              <input placeholder="Search" value={forwardSearch} onChange={(e) => setForwardSearch(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6, border: '1px solid #555', marginBottom: 8 }} />
              <Box maxH="220px" overflowY="auto">
                {conversations
                  .filter((cv) => (cv.members?.[0]?.name || cv.name || '').toLowerCase().includes(forwardSearch.toLowerCase()))
                  .map((cv) => (
                    <Button key={cv._id} size="sm" variant={forwardConvId === cv._id ? 'solid' : 'ghost'} w="100%" justifyContent="flex-start" onClick={() => setForwardConvId(cv._id)}>
                      {cv.members?.[0]?.name || cv.name || cv._id?.slice(-6)}
                    </Button>
                  ))}
              </Box>
            </ModalBody>
            <ModalFooter>
              <Button size="sm" onClick={async () => {
                try {
                  const res = await fetch(`${hostName}/conversation/forward`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
                    body: JSON.stringify({ toConversationId: forwardConvId, fromMessageId: message._id })
                  });
                  if (!res.ok) throw new Error('Forward failed');
                  setShowForward(false);
                  setForwardConvId("");
                  setForwardSearch("");
                  toast({ title: 'Forwarded', status: 'success', duration: 1200 });
                } catch (e) { toast({ title: e.message, status: 'error' }); }
              }}>Send</Button>
              <Button size="sm" variant="ghost" ml={2} onClick={() => setShowForward(false)}>Cancel</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* Image lightbox */}
      {imageLightbox.isOpen && (message.imageurl || message.imageUrl) && (
        <Modal isOpen={imageLightbox.isOpen} onClose={imageLightbox.onClose} size="xl" isCentered>
          <ModalOverlay />
          <ModalContent bg="transparent" boxShadow="none">
            <ModalBody p={0} display="flex" justifyContent="center">
              <Image src={message.imageurl || message.imageUrl} alt="full" maxH="80vh" borderRadius={8} />
            </ModalBody>
          </ModalContent>
        </Modal>
      )}

      <DeleteMessageModal
        isOpen={isDeleteModalOpen}
        handleDeleteMessage={handleDeleteMessage}
        onClose={onCloseDeleteModal}
      />
    </>
  );
};

export default SingleMessage;
