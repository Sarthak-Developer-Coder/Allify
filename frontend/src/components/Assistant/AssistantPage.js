import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, HStack, Select, Stack, Text, Textarea, Avatar, Badge, useToast, Input, FormControl, FormLabel, Switch, Kbd, Tag, TagLabel, Tooltip, Spinner, Slider, SliderTrack, SliderFilledTrack, SliderThumb } from "@chakra-ui/react";
import MotionButton from "../ui/MotionButton";
import { gestures, inferGestureFromText } from "./gestures";
import Avatar3D, { Shinchan3D } from "./Avatar3D";
import Goku3D from "./Goku3D";
import PMModi3D from "./PMModi3D";
import Ben103D from "./Ben103D";
import Gojo3D from "./Gojo3D";
import BillGates3D from "./BillGates3D";
import SundarPichai3D from "./SundarPichai3D";
import TalkingHeadAvatar from "./TalkingHeadAvatar";
import CinematicAvatar from "./CinematicAvatar";
import EmotionSensor from "./EmotionSensor";
import VFXBackground from "./VFXBackground";
import VoiceWaves from "./VoiceWaves";
import newMsgSfx from "../../assets/newmessage.wav";

// Minimal lifelike assistant scaffold: chat UI, modes, memory stubs, and TTS.
// Future upgrades: 3D avatar (VRM), facial expression sync, emotion recognition, crossfade voice.

const MODES = [
	{ id: "friendly", label: "Friendly" },
	{ id: "romantic", label: "Romantic" },
	{ id: "caring", label: "Caring (Mom-like)" },
	{ id: "supportive", label: "Supportive (Wife-like)" },
	{ id: "playful", label: "Playful (GF-like)" },
	{ id: "professional", label: "Professional" },
];

export default function AssistantPage() {
	const host = useMemo(() => {
		// Allow overriding API base via env or localStorage (useful if 5000 is busy)
		return (
			process.env.REACT_APP_API ||
			localStorage.getItem('API_BASE') ||
			"http://localhost:5000"
		);
	}, []);
	const toast = useToast();
	const is3DUrl = useCallback((url) => typeof url === 'string' && /\.(glb|gltf|vrm)(\?|#|$)/i.test(url), []);
		const [profile, setProfile] = useState(null);
	const [mode, setMode] = useState("friendly");
	const [input, setInput] = useState("");
	const [messages, setMessages] = useState([]); // {role:'user'|'assistant', text:string}
	const [speaking, setSpeaking] = useState(false);
	const [cinematicOn, setCinematicOn] = useState(true);
	const [avatarMode, setAvatarMode] = useState('auto'); // auto | stylized | shinchan | talkinghead | cinematic | goku | pm | ben10 | gojo | billgates | sundar
	const thRef = useRef(null);
	const [loading, setLoading] = useState(false);
	const convIdRef = useRef(null);
	const [voicesList, setVoicesList] = useState([]);
	const [voiceName, setVoiceName] = useState("");
	const [listening, setListening] = useState(false);
	const recognizerRef = useRef(null);
	const [editName, setEditName] = useState("");
	const [editAvatar, setEditAvatar] = useState("");
	const [memKey, setMemKey] = useState("");
	const [memVal, setMemVal] = useState("");
	const [camOn, setCamOn] = useState(false);
	const [liveMood, setLiveMood] = useState(null);
	const [streamOn, setStreamOn] = useState(false);
	const [personaPrompt, setPersonaPrompt] = useState("");
	const [traitsCSV, setTraitsCSV] = useState("");
	const [knowledgeText, setKnowledgeText] = useState("");
	const abortRef = useRef(null);
	const lastUserTextRef = useRef("");
	const dingRef = useRef(null);
	const [convId, setConvId] = useState(null);
	const messagesEndRef = useRef(null);
	const [memList, setMemList] = useState([]);
	const [memOpen, setMemOpen] = useState(false);
	const lastResultAtRef = useRef(0);
	const [enterToSend, setEnterToSend] = useState(() => localStorage.getItem('assistant:enterToSend') === '1');
	const [temperature, setTemperature] = useState(0.7);
	const [citations, setCitations] = useState([]);
	const [threads, setThreads] = useState(()=>{
		try { return JSON.parse(localStorage.getItem('assistant:threads')||'[]') || []; } catch { return []; }
	});
	const saveThreads = useCallback((list)=>{
		try { localStorage.setItem('assistant:threads', JSON.stringify(list)); } catch {}
		setThreads(list);
	}, []);

	// persona quick presets
	const PERSONA_PRESETS = useMemo(() => ([
		{ key: 'custom', label: 'Custom (manual)' },
		{ key: 'friendly', label: 'Friendly BFF', prompt: 'You are a cheerful, supportive best friend. Keep it concise, warm, and optimistic. Encourage, never lecture.', traits: ['cheerful','supportive','casual','optimistic'] },
		{ key: 'coach', label: 'Productivity Coach', prompt: 'You are a pragmatic productivity coach. Give short, actionable guidance, step-by-step plans, and maintain accountability.', traits: ['pragmatic','direct','motivational','structured'] },
		{ key: 'romantic', label: 'Romantic Partner', prompt: 'You are a romantic, caring partner. Be affectionate without being explicit. Focus on emotional connection and reassurance.', traits: ['affectionate','reassuring','gentle','attentive'] },
		{ key: 'ceo', label: 'CEO Mentor', prompt: 'You are a seasoned CEO mentor. Be concise, strategic, and data-driven. Ask clarifying questions before delivering advice.', traits: ['strategic','concise','probing','data-driven'] },
		{ key: 'teacher', label: 'Calm Teacher', prompt: 'You are a calm, patient teacher. Explain simply, use examples, and check understanding. Prefer short chunks.', traits: ['patient','clear','example-driven','encouraging'] },
	]), []);

	const updateAppearance = async (patch) => {
		try {
			const res = await fetch(`${host}/companion/profile`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
				body: JSON.stringify({ appearance: patch })
			});
			if (res.ok) setProfile(await res.json());
		} catch {}
	};

	// Speech Synthesis
	const synth = window.speechSynthesis;
		const pickVoice = () => {
			const voices = voicesList.length ? voicesList : (synth?.getVoices?.() || []);
			const selected = voices.find(v => v.name === (voiceName || profile?.voice?.name));
			if (selected) return selected;
			const prefer = voices.find(v => /female|woman/i.test(v.name)) || voices.find(v => v.lang?.startsWith("en-"));
			return prefer || voices[0];
		};

	const speak = (text) => {
		if (!text || !synth) return;
		if (profile && profile.settings && profile.settings.autoSpeak === false) return;
		try {
			// Prefer TalkingHead avatar speech if GLB is used
			if (is3DUrl(profile?.appearance?.avatarUrl) && thRef.current?.speakText) {
				thRef.current.speakText(text);
				return;
			}
			const utter = new SpeechSynthesisUtterance(text);
			const v = pickVoice();
			if (v) utter.voice = v;
			utter.rate = Math.min(1.15, Math.max(0.9, profile?.voice?.rate || 1.0));
			utter.pitch = Math.min(1.3, Math.max(0.7, profile?.voice?.pitch || 1.0));
			utter.volume = Math.min(1.0, Math.max(0.2, profile?.voice?.volume || 1.0));
			utter.onstart = () => setSpeaking(true);
			utter.onend = () => setSpeaking(false);
			synth.cancel();
			synth.speak(utter);
		} catch {}
	};

	// Voice input via Web Speech API (where available)
	useEffect(() => {
		const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SR) return;
		const rec = new SR();
		rec.lang = (profile?.voice?.accent) || 'en-US';
		rec.interimResults = true; rec.continuous = true;
		rec.onresult = (e) => {
			let full = '';
			for (let i = e.resultIndex; i < e.results.length; i++) full += e.results[i][0].transcript;
			setInput(full);
			lastResultAtRef.current = Date.now();
		};
		rec.onend = () => setListening(false);
		rec.onerror = () => setListening(false);
		recognizerRef.current = rec;
	}, [profile]);

	const toggleMic = useCallback(() => {
		const rec = recognizerRef.current; if (!rec) return;
		if (listening) { try { rec.stop(); } catch {} setListening(false); }
		else { try { rec.start(); setListening(true); } catch {} }
	}, [listening]);

	// initialize ding sound
	useEffect(()=>{
		try {
			dingRef.current = new Audio(newMsgSfx);
			// reduce volume a bit
			dingRef.current.volume = 0.4;
		} catch {}
	},[]);

		const renderAvatar = useCallback(() => {
			const moodNow = (liveMood || inferGestureFromText(messages[messages.length-1]?.text || ""));
			const commonProps = { speaking, mood: moodNow, appearance: profile?.appearance };
			const hasGLB = is3DUrl(profile?.appearance?.avatarUrl);
			switch (avatarMode) {
				case 'stylized':
					return <Avatar3D {...commonProps} />;
				case 'shinchan':
					return <Shinchan3D {...commonProps} />;
						case 'goku':
							return <Goku3D speaking={speaking} mood={moodNow} isSSJ={profile?.appearance?.gokuSuperSaiyan === true} />;
								case 'pm':
									return <PMModi3D speaking={speaking} mood={moodNow} />;
										case 'ben10':
											return <Ben103D speaking={speaking} mood={moodNow} />;
												case 'gojo':
													return <Gojo3D speaking={speaking} mood={moodNow} showBlindfold={profile?.appearance?.gojoBlindfold !== false} />;
														case 'billgates':
															return <BillGates3D speaking={speaking} mood={moodNow} />;
				case 'sundar':
					return <SundarPichai3D speaking={speaking} mood={moodNow} />;
				case 'talkinghead':
					return hasGLB ? (
						<TalkingHeadAvatar ref={thRef} url={profile.appearance.avatarUrl} speaking={speaking} mood={moodNow} onSpeakStart={()=>setSpeaking(true)} onSpeakEnd={()=>setSpeaking(false)} />
					) : (
						<Avatar3D {...commonProps} />
					);
				case 'cinematic':
					return hasGLB ? (
						<CinematicAvatar url={profile.appearance.avatarUrl} />
					) : (
						<Avatar3D {...commonProps} />
					);
				case 'auto':
				default:
					if (hasGLB) {
						return cinematicOn ? (
							<CinematicAvatar url={profile.appearance.avatarUrl} />
						) : (
							<TalkingHeadAvatar ref={thRef} url={profile.appearance.avatarUrl} speaking={speaking} mood={moodNow} onSpeakStart={()=>setSpeaking(true)} onSpeakEnd={()=>setSpeaking(false)} />
						);
					}
					return <Avatar3D {...commonProps} />;
			}
		}, [avatarMode, cinematicOn, is3DUrl, liveMood, messages, profile, speaking]);

	// Load or create a dedicated conversation for assistant
	useEffect(() => {
		const init = async () => {
			try {
				// Reuse or create a one-on-one bot conversation if your backend supports it.
				// For now store a pseudo ID in localStorage and let /companion/talk reuse conversationId.
				let id = localStorage.getItem("assistant:conversationId");
				if (!id) {
					id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
					localStorage.setItem("assistant:conversationId", id);
				}
				convIdRef.current = id;
				setConvId(id);
				// ensure a thread entry exists
				setThreads(prev => {
					const exists = prev.some(t=> t.id === id);
					if (exists) return prev;
					const t = [...prev, { id, title: 'Thread '+ new Date().toLocaleString() }];
					saveThreads(t);
					return t;
				});
			} catch {}
		};
		init();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Load saved messages from localStorage when convId is available
	useEffect(()=>{
		if (!convId) return;
		try {
			const raw = localStorage.getItem(`assistant:msgs:${convId}`);
			if (raw) {
				const parsed = JSON.parse(raw);
				if (Array.isArray(parsed)) setMessages(parsed);
			}
		} catch {}
	}, [convId]);

	// Persist messages on change
	useEffect(()=>{
		if (!convId) return;
		try { localStorage.setItem(`assistant:msgs:${convId}`, JSON.stringify(messages)); } catch {}
	}, [messages, convId]);

	// Auto scroll to bottom on new messages
	useEffect(()=>{
		try { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); } catch {}
	}, [messages]);

	// SpeechRecognition inactivity auto-stop (simple VAD)
	useEffect(()=>{
		if (!listening) return;
		lastResultAtRef.current = Date.now();
		const t = setInterval(()=>{
			if (!listening) return;
			if (Date.now() - lastResultAtRef.current > 6000) {
				try { recognizerRef.current?.stop(); } catch {}
				setListening(false);
			}
		}, 1000);
		return ()=> clearInterval(t);
	}, [listening]);

		// Load voices list
		useEffect(() => {
			const loadVoices = () => {
				try {
					const list = window.speechSynthesis?.getVoices?.() || [];
					setVoicesList(list);
					if (!voiceName && profile?.voice?.name) setVoiceName(profile.voice.name);
				} catch {}
			};
			loadVoices();
			window.speechSynthesis?.addEventListener?.('voiceschanged', loadVoices);
			return () => window.speechSynthesis?.removeEventListener?.('voiceschanged', loadVoices);
		}, [profile, voiceName]);

	// Fetch profile
	useEffect(() => {
		const load = async () => {
			try {
				const res = await fetch(`${host}/companion/profile`, { headers: { "auth-token": localStorage.getItem("token") } });
				if (!res.ok) throw new Error("profile load failed");
				const data = await res.json();
			setProfile(data);
				setMode(data?.modes?.current || "friendly");
			setEditName(data?.displayName || "");
			setEditAvatar(data?.appearance?.avatarUrl || "");
			setPersonaPrompt(data?.systemPrompt || "");
			setTraitsCSV(Array.isArray(data?.traits) ? data.traits.join(', ') : "");
			setStreamOn(!!data?.settings?.streamReplies);
				setTemperature(Number(data?.settings?.temperature ?? 0.7));
			// auto-listen if enabled
			if (data?.settings?.autoListen) setTimeout(() => toggleMic(), 300);
			} catch {
				// create default profile by calling update
				try {
					const res2 = await fetch(`${host}/companion/profile`, { method: 'POST', headers: { "Content-Type": "application/json", "auth-token": localStorage.getItem("token") }, body: JSON.stringify({}) });
					const data2 = await res2.json();
				  setProfile(data2);
					setMode(data2?.modes?.current || "friendly");
				  setEditName(data2?.displayName || "");
				  setEditAvatar(data2?.appearance?.avatarUrl || "");
				  setPersonaPrompt(data2?.systemPrompt || "");
				  setTraitsCSV(Array.isArray(data2?.traits) ? data2.traits.join(', ') : "");
				  setStreamOn(!!data2?.settings?.streamReplies);
				  setTemperature(Number(data2?.settings?.temperature ?? 0.7));
				} catch {}
			}
		};
		load();
	}, [host, toggleMic]);

	const send = async () => {
		const text = input.trim();
		if (!text) return;
		setCitations([]);
		const userMsg = { role: 'user', text };
		setMessages((m) => [...m, userMsg]);
		setInput("");
		setLoading(true);
		lastUserTextRef.current = text;
		try {
			const endpoint = streamOn ? 'talk-stream' : 'talk';
			const controller = new AbortController();
			abortRef.current = controller;
						const res = await fetch(`${host}/companion/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
							body: JSON.stringify({ text: `[${mode}] ${text}` , assistantThreadId: convIdRef.current }),
				signal: controller.signal,
			});
			if (!res.ok) throw new Error('talk failed');

						let finalText = '';
						let trailerBuf = '';
						const trailerStart = '[[CITATIONS:';
						if (streamOn && res.body) {
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				for (;;) {
					const { value, done } = await reader.read();
					if (done) break;
					const part = decoder.decode(value, { stream: true });
								// Detect trailer markers and parse citations/temperature, do not render trailer text
								trailerBuf += part;
								let displayPart = part;
								const idx = trailerBuf.indexOf(trailerStart);
								if (idx !== -1) {
									// split visible text and trailer
									displayPart = trailerBuf.slice(0, idx);
									const rest = trailerBuf.slice(idx);
									const endIdx = rest.indexOf(']]');
									if (endIdx !== -1) {
										const marker = rest.slice(0, endIdx + 2);
										// parse markers
										const m = marker.match(/\[\[CITATIONS:([^\]|]*)\|TEMP:([0-9.]+)\]\]/);
										if (m) {
											const cites = m[1] ? m[1].split('|').filter(Boolean) : [];
											setCitations(cites);
										}
										trailerBuf = rest.slice(endIdx + 2);
									} else {
										// incomplete trailer, keep buffer but don't display
										displayPart = trailerBuf.slice(0, idx);
										trailerBuf = rest;
									}
								}
								finalText += displayPart;
								setMessages((prev) => {
						const last = prev[prev.length - 1];
						if (last?.role === 'assistant') {
							const mm = [...prev];
										mm[mm.length - 1] = { ...last, text: (last.text || '') + displayPart };
							return mm;
						}
									return [...prev, { role: 'assistant', text: displayPart }];
					});
				}
			} else {
				const data = await res.json();
				finalText = data?.text || '';
				setCitations(Array.isArray(data?.meta?.citations) ? data.meta.citations : []);
				setMessages((m) => [...m, { role: 'assistant', text: finalText }]);
			}
			speak(finalText);
			try { if (dingRef.current) { dingRef.current.currentTime = 0; if (typeof dingRef.current.play === 'function') { await dingRef.current.play(); } } } catch {}
		} catch (e) {
			toast({ status: 'error', title: 'Assistant unavailable', description: 'Please try again later.' });
		} finally {
			setLoading(false);
			abortRef.current = null;
		}
	};

	const stopGeneration = () => {
		try { abortRef.current?.abort(); } catch {}
		setLoading(false);
	};

	const regenerate = async () => {
		const text = (lastUserTextRef.current || '').trim();
		if (!text) return;
		setCitations([]);
		setLoading(true);
		try {
			// remove last assistant message if present
			setMessages(prev => prev[prev.length-1]?.role === 'assistant' ? prev.slice(0,-1) : prev);
			const endpoint = streamOn ? 'talk-stream' : 'talk';
			const controller = new AbortController();
			abortRef.current = controller;
						const res = await fetch(`${host}/companion/${endpoint}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') },
							body: JSON.stringify({ text: `[${mode}] ${text}` , assistantThreadId: convIdRef.current }),
				signal: controller.signal,
			});
			if (!res.ok) throw new Error('talk failed');

						let finalText = '';
						let trailerBuf = '';
						const trailerStart = '[[CITATIONS:';
						if (streamOn && res.body) {
				const reader = res.body.getReader();
				const decoder = new TextDecoder();
				for(;;){
					const { value, done } = await reader.read();
					if (done) break;
					const part = decoder.decode(value, { stream: true });
								trailerBuf += part;
								let displayPart = part;
								const idx = trailerBuf.indexOf(trailerStart);
								if (idx !== -1) {
									displayPart = trailerBuf.slice(0, idx);
									const rest = trailerBuf.slice(idx);
									const endIdx = rest.indexOf(']]');
									if (endIdx !== -1) {
										const marker = rest.slice(0, endIdx + 2);
										const m = marker.match(/\[\[CITATIONS:([^\]|]*)\|TEMP:([0-9.]+)\]\]/);
										if (m) {
											const cites = m[1] ? m[1].split('|').filter(Boolean) : [];
											setCitations(cites);
										}
										trailerBuf = rest.slice(endIdx + 2);
									} else {
										displayPart = trailerBuf.slice(0, idx);
										trailerBuf = rest;
									}
								}
								finalText += displayPart;
								setMessages((prev) => {
						const last = prev[prev.length - 1];
						if (last?.role === 'assistant') {
							const mm = [...prev];
										mm[mm.length - 1] = { ...last, text: (last.text || '') + displayPart };
							return mm;
						}
									return [...prev, { role: 'assistant', text: displayPart }];
					});
				}
			} else {
				const data = await res.json();
				finalText = data?.text || '';
				setMessages((m) => [...m, { role: 'assistant', text: finalText }]);
			}
			speak(finalText);
			try { if (dingRef.current) { dingRef.current.currentTime = 0; if (typeof dingRef.current.play === 'function') { await dingRef.current.play(); } } } catch {}
		} catch(e) {
			toast({ status:'error', title:'Assistant unavailable', description:'Please try again later.'});
		} finally {
			setLoading(false);
			abortRef.current = null;
		}
	};

	const onModeChange = async (val) => {
		setMode(val);
		try {
			const res = await fetch(`${host}/companion/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ modes: { current: val } }) });
			if (res.ok) setProfile(await res.json());
		} catch {}
	};

		const onVoiceChange = async (val) => {
			setVoiceName(val);
			try {
				const v = voicesList.find(v => v.name === val);
				const accent = v?.lang || 'en-US';
					const res = await fetch(`${host}/companion/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ voice: { name: val, accent } }) });
				if (res.ok) setProfile(await res.json());
			} catch {}
		};

			const saveProfile = async () => {
				try {
					const res = await fetch(`${host}/companion/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ displayName: editName, appearance: { avatarUrl: editAvatar } }) });
					if (res.ok) {
						const data = await res.json();
						setProfile(data);
						toast({ status: 'success', title: 'Profile updated' });
					}
				} catch {}
			};

			const addMemory = async () => {
				const key = memKey.trim();
				if (!key) return;
				try {
					const res = await fetch(`${host}/companion/memory`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'auth-token': localStorage.getItem('token') }, body: JSON.stringify({ key, value: memVal }) });
					if (res.ok) {
						setMemKey(""); setMemVal("");
						toast({ status: 'success', title: 'Saved to memory' });
					}
				} catch {}
			};

		// Keyboard: Ctrl+Enter to send; optionally Enter to send
		useEffect(() => {
			const onKey = (e) => {
				if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); send(); return; }
				if (enterToSend && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); return; }
			};
			window.addEventListener('keydown', onKey);
			return () => window.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [input, mode, enterToSend]);

	// persist enterToSend
	useEffect(()=>{ try { localStorage.setItem('assistant:enterToSend', enterToSend ? '1' : '0'); } catch {} }, [enterToSend]);

	const fetchMemories = useCallback(async ()=>{
		try{
			const res = await fetch(`${host}/companion/memories`, { headers:{'auth-token': localStorage.getItem('token')} });
			if (res.ok) setMemList(await res.json());
		} catch {}
	}, [host]);

	const saveMemoryEdit = useCallback(async (key, value)=>{
		try{
			await fetch(`${host}/companion/memory`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ key, value }) });
			toast({ status:'success', title:'Memory updated' });
			fetchMemories();
		}catch{}
	}, [host, fetchMemories, toast]);

		return (
			<Box maxW="7xl" mx="auto" px={4} py={6} position="relative">
				<VFXBackground />
				<Box position="relative" zIndex={1}
				>
				  <HStack mb={3} spacing={2} wrap="wrap">
					{threads.map(t => (
						<Button key={t.id} size="xs" variant={t.id===convId ? 'solid':'outline'} colorScheme="pink" onClick={()=>{
							setConvId(t.id); convIdRef.current = t.id;
							try{
								const raw = localStorage.getItem(`assistant:msgs:${t.id}`); setMessages(raw ? JSON.parse(raw) : []);
							}catch{ setMessages([]); }
						}} onDoubleClick={()=>{
							const tt = prompt('Rename thread', t.title || '');
							if (tt != null) {
								saveThreads(threads.map(x=> x.id===t.id? { ...x, title: tt } : x));
							}
						}}>{t.title || 'Thread'}</Button>
					))}
					<Button size="xs" onClick={()=>{
						const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
						const t = [...threads, { id, title: 'New Thread' }];
						saveThreads(t); setConvId(id); convIdRef.current = id; setMessages([]);
					}}>+ New</Button>
					<Button size="xs" colorScheme="red" variant="outline" onClick={()=>{
						if (!convId) return;
						const t = threads.filter(x=> x.id !== convId);
						saveThreads(t);
						try{ localStorage.removeItem(`assistant:msgs:${convId}`); } catch {}
						setMessages([]);
						if (t[0]) { setConvId(t[0].id); convIdRef.current = t[0].id; } else { const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`; setConvId(id); convIdRef.current=id; saveThreads([{id, title:'Thread'}]); }
					}}>Delete</Button>
				  </HStack>
			  <HStack justify="space-between" mb={4}>
				<HStack>
				  <Avatar name={profile?.displayName || 'Ava'} src={profile?.appearance?.avatarUrl || undefined} bg="pink.300" boxSize="12" />
					<Stack spacing={0}>
						<Text fontSize="lg" fontWeight="bold">{profile?.displayName || 'Ava'}</Text>
						<HStack>
							<Badge colorScheme={speaking ? 'green' : 'gray'}>{speaking ? 'Speaking' : 'Idle'}</Badge>
							<Badge>{mode}</Badge>
						</HStack>
					</Stack>
				</HStack>
						<HStack>
					<Select size="sm" value={mode} onChange={(e) => onModeChange(e.target.value)}>
						{MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
					</Select>
							<Select size="sm" value={voiceName} onChange={(e) => onVoiceChange(e.target.value)} placeholder="Voice">
								{voicesList.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
							</Select>
																						<Select size="sm" value={avatarMode} onChange={(e)=> setAvatarMode(e.target.value)}>
																<option value="auto">Avatar: Auto</option>
																<option value="stylized">Avatar: Stylized</option>
																<option value="shinchan">Avatar: Shinchan</option>
																							<option value="goku">Avatar: Goku</option>
																  <option value="pm">Avatar: PM</option>
																  <option value="ben10">Avatar: Ben 10</option>
																  <option value="gojo">Avatar: Gojo</option>
																  <option value="billgates">Avatar: Bill Gates</option>
																						  <option value="sundar">Avatar: Sundar Pichai</option>
																<option value="talkinghead">Avatar: TalkingHead (GLB)</option>
																<option value="cinematic">Avatar: Cinematic (GLB)</option>
															</Select>
									<HStack pl={2}>
										<Text fontSize="sm">Emotion cam</Text>
										<Switch size="sm" isChecked={camOn} onChange={(e) => setCamOn(e.target.checked)} />
									</HStack>
																			<HStack pl={2}>
																				<Text fontSize="sm">Auto speak</Text>
																				<Switch size="sm" isChecked={profile?.settings?.autoSpeak !== false} onChange={async (e) => {
																					try {
																						const res = await fetch(`${host}/companion/profile`, { method:'POST', headers: { 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ settings: { autoSpeak: e.target.checked } })});
																						if (res.ok) setProfile(await res.json());
																					} catch {}
																				}} />
																			</HStack>
																			<HStack pl={2}>
																				<Text fontSize="sm">Cinematic</Text>
																				<Switch size="sm" isChecked={cinematicOn} onChange={(e)=> setCinematicOn(e.target.checked)} isDisabled={avatarMode !== 'auto'} />
																			</HStack>
																			<HStack pl={2}>
																				<Text fontSize="sm">Auto listen</Text>
																				<Switch size="sm" isChecked={!!profile?.settings?.autoListen} onChange={async (e) => {
																					try {
																						const on = e.target.checked;
																						const res = await fetch(`${host}/companion/profile`, { method:'POST', headers: { 'Content-Type':'application/json','auth-token':localStorage.getItem('token') }, body: JSON.stringify({ settings: { autoListen: on } })});
																						if (res.ok) setProfile(await res.json());
																						if (on && !listening) setTimeout(() => toggleMic(), 300);
																						if (!on && listening) toggleMic();
																					} catch {}
																				}} />
																			</HStack>
																			<HStack pl={2}>
																				<Text fontSize="sm">Stream</Text>
																				<Switch size="sm" isChecked={streamOn} onChange={async (e)=>{
																					const on = e.target.checked; setStreamOn(on);
																					try{
																						const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ settings: { streamReplies: on } })});
																						if (res.ok) setProfile(await res.json());
																					}catch{}
																				}} />
																			</HStack>
																			<Select size="sm" value={profile?.settings?.safetyLevel || 'medium'} onChange={async (e)=>{
																				try{
																					const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ settings: { safetyLevel: e.target.value } })});
																					if (res.ok) setProfile(await res.json());
																				}catch{}
																			}}>
																				<option value="low">Safety: Low</option>
																				<option value="medium">Safety: Medium</option>
																				<option value="high">Safety: High</option>
																			</Select>
																											<HStack pl={2} minW="200px">
																												<Text fontSize="sm">Creativity</Text>
																												<Slider size="sm" min={0} max={1} step={0.05} value={temperature} onChange={async (val)=>{
																													setTemperature(val);
																													try{
																														const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ settings: { temperature: val } })});
																														if (res.ok) setProfile(await res.json());
																													}catch{}
																												}}>
																													<SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
																												</Slider>
																											</HStack>
{avatarMode === 'goku' && (
  <HStack pl={2}>
    <Text fontSize="sm">Super Saiyan</Text>
    <Switch size="sm"
      isChecked={!!profile?.appearance?.gokuSuperSaiyan}
      onChange={(e)=> updateAppearance({ gokuSuperSaiyan: e.target.checked })}
    />
  </HStack>
)}
{avatarMode === 'gojo' && (
  <HStack pl={2}>
    <Text fontSize="sm">Blindfold</Text>
    <Switch size="sm"
      isChecked={profile?.appearance?.gojoBlindfold !== false}
      onChange={(e)=> updateAppearance({ gojoBlindfold: e.target.checked })}
    />
  </HStack>
)}
				</HStack>
			</HStack>

						{/* 3D avatar with glass panel */}
																											<Box position="relative" h="320px" borderWidth="1px" borderRadius="2xl" mb={4} overflow="hidden" boxShadow="xl" backdropFilter="blur(10px)" bg="blackAlpha.300">
																												{/* put waves first so they render behind the face */}
																												<VoiceWaves active={listening || speaking} />
																																																																																				<Box position="absolute" inset={0} zIndex={1}>
																																																																																					{renderAvatar()}
																																																																																				</Box>

																																																																																							{citations.length > 0 && (
																																																																																								<HStack spacing={2} mb={3}>
																																																																																									<Text fontSize="sm" color="whiteAlpha.700">Citations:</Text>
																																																																																									{citations.map(c => (
																																																																																										<Tag key={c} size="sm" colorScheme="purple"><TagLabel>{c}</TagLabel></Tag>
																																																																																									))}
																																																																																								</HStack>
																																																																																							)}
										{camOn && <EmotionSensor enabled={camOn} onMood={setLiveMood} onError={() => setCamOn(false)} />}
								{speaking && (
									<Box position="absolute" right={3} bottom={2} fontSize="2xl" bg="whiteAlpha.700" px={2} borderRadius="md">
												{gestures[(liveMood || inferGestureFromText(messages[messages.length-1]?.text || ""))]?.label}
									</Box>
								)}
							</Box>

																																																																																		<HStack justify="space-between" mb={2}>
																																																																																			<HStack>
																																																																																				<Switch size="sm" isChecked={enterToSend} onChange={(e)=> setEnterToSend(e.target.checked)} />
																																																																																				<Text fontSize="sm" color="whiteAlpha.800">Press Enter to send</Text>
																																																																																			</HStack>
																																																																																			<Button size="xs" variant="ghost" onClick={()=>{ setMemOpen(v=>!v); if (!memOpen) fetchMemories(); }}>
																																																																																				{memOpen ? 'Hide Memories' : 'Show Memories'}
																																																																																			</Button>
																																																																																		</HStack>

																																																																																		{memOpen && (
																																																																																			<Box borderWidth="1px" borderRadius="xl" p={2} mb={3} bg="blackAlpha.300">
																																																																																				<Text mb={2} fontWeight="semibold">Memories</Text>
																																																																																				<Stack maxH="180px" overflowY="auto">
																																																																																					{memList.map(m => (
																																																																																						<HStack key={m.key} align="flex-start">
																																																																																							<Box minW="44%" fontSize="sm" color="whiteAlpha.800">{m.key}</Box>
																																																																																							<Textarea size="sm" rows={2} defaultValue={m.value} onBlur={(e)=> saveMemoryEdit(m.key, e.target.value)} />
																																																																																						</HStack>
																																																																																					))}
																																																																																					{memList.length === 0 && <Text color="whiteAlpha.700" fontSize="sm">No memories</Text>}
																																																																																				</Stack>
																																																																																			</Box>

																																																																																			)}

																																																								<Box borderWidth="1px" borderRadius="2xl" p={3} mb={3} maxH="40vh" overflowY="auto" bg="blackAlpha.400" backdropFilter="blur(8px)">
				<Stack spacing={3}>
					{messages.map((m, i) => (
										<Box key={i} alignSelf={m.role === 'user' ? 'flex-end' : 'flex-start'} bg={m.role === 'user' ? 'blue.500' : 'pink.500'} color="white" px={3} py={2} borderRadius="lg" maxW="70%" boxShadow="md">
							<Text whiteSpace="pre-wrap">{m.text}</Text>
									</Box>
					))}
					<Box ref={messagesEndRef} />
												{loading && (
													<HStack>
														<Spinner size="sm" color="pink.300" />
														<Text color="whiteAlpha.800">Assistant is typing…</Text>
													</HStack>
												)}
				</Stack>
			</Box>

										<Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={4}>
						<FormControl maxW="sm">
							<FormLabel fontSize="sm">Display Name</FormLabel>
							<Input size="sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
						</FormControl>
												<FormControl>
							<FormLabel fontSize="sm">Avatar URL</FormLabel>
							<Input size="sm" value={editAvatar} onChange={(e) => setEditAvatar(e.target.value)} />
						</FormControl>
												<Stack spacing={2} w={{base:'full', md:'xs'}}>
													<FormLabel fontSize="xs">Voice Rate</FormLabel>
													<Slider size="sm" min={0.5} max={1.5} step={0.05} value={profile?.voice?.rate || 1} onChange={async (val)=>{
														try{
															const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ voice: { rate: val } })});
															if (res.ok) setProfile(await res.json());
														}catch{}
													}}>
														<SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
													</Slider>
													<FormLabel fontSize="xs">Voice Pitch</FormLabel>
													<Slider size="sm" min={0.5} max={1.5} step={0.05} value={profile?.voice?.pitch || 1} onChange={async (val)=>{
														try{
															const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ voice: { pitch: val } })});
															if (res.ok) setProfile(await res.json());
														}catch{}
													}}>
														<SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
													</Slider>
													<FormLabel fontSize="xs">Voice Volume</FormLabel>
													<Slider size="sm" min={0.2} max={1} step={0.05} value={profile?.voice?.volume || 1} onChange={async (val)=>{
														try{
															const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ voice: { volume: val } })});
															if (res.ok) setProfile(await res.json());
														}catch{}
													}}>
														<SliderTrack><SliderFilledTrack /></SliderTrack><SliderThumb />
													</Slider>
												</Stack>
												<Button alignSelf="flex-end" size="sm" colorScheme="pink" onClick={saveProfile}>Save Profile</Button>
					</Stack>

					<Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={4}>
						<FormControl maxW="sm">
							<FormLabel fontSize="sm">Remember this (key)</FormLabel>
							<Input size="sm" placeholder="e.g., my.favorite.color" value={memKey} onChange={(e) => setMemKey(e.target.value)} />
						</FormControl>
						<FormControl>
							<FormLabel fontSize="sm">Value</FormLabel>
							<Input size="sm" placeholder="e.g., teal" value={memVal} onChange={(e) => setMemVal(e.target.value)} />
						</FormControl>
						<Button alignSelf="flex-end" size="sm" variant="outline" onClick={addMemory}>Add Memory</Button>
						<Button alignSelf="flex-end" size="sm" variant="ghost" onClick={async ()=>{
							const key = memKey.trim(); if (!key) return;
							try{
								await fetch(`${host}/companion/memory`, { method:'DELETE', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ key })});
								setMemKey(""); setMemVal(""); toast({ status:'success', title:'Memory deleted' });
							}catch{}
						}}>Delete Key</Button>
						<Button alignSelf="flex-end" size="sm" variant="ghost" colorScheme="red" onClick={async ()=>{
							try{
								await fetch(`${host}/companion/memory/clear`, { method:'POST', headers:{'auth-token':localStorage.getItem('token')} });
								toast({ status:'success', title:'All memories cleared' });
							}catch{}
						}}>Clear All</Button>
					</Stack>

					<Stack direction={{ base: 'column', md: 'row' }} spacing={4} mb={4}>
  <FormControl>
    <FormLabel fontSize="sm">Persona System Prompt</FormLabel>
    <Textarea size="sm" rows={3} value={personaPrompt} onChange={(e)=> setPersonaPrompt(e.target.value)} placeholder="Guide how your assistant should behave..." />
  </FormControl>
  <FormControl>
    <FormLabel fontSize="sm">Traits (comma separated)</FormLabel>
    <Input size="sm" value={traitsCSV} onChange={(e)=> setTraitsCSV(e.target.value)} placeholder="empathetic, playful, supportive" />
  </FormControl>
	<FormControl maxW={{base:'full', md:'xs'}}>
		<FormLabel fontSize="sm">Persona Preset</FormLabel>
		<Select size="sm" onChange={async (e)=>{
			const p = PERSONA_PRESETS.find(x=> x.key === e.target.value);
			if (!p || p.key==='custom') return;
			setPersonaPrompt(p.prompt); setTraitsCSV(p.traits.join(', '));
			try{
				const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ systemPrompt: p.prompt, traits: p.traits })});
				if (res.ok) setProfile(await res.json());
			}catch{}
		}} defaultValue={'custom'}>
			{PERSONA_PRESETS.map(p=> <option key={p.key} value={p.key}>{p.label}</option>)}
		</Select>
	</FormControl>
  <Button alignSelf="flex-end" size="sm" onClick={async ()=>{
    try{
      const traits = traitsCSV.split(',').map(s=>s.trim()).filter(Boolean);
      const res = await fetch(`${host}/companion/profile`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ systemPrompt: personaPrompt, traits }) });
      if (res.ok){ setProfile(await res.json()); toast({ status:'success', title:'Persona updated' }); }
    }catch{}
  }}>Save Persona</Button>
</Stack>

<Stack spacing={2} mb={4}>
  <FormLabel fontSize="sm">Paste knowledge (notes, docs). We’ll store as memories.</FormLabel>
  <Textarea rows={4} placeholder="Paste any text here..." value={knowledgeText} onChange={(e)=> setKnowledgeText(e.target.value)} />
	<HStack>
		<Button size="sm" onClick={async ()=>{
      const text = knowledgeText.trim(); if (!text) return;
      try{
        const chunks = text.match(/(.|\n){1,600}/g) || [text];
        let i = 0;
        for (const chunk of chunks){
          const key = `kb.${Date.now()}.${i++}`;
          await fetch(`${host}/companion/memory`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ key, value: chunk, tags:['kb'], weight: 2 }) });
        }
        setKnowledgeText("");
        toast({ status:'success', title:'Knowledge ingested', description:`${i} chunks saved` });
      }catch{}
    }}>Ingest</Button>
	<MotionButton size="sm" variant="ghost" onClick={()=> setKnowledgeText("")}>Clear</MotionButton>
  </HStack>
</Stack>

									<Stack spacing={2}>
							<HStack>
											<Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Say something..." rows={2} resize="vertical" />
											<Tooltip label={listening ? 'Stop listening' : 'Start voice input'} hasArrow>
												<MotionButton onClick={toggleMic} variant="outline" colorScheme={listening ? 'red' : 'pink'}>{listening ? 'Stop' : 'Mic'}</MotionButton>
											</Tooltip>
											<MotionButton onClick={send} isDisabled={loading}>Send</MotionButton>
											<MotionButton variant="outline" colorScheme="red" onClick={stopGeneration} isDisabled={!loading}>Stop</MotionButton>
											<MotionButton variant="outline" onClick={regenerate} isDisabled={loading || !lastUserTextRef.current}>Regenerate</MotionButton>
<Button variant="ghost" onClick={()=>{
  const json = JSON.stringify({ messages }, null, 2);
  const blob = new Blob([json], { type:'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `assistant-chat-${Date.now()}.json`; a.click(); URL.revokeObjectURL(url);
}}>Export JSON</Button>
											<MotionButton variant="ghost" colorScheme="red" onClick={()=> setMessages([])}>Clear Chat</MotionButton>
											<Button variant="ghost" onClick={async ()=>{
    const last = [...messages].reverse().find(m=> m.role==='assistant');
    if (!last?.text) return;
    try{
      const key = `note.${Date.now()}`;
      await fetch(`${host}/companion/memory`, { method:'POST', headers:{'Content-Type':'application/json','auth-token':localStorage.getItem('token')}, body: JSON.stringify({ key, value: last.text })});
      toast({ status:'success', title:'Saved last reply to memory', description: key });
    }catch{}
  }}>Remember last</Button>
  <Button variant="ghost" onClick={()=>{
    const lines = messages.map(m=> `${m.role=== 'user' ? 'You' : 'Assistant'}: ${m.text}`);
    const blob = new Blob([lines.join('\n\n')], { type:'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `assistant-chat-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  }}>Export</Button>
							</HStack>
							<HStack spacing={2}>
								{['Cheer me up','Plan my day','Flirt','Write a poem'].map((q)=>(
									<Tooltip key={q} label="Insert prompt" hasArrow>
										<Tag cursor="pointer" onClick={()=> setInput(prev => prev ? prev+"\n"+q : q)} colorScheme="pink" variant="subtle" size="md" borderRadius="full">
											<TagLabel>{q}</TagLabel>
										</Tag>
									</Tooltip>
								))}
								<Box flex={1} textAlign="right" color="whiteAlpha.700" fontSize="sm">
									Tip: <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> to send
								</Box>
							</HStack>
						</Stack>

					  </Box>
		</Box>
	);
}
