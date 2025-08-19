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
	useToast,
} from "@chakra-ui/react";

const VoiceRecorderModal = ({ isOpen, onClose, hostName, activeChatId, user, token, onRecorded }) => {
	const mediaRecorderRef = useRef(null);
	const chunksRef = useRef([]);
	const [recording, setRecording] = useState(false);
	const [previewUrl, setPreviewUrl] = useState("");
	const toast = useToast();

	useEffect(() => {
		if (!isOpen) {
			cleanup();
		}
	}, [isOpen]);

	const startRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mr = new MediaRecorder(stream);
			mediaRecorderRef.current = mr;
			chunksRef.current = [];
			mr.ondataavailable = (e) => {
				if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
			};
			mr.onstop = async () => {
				const blob = new Blob(chunksRef.current, { type: "audio/webm" });
				setPreviewUrl(URL.createObjectURL(blob));
			};
			mr.start();
			setRecording(true);
		} catch (e) {
			toast({ title: "Microphone access denied", status: "error", duration: 3000, isClosable: true });
		}
	};

	const stopRecording = () => {
		if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
			mediaRecorderRef.current.stop();
			mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
		}
		setRecording(false);
	};

	const uploadRecording = async () => {
		try {
			if (!previewUrl) return;
			const resp = await fetch(previewUrl);
			const blob = await resp.blob();
			const file = new File([blob], "voice-note.webm", { type: blob.type || "audio/webm" });

			const formData = new FormData();
			formData.append("file", file);
			formData.append("conversationId", activeChatId);
			formData.append("sender", user._id);
			formData.append("text", "");

			const res = await fetch(`${hostName}/message/send`, {
				method: "POST",
				headers: { "auth-token": token },
				body: formData,
			});
			if (!res.ok) throw new Error("Failed to upload voice message");
			const msg = await res.json();
			onRecorded?.(msg);
			cleanup();
			onClose();
		} catch (e) {
			toast({ title: e.message, status: "error", duration: 3000, isClosable: true });
		}
	};

	const cleanup = () => {
		try {
			if (mediaRecorderRef.current) {
				if (mediaRecorderRef.current.state !== "inactive") mediaRecorderRef.current.stop();
				mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
			}
		} catch {}
		mediaRecorderRef.current = null;
		chunksRef.current = [];
		setPreviewUrl("");
		setRecording(false);
	};

	return (
		<Modal isOpen={isOpen} onClose={() => { cleanup(); onClose(); }} isCentered>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader>Record voice message</ModalHeader>
				<ModalBody>
					{previewUrl ? (
						<audio src={previewUrl} controls style={{ width: "100%" }} />
					) : (
						<Text>{recording ? "Recording..." : "Press Start to record"}</Text>
					)}
				</ModalBody>
				<ModalFooter>
					{!recording && !previewUrl && (
						<Button colorScheme="purple" onClick={startRecording}>Start</Button>
					)}
					{recording && (
						<Button colorScheme="red" onClick={stopRecording}>Stop</Button>
					)}
					{!recording && previewUrl && (
						<>
							<Button mr={3} onClick={uploadRecording} colorScheme="purple">Send</Button>
							<Button variant="ghost" onClick={cleanup}>Discard</Button>
						</>
					)}
				</ModalFooter>
			</ModalContent>
		</Modal>
	);
};

export default VoiceRecorderModal;
