import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF } from "@react-three/drei";

// Lightweight Ready Player Me GLB avatar renderer with simple, fake lip-sync and moods.
// It searches morph targets by common ARKit-like names and animates them based on props.

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

function findMorphIndices(dict, patterns) {
  const out = {};
  if (!dict) return out;
  const entries = Object.entries(dict);
  for (const key in patterns) {
    const pats = patterns[key];
    let idx = -1;
    for (const p of pats) {
      const found = entries.find(([name]) => new RegExp(p, "i").test(name));
      if (found) { idx = found[1]; break; }
    }
    out[key] = idx;
  }
  return out;
}

function AvatarModel({ url, speaking, mood }) {
  const { scene } = useGLTF(url, true);
  const groupRef = useRef();
  const [morphTargets, setMorphTargets] = useState(null);
  const tRef = useRef(0);
  const blinkTimer = useRef({ t: 0, closing: false, value: 0 });

  // Find first mesh with morph targets
  useEffect(() => {
    let targetMesh = null;
    scene.traverse((obj) => {
      if (obj.morphTargetDictionary && obj.morphTargetInfluences) {
        if (!targetMesh) targetMesh = obj;
      }
    });
    if (targetMesh) {
      const dict = targetMesh.morphTargetDictionary;
      const indices = findMorphIndices(dict, {
        jawOpen: ["jawOpen", "mouthOpen"],
        smileL: ["mouthSmile_L"],
        smileR: ["mouthSmile_R"],
        frownL: ["mouthFrown_L"],
        frownR: ["mouthFrown_R"],
        blinkL: ["eyeBlink_L", "eyesClosed_L", "blink_L"],
        blinkR: ["eyeBlink_R", "eyesClosed_R", "blink_R"],
        browUp: ["browInnerUp", "browOuterUp_L", "browOuterUp_R"],
        browDownL: ["browDown_L"],
        browDownR: ["browDown_R"],
      });
      setMorphTargets({ mesh: targetMesh, dict: targetMesh.morphTargetDictionary, indices });
    }
  }, [scene]);

  useFrame((_, delta) => {
    tRef.current += delta;
    const t = tRef.current;
    if (!morphTargets) return;
    const { mesh, indices } = morphTargets;
    const inf = mesh.morphTargetInfluences;
    if (!inf) return;

    // Idle head sway
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(t * 0.2) * 0.05;
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.02;
    }

    // Blinking every ~3-5 seconds
    blinkTimer.current.t += delta;
    if (blinkTimer.current.t > 3 + Math.random() * 2) {
      blinkTimer.current.t = 0;
      blinkTimer.current.closing = true;
    }
    if (blinkTimer.current.closing) {
      blinkTimer.current.value += delta * 8; // fast close
      if (blinkTimer.current.value >= 1) blinkTimer.current.closing = false;
    } else if (blinkTimer.current.value > 0) {
      blinkTimer.current.value -= delta * 6; // slower open
    }
    const blinkVal = clamp01(blinkTimer.current.value);
    if (indices.blinkL >= 0) inf[indices.blinkL] = blinkVal;
    if (indices.blinkR >= 0) inf[indices.blinkR] = blinkVal;

    // Simple mouth movement when speaking
    const mouth = speaking ? (0.5 + 0.5 * Math.abs(Math.sin(t * 8)) + 0.1 * Math.sin(t * 17)) : 0.02;
    if (indices.jawOpen >= 0) inf[indices.jawOpen] = clamp01(mouth);

    // Moods: adjust smile/frown/brow
    let smile = 0, frown = 0, browUp = 0, browDown = 0;
    switch (mood) {
      case "happy":
      case "love":
      case "playful":
        smile = 0.4;
        browUp = 0.1;
        break;
      case "sad":
      case "tired":
        frown = 0.2;
        browDown = 0.1;
        break;
      case "angry":
      case "annoyed":
        frown = 0.4;
        browDown = 0.25;
        break;
      default:
        break;
    }
    if (indices.smileL >= 0) inf[indices.smileL] = smile;
    if (indices.smileR >= 0) inf[indices.smileR] = smile;
    if (indices.frownL >= 0) inf[indices.frownL] = frown;
    if (indices.frownR >= 0) inf[indices.frownR] = frown;
    if (indices.browUp >= 0) inf[indices.browUp] = browUp;
    if (indices.browDownL >= 0) inf[indices.browDownL] = browDown;
    if (indices.browDownR >= 0) inf[indices.browDownR] = browDown;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export default function RpmAvatar({ url, speaking, mood }) {
  const isValidUrl = useMemo(() => typeof url === "string" && /\.(glb|gltf|vrm)(\?|#|$)/i.test(url), [url]);

  // Force pixel ratio limit for perf
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

  if (!isValidUrl) {
  }

  return (
    <Canvas dpr={dpr} camera={{ position: [0, 1.4, 2.2], fov: 35 }}>
      <Suspense fallback={null}>
        <ambientLight intensity={0.6} />
        <directionalLight intensity={0.8} position={[2, 3, 2]} />
        <Environment preset="studio" />
        <AvatarModel url={url} speaking={speaking} mood={mood} />
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={3} target={[0, 1.4, 0]} />
    </Canvas>
  );
}
