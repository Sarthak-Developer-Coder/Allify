import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function Head({ speaking, mood, appearance }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const brows = useRef({ left: null, right: null });
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  // Enhanced appearance with defaults for a beautiful girl
  const skinColor = appearance?.skinColor || '#ffdbca';
  const eyeIrisColor = appearance?.eyeColor || '#5a8fd3';
  const hairColor = appearance?.hairColor || '#5d3a3a';
  const lipColor = appearance?.lipColor || '#d45a7a';

  // More sophisticated facial features
  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.4;
    targetRot.current.y = mouse.x * 0.35;
    targetRot.current.x = -mouse.y * 0.2;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    // Enhanced eye tracking with more natural movement
    const eyeOffsetY = mood === 'sad' ? -0.03 : mood === 'laugh' ? 0.04 : 0;
    [leftEye.current, rightEye.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = 0.16 + eyeOffsetY;
      e.position.x = (i === 0 ? -0.19 : 0.19);
      e.position.z = 0.47;
    });
    [leftIris.current, rightIris.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = (0.16 + eyeOffsetY) + mouse.y * -0.015;
      e.position.x = (i === 0 ? -0.19 : 0.19) + mouse.x * 0.015;
      e.position.z = 0.515;
    });

    // Smoother blinking animation
    blink.current.t -= dt;
    if (blink.current.t <= 0) {
      blink.current.t = 2 + Math.random() * 4;
      blink.current.closing = true;
    }
    const sclY = leftEye.current.scale.y;
    const speed = 12;
    const target = blink.current.closing ? 0.08 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.2) blink.current.closing = false;

    // More expressive brows
    const leftB = brows.current.left; const rightB = brows.current.right;
    if (leftB && rightB) {
      const tMood = mood === 'sad' ? 0.25 : mood === 'laugh' ? -0.2 : 0;
      leftB.rotation.z = 0.2 + tMood; rightB.rotation.z = -0.2 - tMood;
      leftB.position.y = 0.32 + (mood === 'laugh' ? 0.02 : 0);
      rightB.position.y = 0.32 + (mood === 'laugh' ? 0.02 : 0);
    }

    // More natural mouth movement
    const base = 0.16;
    const amp = speaking ? 0.16 : 0.03;
    const freq = speaking ? 6 : 1.5;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.9 + (mood === 'laugh' ? 0.2 : mood === 'sad' ? -0.1 : 0);
  });

  // Enhanced materials with subsurface scattering for more realistic skin
  const skin = useMemo(() => ({ 
    color: skinColor, 
    roughness: 0.4, 
    metalness: 0.02, 
    emissive: '#110000', 
    emissiveIntensity: 0.02,
    clearcoat: 0.1,
    clearcoatRoughness: 0.3,
    sheen: 0.2,
    sheenColor: '#ffb6c1',
    sheenRoughness: 0.8,
    ior: 1.4,
    transmission: 0.02,
    thickness: 0.5
  }), [skinColor]);

  const sclera = useMemo(() => ({ 
    color: '#ffffff', 
    roughness: 0.2, 
    metalness: 0,
    clearcoat: 0.2,
    clearcoatRoughness: 0.3
  }), []);

  const iris = useMemo(() => ({ 
    color: eyeIrisColor, 
    roughness: 0.15,
    metalness: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2
  }), [eyeIrisColor]);

  const pupil = useMemo(() => ({ 
    color: '#0a0a0a',
    roughness: 0.01,
    metalness: 0.5
  }), []);

  const lip = useMemo(() => ({ 
    color: lipColor, 
    roughness: 0.3, 
    metalness: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    sheen: 0.5,
    sheenColor: '#ff9eb5',
    sheenRoughness: 0.3
  }), [lipColor]);

  const browMat = useMemo(() => ({ 
    color: hairColor, 
    roughness: 0.8,
    metalness: 0.05
  }), [hairColor]);

  const hairMat = useMemo(() => ({ 
    color: hairColor, 
    roughness: 0.4, 
    metalness: 0.15,
    sheen: 0.3,
    sheenColor: '#fff',
    sheenRoughness: 0.8
  }), [hairColor]);

  const blushMat = useMemo(() => ({ 
    color: '#ffb3c6', 
    transparent: true, 
    opacity: 0.25,
    blending: THREE.AdditiveBlending
  }), []);

  // Create more detailed hair using multiple meshes
  const hairStrands = useMemo(() => {
    const strands = [];
    // Front bangs
    for (let i = 0; i < 12; i++) {
      const x = (i - 5.5) * 0.05;
      const zOffset = Math.abs(x) * 0.1;
      strands.push({
        position: [x, 0.3, 0.5 - zOffset],
        rotation: [0, 0, x * 0.3],
        size: [0.08 - Math.abs(x) * 0.01, 0.1, 0.02]
      });
    }
    // Side strands
    for (let i = 0; i < 8; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = (0.35 + (i * 0.03)) * side;
      strands.push({
        position: [x, 0.25, 0.3 - (i * 0.02)],
        rotation: [0, side * 0.2, side * 0.1],
        size: [0.06, 0.25, 0.03]
      });
    }
    return strands;
  }, []);

  return (
    <group ref={head}>
      {/* Head with more feminine proportions */}
      <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.6, 64, 64]} />
        <meshPhysicalMaterial {...skin} />
      </mesh>

      {/* More detailed hair */}
      <mesh position={[0, 0.22, -0.15]} scale={[1.05, 0.75, 1.02]}>
        <sphereGeometry args={[0.62, 36, 36]} />
        <meshStandardMaterial {...hairMat} />
      </mesh>

      {/* Individual hair strands for more realism */}
      {hairStrands.map((strand, i) => (
        <mesh
          key={i}
          position={strand.position}
          rotation={strand.rotation}
        >
          <boxGeometry args={strand.size} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
      ))}

      {/* Long flowing hair in the back */}
      <group position={[0, 0.1, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.7, 16, 1, true]} />
          <meshStandardMaterial {...hairMat} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* Cheek blush with gradient */}
      <mesh position={[-0.28, -0.02, 0.46]}>
        <circleGeometry args={[0.08, 24]} />
        <meshStandardMaterial {...blushMat} />
      </mesh>
      <mesh position={[0.28, -0.02, 0.46]}>
        <circleGeometry args={[0.08, 24]} />
        <meshStandardMaterial {...blushMat} />
      </mesh>

      {/* Larger, more expressive eyes */}
      <mesh ref={leftEye}>
        <sphereGeometry args={[0.095, 32, 32]} />
        <meshPhysicalMaterial {...sclera} />
      </mesh>
      <mesh ref={rightEye}>
        <sphereGeometry args={[0.095, 32, 32]} />
        <meshPhysicalMaterial {...sclera} />
      </mesh>

      {/* Iris with more depth */}
      <mesh ref={leftIris}>
        <circleGeometry args={[0.06, 32]} />
        <meshStandardMaterial {...iris} />
      </mesh>
      <mesh ref={rightIris}>
        <circleGeometry args={[0.06, 32]} />
        <meshStandardMaterial {...iris} />
      </mesh>

      {/* Pupils with subtle reflection */}
      <mesh position={[-0.19, 0.16, 0.535]}>
        <circleGeometry args={[0.022, 16]} />
        <meshStandardMaterial {...pupil} />
      </mesh>
      <mesh position={[0.19, 0.16, 0.535]}>
        <circleGeometry args={[0.022, 16]} />
        <meshStandardMaterial {...pupil} />
      </mesh>

      {/* Eyelashes - more detailed and curved */}
      <group position={[-0.19, 0.24, 0.47]}>
        {[0, 0.05, -0.05].map((offset, i) => (
          <mesh key={i} position={[offset, 0, 0]} rotation={[0, 0, 0.15 + offset * 2]}>
            <cylinderGeometry args={[0.005, 0.002, 0.04, 6]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        ))}
      </group>
      <group position={[0.19, 0.24, 0.47]}>
        {[0, 0.05, -0.05].map((offset, i) => (
          <mesh key={i} position={[offset, 0, 0]} rotation={[0, 0, -0.15 - offset * 2]}>
            <cylinderGeometry args={[0.005, 0.002, 0.04, 6]} />
            <meshStandardMaterial color={hairColor} />
          </mesh>
        ))}
      </group>

      {/* More delicate eyebrows */}
      <mesh ref={(n)=> (brows.current.left = n)} position={[-0.2, 0.33, 0.45]} rotation={[0,0,0.2]}>
        <boxGeometry args={[0.16, 0.015, 0.03]} />
        <meshStandardMaterial {...browMat} />
      </mesh>
      <mesh ref={(n)=> (brows.current.right = n)} position={[0.2, 0.33, 0.45]} rotation={[0,0,-0.2]}>
        <boxGeometry args={[0.16, 0.015, 0.03]} />
        <meshStandardMaterial {...browMat} />
      </mesh>

      {/* More refined nose */}
      <group position={[0, 0.06, 0.52]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshPhysicalMaterial {...skin} />
        </mesh>
        <mesh position={[-0.02, -0.01, -0.01]}>
          <sphereGeometry args={[0.008, 10, 10]} />
          <meshStandardMaterial color={'#c88'} opacity={0.4} transparent />
        </mesh>
        <mesh position={[0.02, -0.01, -0.01]}>
          <sphereGeometry args={[0.008, 10, 10]} />
          <meshStandardMaterial color={'#c88'} opacity={0.4} transparent />
        </mesh>
      </group>

      {/* More luscious lips */}
      <mesh ref={mouth} position={[0, -0.1, 0.555]} rotation={[0,0,Math.PI]}> 
        <torusGeometry args={[0.12, 0.022, 8, 64, Math.PI*0.85]} />
        <meshPhysicalMaterial {...lip} />
      </mesh>
      <mesh position={[0, -0.13, 0.54]} rotation={[0,0,0]}> 
        <torusGeometry args={[0.1, 0.016, 8, 64, Math.PI*0.8]} />
        <meshPhysicalMaterial {...lip} />
      </mesh>

      {/* Eye highlights - more dynamic */}
      <group>
        <mesh position={[-0.16, 0.19, 0.54]}> 
          <circleGeometry args={[0.01, 12]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.16, 0.19, 0.54]}> 
          <circleGeometry args={[0.01, 12]} />
          <meshBasicMaterial color="#fff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Delicate ears */}
      <mesh position={[-0.58, 0.16, 0.0]} rotation={[0,0,0.1]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshPhysicalMaterial {...skin} />
      </mesh>
      <mesh position={[0.58, 0.16, 0.0]} rotation={[0,0,-0.1]}>
        <sphereGeometry args={[0.08, 24, 24]} />
        <meshPhysicalMaterial {...skin} />
      </mesh>

      {/* Elegant long hair */}
      <group position={[-0.35, 0.2, -0.1]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.05, 0.6, 12]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
      </group>
      <group position={[0.35, 0.2, -0.1]}>
        <mesh>
          <cylinderGeometry args={[0.04, 0.05, 0.6, 12]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
        <mesh position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
      </group>

      {/* Subtle makeup - eyeliner */}
      <mesh position={[-0.19, 0.215, 0.49]} rotation={[0,0,0.1]}>
        <torusGeometry args={[0.095, 0.003, 8, 48, Math.PI*0.7]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.19, 0.215, 0.49]} rotation={[0,0,-0.1]}>
        <torusGeometry args={[0.095, 0.003, 8, 48, Math.PI*0.7]} />
        <meshStandardMaterial color="#222" />
      </mesh>
    </group>
  );
}

export default function Avatar3D({ speaking, mood = 'smile', appearance }) {
  return (
    <Canvas 
      shadows 
      camera={{ position: [0, 0, 2.2], fov: 35 }} 
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#f0f0f0']} />
      <ambientLight intensity={0.75} color="#fff5e6" />
      <directionalLight 
        position={[2, 2, 2]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        color={0xfff0e0} 
      />
      <directionalLight position={[-2, 1.5, -1.5]} intensity={0.5} color={0xaad0ff} />
      <directionalLight position={[0, -1, 1]} intensity={0.3} color={0xffe0f0} />
  

      
      {/* Soft environment light */}
      <hemisphereLight 
        color="#ffffff" 
        groundColor="#b4b4b4" 
        intensity={0.5} 
      />
      
      <group position={[0, -0.2, 0]}>
        <Head speaking={speaking} mood={mood} appearance={appearance} />
      </group>
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        maxPolarAngle={Math.PI/2.3} 
        minPolarAngle={Math.PI/3.5} 
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}

// Optional: Shinchan-style avatar as a named export
function ShinchanHead({ speaking, mood }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const brows = useRef({ left: null, right: null });
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  const skinColor = '#ffdbac';
  const hairColor = '#3a2718';
  const shirtColor = '#ff0000';
  const shortsColor = '#ffff00';

  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.4;
    targetRot.current.y = mouse.x * 0.35;
    targetRot.current.x = -mouse.y * 0.2;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    const eyeOffsetY = mood === 'sad' ? -0.02 : mood === 'laugh' ? 0.03 : 0;
    [leftEye.current, rightEye.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = 0.1 + eyeOffsetY;
      e.position.x = (i === 0 ? -0.15 : 0.15);
      e.position.z = 0.45;
    });
    [leftIris.current, rightIris.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = (0.1 + eyeOffsetY) + mouse.y * -0.01;
      e.position.x = (i === 0 ? -0.15 : 0.15) + mouse.x * 0.01;
      e.position.z = 0.48;
    });

    blink.current.t -= dt;
    if (blink.current.t <= 0) {
      blink.current.t = 3 + Math.random() * 5;
      blink.current.closing = true;
    }
    const sclY = leftEye.current.scale.y;
    const speed = 15;
    const target = blink.current.closing ? 0.05 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.1) blink.current.closing = false;

    const leftB = brows.current.left; const rightB = brows.current.right;
    if (leftB && rightB) {
      const tMood = mood === 'sad' ? 0.15 : mood === 'laugh' ? -0.15 : 0;
      leftB.rotation.z = 0.15 + tMood; rightB.rotation.z = -0.15 - tMood;
      leftB.position.y = 0.25 + (mood === 'laugh' ? 0.03 : 0);
      rightB.position.y = 0.25 + (mood === 'laugh' ? 0.03 : 0);
    }

    const base = 0.2;
    const amp = speaking ? 0.25 : 0.05;
    const freq = speaking ? 8 : 2;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'laugh' ? 0.3 : mood === 'sad' ? -0.15 : 0);
  });

  const skin = useMemo(() => ({ color: skinColor, roughness: 0.8, flatShading: true }), []);
  const eyeWhite = useMemo(() => ({ color: '#ffffff', flatShading: true }), []);
  const irisMat = useMemo(() => ({ color: '#000000', flatShading: true }), []);
  const mouthMat = useMemo(() => ({ color: '#ff6b6b', flatShading: true }), []);
  const browMat = useMemo(() => ({ color: hairColor, flatShading: true }), []);
  const hairMat = useMemo(() => ({ color: hairColor, flatShading: true }), []);
  const shirtMat = useMemo(() => ({ color: shirtColor, flatShading: true }), []);
  const shortsMat = useMemo(() => ({ color: shortsColor, flatShading: true }), []);

  return (
    <group ref={head}>
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <group position={[0, 0.45, -0.1]}>
        <mesh>
          <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
        {[
          { pos: [-0.15, 0.1, 0.35], rot: [0.3, -0.2, 0], scale: [0.8, 1.2, 0.8] },
          { pos: [0.15, 0.1, 0.35], rot: [0.3, 0.2, 0], scale: [0.8, 1.2, 0.8] },
          { pos: [-0.25, 0, 0.3], rot: [0.1, -0.4, 0], scale: [0.7, 1, 0.7] },
          { pos: [0.25, 0, 0.3], rot: [0.1, 0.4, 0], scale: [0.7, 1, 0.7] },
          { pos: [0, 0.15, 0.4], rot: [0.5, 0, 0], scale: [0.6, 1.5, 0.6] }
        ].map((spike, i) => (
          <mesh key={i} position={spike.pos} rotation={spike.rot} scale={spike.scale}>
            <coneGeometry args={[0.1, 0.2, 4]} />
            <meshStandardMaterial {...hairMat} />
          </mesh>
        ))}
      </group>
      <mesh ref={leftEye}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial {...eyeWhite} />
      </mesh>
      <mesh ref={rightEye}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial {...eyeWhite} />
      </mesh>
      <mesh ref={leftIris}>
        <circleGeometry args={[0.04, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>
      <mesh ref={rightIris}>
        <circleGeometry args={[0.04, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>
      <mesh ref={(n)=> (brows.current.left = n)} position={[-0.15, 0.25, 0.45]} rotation={[0,0,0.15]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshStandardMaterial {...browMat} />
      </mesh>
      <mesh ref={(n)=> (brows.current.right = n)} position={[0.15, 0.25, 0.45]} rotation={[0,0,-0.15]}>
        <boxGeometry args={[0.12, 0.03, 0.03]} />
        <meshStandardMaterial {...browMat} />
      </mesh>
      <mesh position={[0, 0.05, 0.5]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial {...skin} />
      </mesh>
      <mesh ref={mouth} position={[0, -0.1, 0.48]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>
      <mesh position={[-0.2, -0.02, 0.42]}>
        <circleGeometry args={[0.06, 12]} />
        <meshStandardMaterial color="#ffb3c6" transparent opacity={0.3} />
      </mesh>
      <mesh position={[0.2, -0.02, 0.42]}>
        <circleGeometry args={[0.06, 12]} />
        <meshStandardMaterial color="#ffb3c6" transparent opacity={0.3} />
      </mesh>
      <group position={[0, -0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.5, 16]} />
          <meshStandardMaterial {...shirtMat} />
        </mesh>
        <mesh position={[-0.45, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial {...shirtMat} />
        </mesh>
        <mesh position={[0.45, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial {...shirtMat} />
        </mesh>
      </group>
      <group position={[0, -0.7, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.5, 0.3, 16]} />
          <meshStandardMaterial {...shortsMat} />
        </mesh>
        <mesh position={[-0.15, -0.2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.15, -0.2, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 16]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      </group>
      <group position={[0, -0.5, 0]}>
        <mesh position={[-0.6, 0.1, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.6, 0.1, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.08, 0.08, 0.5, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      </group>
      <group position={[0, -0.9, 0]}>
        <mesh position={[-0.15, -0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
        <mesh position={[0.15, -0.3, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.6, 12]} />
          <meshStandardMaterial {...skin} />
        </mesh>
      </group>
    </group>
  );
}

export function Shinchan3D({ speaking, mood = 'normal', appearance }) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 3], fov: 45 }} 
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#87CEEB']} />
      <ambientLight intensity={0.8} />
      <directionalLight 
        position={[3, 2, 5]} 
        intensity={1} 
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <group position={[0, 0.2, 0]}>
        <ShinchanHead speaking={speaking} mood={mood} />
      </group>
      {/* Simple ground plane */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -1.5, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      <OrbitControls 
        enableZoom={true}
        enablePan={true}
        maxPolarAngle={Math.PI/2}
        minPolarAngle={Math.PI/4}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
