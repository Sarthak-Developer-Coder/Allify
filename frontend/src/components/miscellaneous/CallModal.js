import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  HStack,
  VStack,
  useToast,
} from "@chakra-ui/react";

// Lightweight WebRTC call modal; expects socket-based signaling
// Props: isOpen, onClose, socket, user, receiver, conversationId, callType ("audio"|"video"), mode ("incoming"|"outgoing")
const CallModal = ({ isOpen, onClose, socket, user, receiver, conversationId, callType = "audio", mode = "outgoing" }) => {
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const toast = useToast();

  const cleanup = () => {
    try {
      pcRef.current?.getSenders?.().forEach((s) => s.track && s.track.stop());
      pcRef.current?.close?.();
      pcRef.current = null;
    } catch {}
    try {
      localStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    setIsInCall(false);
    setIsConnecting(false);
  };

  const initPC = async () => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
    });
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket.emit("ice-candidate", {
          toUserId: receiver._id,
          fromUserId: user._id,
          candidate: e.candidate,
        });
      }
    };
    pc.ontrack = (e) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      remoteStreamRef.current.addTrack(e.track);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };
    pcRef.current = pc;
  };

  const getMedia = async () => {
    const constraints = callType === "video" ? { video: true, audio: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };

  const startCall = async () => {
    setIsConnecting(true);
    await initPC();
    await getMedia();
    const offer = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offer);
    socket.emit("start-call", {
      toUserId: receiver._id,
      fromUserId: user._id,
      conversationId,
      callType,
    });
    socket.emit("call-offer", { toUserId: receiver._id, fromUserId: user._id, sdp: offer });
  };

  const acceptCall = async () => {
    setIsConnecting(true);
    await initPC();
    await getMedia();
  };

  const endCall = () => {
    socket.emit("end-call", { toUserId: receiver._id, fromUserId: user._id });
    cleanup();
    onClose();
  };

  const decline = () => {
    socket.emit("decline-call", { toUserId: receiver._id, fromUserId: user._id });
    cleanup();
    onClose();
  };

  useEffect(() => {
    if (!socket) return;

    const onOffer = async ({ fromUserId, sdp }) => {
      if (fromUserId !== receiver._id) return;
      // We are the callee; acceptCall must have run to create PC and get media
      if (!pcRef.current) await acceptCall();
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit("call-answer", { toUserId: fromUserId, fromUserId: user._id, sdp: answer });
      setIsInCall(true);
      setIsConnecting(false);
    };

    const onAnswer = async ({ fromUserId, sdp }) => {
      if (fromUserId !== receiver._id) return;
      if (!pcRef.current) return;
      await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
      setIsInCall(true);
      setIsConnecting(false);
    };

    const onCandidate = async ({ fromUserId, candidate }) => {
      if (fromUserId !== receiver._id) return;
      try {
        await pcRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (e) {
        console.error("ICE add error", e);
      }
    };

    const onEnd = () => {
      cleanup();
      onClose();
    };

    const onUnavailable = ({ reason }) => {
      toast({ title: "User unavailable", description: reason || "", status: "info", duration: 2000 });
      cleanup();
      onClose();
    };

    socket.on("call-offer", onOffer);
    socket.on("call-answer", onAnswer);
    socket.on("ice-candidate", onCandidate);
    socket.on("end-call", onEnd);
    socket.on("user-unavailable", onUnavailable);
    socket.on("call-declined", onEnd);

    return () => {
      socket.off("call-offer", onOffer);
      socket.off("call-answer", onAnswer);
      socket.off("ice-candidate", onCandidate);
      socket.off("end-call", onEnd);
      socket.off("user-unavailable", onUnavailable);
      socket.off("call-declined", onEnd);
    };
  // Intentionally keep a stable, minimal dep list to avoid re-registering listeners excessively
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && mode === "outgoing") {
      startCall();
    }
    // Cleanup when modal closes
    if (!isOpen) cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={endCall} size="xl">
      <ModalOverlay backdropFilter="blur(6px)" />
      <ModalContent>
        <ModalHeader>
          {mode === "incoming" ? `Incoming ${callType} call` : `Calling ${receiver?.name || "..."}`}
        </ModalHeader>
        <ModalBody>
          <VStack spacing={4}>
            {callType === "video" ? (
              <HStack w="100%" spacing={2}>
                <video ref={localVideoRef} autoPlay muted playsInline style={{ width: "40%", borderRadius: 8 }} />
                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: "60%", borderRadius: 8 }} />
              </HStack>
            ) : (
              <Text>{isInCall ? "Voice connected" : isConnecting ? "Connecting..." : "Ringing..."}</Text>
            )}
            {isInCall && (
              <HStack>
                <Button size="sm" onClick={() => {
                  const track = localStreamRef.current?.getAudioTracks?.()[0];
                  if (track) { track.enabled = !track.enabled; setMicOn(track.enabled); }
                }}>{micOn ? "Mute" : "Unmute"}</Button>
                {callType === "video" && (
                  <>
                    <Button size="sm" onClick={() => {
                      const track = localStreamRef.current?.getVideoTracks?.()[0];
                      if (track) { track.enabled = !track.enabled; setCamOn(track.enabled); }
                    }}>{camOn ? "Camera Off" : "Camera On"}</Button>
                    <Button size="sm" onClick={async () => {
                      try {
                        if (!sharing) {
                          const ds = await navigator.mediaDevices.getDisplayMedia({ video: true });
                          const videoTrack = ds.getVideoTracks()[0];
                          const sender = pcRef.current?.getSenders?.().find(s => s.track && s.track.kind === 'video');
                          await sender?.replaceTrack(videoTrack);
                          videoTrack.onended = async () => {
                            const original = localStreamRef.current?.getVideoTracks?.()[0];
                            await sender?.replaceTrack(original || null);
                            setSharing(false);
                          };
                          setSharing(true);
                        }
                      } catch (e) { console.error(e); }
                    }}>{sharing ? "Sharing..." : "Share Screen"}</Button>
                  </>
                )}
              </HStack>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          {mode === "incoming" && !isInCall ? (
            <HStack>
              <Button colorScheme="green" onClick={acceptCall}>Accept</Button>
              <Button variant="outline" onClick={decline}>Decline</Button>
            </HStack>
          ) : (
            <Button colorScheme="red" onClick={endCall}>End</Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CallModal;
