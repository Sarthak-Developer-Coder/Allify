import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

// Dynamic wrapper around @met4citizen/talkinghead that mounts into a div.
// If the library or avatar fails to load, it silently renders nothing.
const TalkingHeadAvatar = forwardRef(function TalkingHeadAvatar({ url, speaking, mood, onSpeakStart, onSpeakEnd }, ref) {
  const containerRef = useRef(null);
  const thRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let th;
    (async () => {
      try {
        if (!url) return;
        const mod = await import("@met4citizen/talkinghead");
        const TalkingHead = mod?.default || mod?.TalkingHead;
        if (!TalkingHead) throw new Error("TalkingHead not exported");

        const container = containerRef.current;
        const w = container?.clientWidth || 800;
        const h = container?.clientHeight || 400;

        try {
          th = new TalkingHead({ container, width: w, height: h, transparent: true });
        } catch {
          try { th = new TalkingHead(container); } catch {}
        }
        if (!th) throw new Error("Failed to create TalkingHead instance");
        thRef.current = th;

        if (typeof th.showAvatar === "function") {
          await th.showAvatar(url);
        } else if (typeof th.load === "function") {
          await th.load(url);
        }

        if (cancelled) return;
  // ready
        if (typeof th.lookAhead === "function") th.lookAhead();
        if (mood && typeof th.setMood === "function") th.setMood(mood);
  } catch (e) {}
    })();
    return () => {
      cancelled = true;
      try {
        const th = thRef.current;
        if (th?.dispose) th.dispose();
        thRef.current = null;
      } catch {}
    };
  }, [url, mood]);

  useEffect(() => {
    try {
      const th = thRef.current;
      if (th && typeof th.setMood === "function" && mood) th.setMood(mood);
    } catch {}
  }, [mood]);

  useEffect(() => {
    try {
      const th = thRef.current;
      if (!th) return;
      if (speaking && typeof th.speakingStart === "function") th.speakingStart();
      if (!speaking && typeof th.speakingStop === "function") th.speakingStop();
    } catch {}
  }, [speaking]);

  // Imperative API for parent
  useImperativeHandle(ref, () => ({
    async speakText(text) {
      const th = thRef.current;
      if (!th || !text) return;
      try {
        onSpeakStart && onSpeakStart();
        if (typeof th.speakText === "function") {
          const ret = th.speakText(text);
          if (ret && typeof ret.then === 'function') {
            await ret;
          } else {
            // Fallback: estimate duration ~ 150wpm
            const seconds = Math.max(1, text.split(/\s+/).length / 2.5);
            await new Promise(r => setTimeout(r, seconds * 1000));
          }
        } else {
          if (typeof th.speakingStart === 'function') th.speakingStart();
          const seconds = Math.max(1, text.split(/\s+/).length / 2.5);
          await new Promise(r => setTimeout(r, seconds * 1000));
          if (typeof th.speakingStop === 'function') th.speakingStop();
        }
      } finally {
        onSpeakEnd && onSpeakEnd();
      }
    },
    stop() {
      const th = thRef.current;
      try { if (th?.stop) th.stop(); } catch {}
      try { if (th?.speakingStop) th.speakingStop(); } catch {}
      onSpeakEnd && onSpeakEnd();
    }
  }), [onSpeakStart, onSpeakEnd]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
});

export default TalkingHeadAvatar;
