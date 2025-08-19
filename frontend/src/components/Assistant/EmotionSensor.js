import React, { useEffect, useRef, useState } from 'react';
import { Box, Text } from '@chakra-ui/react';

// Lightweight face expression sensing using MediaPipe Tasks FaceLandmarker
// Maps blendshapes to simple moods. Requires camera permission.
export default function EmotionSensor({ onMood, enabled, onError }) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const detectorRef = useRef(null);
  const rafRef = useRef(0);

  useEffect(() => {
    let stream;
    const start = async () => {
      try {
        setStatus('loading');
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm'
        );
        const face = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          },
          outputFaceBlendshapes: true,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        detectorRef.current = face;
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus('running');
        loop();
      } catch (e) {
        setStatus('error');
        onError && onError(e);
      }
    };
    const loop = () => {
      const det = detectorRef.current; const v = videoRef.current;
      if (!det || !v || v.readyState < 2) { rafRef.current = requestAnimationFrame(loop); return; }
      const nowMs = performance.now();
      try {
        const res = det.detectForVideo(v, nowMs);
        const mood = pickMoodFromBlendshapes(res?.faceBlendshapes?.[0]?.categories || []);
        if (mood && onMood) onMood(mood);
      } catch {}
      rafRef.current = requestAnimationFrame(loop);
    };
    if (enabled) start();
    return () => {
      cancelAnimationFrame(rafRef.current);
      detectorRef.current?.close?.();
      if (stream) stream.getTracks().forEach(t => t.stop());
      detectorRef.current = null;
      setStatus('idle');
    };
  }, [enabled, onMood, onError]);

  return (
    <Box>
      <video ref={videoRef} width={0} height={0} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }} />
      {status === 'error' && <Text color="red.400">Camera/Model error</Text>}
    </Box>
  );
}

function pickMoodFromBlendshapes(cats) {
  if (!cats || cats.length === 0) return null;
  const map = new Map(cats.map(c => [c.categoryName, c.score]));
  const smile = ((map.get('mouthSmileLeft') || 0) + (map.get('mouthSmileRight') || 0)) / 2;
  const kissy = (map.get('kiss') || 0);
  const eyeSquint = ((map.get('eyeSquintLeft') || 0) + (map.get('eyeSquintRight') || 0)) / 2;
  const browDown = ((map.get('browDownLeft') || 0) + (map.get('browDownRight') || 0)) / 2;
  const mouthFrown = ((map.get('mouthFrownLeft') || 0) + (map.get('mouthFrownRight') || 0)) / 2;

  if (kissy > 0.4) return 'kiss';
  if (smile > 0.5 && eyeSquint > 0.3) return 'laugh';
  if (smile > 0.35) return 'smile';
  if (browDown > 0.4 || mouthFrown > 0.35) return 'sad';
  return null;
}
