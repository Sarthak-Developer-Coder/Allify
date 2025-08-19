import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function GokuHead({ speaking, mood, isSSJ }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const brows = useRef({ left: null, right: null });
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  // Goku's colors (changes if Super Saiyan)
  const hairColor = isSSJ ? '#FFD700' : '#000000'; // Gold if Super Saiyan
  const giTopColor = '#FF6600'; // Orange gi
  const giPantsColor = '#0066CC'; // Blue pants
  const wristbandsColor = '#0066CC'; // Blue wristbands
  const bootsColor = '#990000'; // Red boots
  const beltColor = '#660000'; // Dark red belt

  // Goku's facial animations
  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.4;
    targetRot.current.y = mouse.x * 0.35;
    targetRot.current.x = -mouse.y * 0.2;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    // Eye tracking
    const eyeOffsetY = mood === 'angry' ? -0.02 : mood === 'happy' ? 0.03 : 0;
    [leftEye.current, rightEye.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = 0.12 + eyeOffsetY;
      e.position.x = (i === 0 ? -0.18 : 0.18);
      e.position.z = 0.45;
    });
    [leftIris.current, rightIris.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = (0.12 + eyeOffsetY) + mouse.y * -0.01;
      e.position.x = (i === 0 ? -0.18 : 0.18) + mouse.x * 0.01;
      e.position.z = 0.48;
    });

    // Blinking
    blink.current.t -= dt;
    if (blink.current.t <= 0) {
      blink.current.t = 3 + Math.random() * 4;
      blink.current.closing = true;
    }
    const sclY = leftEye.current.scale.y;
    const speed = 15;
    const target = blink.current.closing ? 0.05 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.1) blink.current.closing = false;

    // Eyebrow movements (angry/happy expressions)
    const leftB = brows.current.left; const rightB = brows.current.right;
    if (leftB && rightB) {
      const tMood = mood === 'angry' ? 0.2 : mood === 'happy' ? -0.15 : 0;
      leftB.rotation.z = 0.15 + tMood; rightB.rotation.z = -0.15 - tMood;
      leftB.position.y = 0.28 + (mood === 'happy' ? 0.02 : 0);
      rightB.position.y = 0.28 + (mood === 'happy' ? 0.02 : 0);
    }

    // Mouth movement (speaking / smiling)
    const base = 0.15;
    const amp = speaking ? 0.2 : 0.05;
    const freq = speaking ? 8 : 2;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'happy' ? 0.3 : mood === 'angry' ? -0.1 : 0);
  });

  // Materials (flat shading for anime style)
  const skinMat = useMemo(() => ({ 
    color: '#FFD8A8', 
    roughness: 0.8,
    flatShading: true
  }), []);

  const eyeWhiteMat = useMemo(() => ({ 
    color: '#FFFFFF',
    flatShading: true
  }), []);

  const irisMat = useMemo(() => ({ 
    color: '#000000',
    flatShading: true
  }), []);

  const mouthMat = useMemo(() => ({ 
    color: '#FF6B6B',
    flatShading: true
  }), []);

  const hairMat = useMemo(() => ({ 
    color: hairColor,
    roughness: 0.8,
    flatShading: true
  }), [hairColor]);

  const giTopMat = useMemo(() => ({ 
    color: giTopColor,
    flatShading: true
  }), []);

  const giPantsMat = useMemo(() => ({ 
    color: giPantsColor,
    flatShading: true
  }), []);

  const wristbandsMat = useMemo(() => ({ 
    color: wristbandsColor,
    flatShading: true
  }), []);

  const bootsMat = useMemo(() => ({ 
    color: bootsColor,
    flatShading: true
  }), []);

  const beltMat = useMemo(() => ({ 
    color: beltColor,
    flatShading: true
  }), []);

  // Goku's spiky hair (Dragon Ball Super style)
  const hairSpikes = useMemo(() => [
    { pos: [0, 0.65, 0.1], rot: [0, 0, 0], scale: [1, 1.5, 1] }, // Main front spike
    { pos: [-0.3, 0.6, 0], rot: [0, 0.5, -0.3], scale: [0.8, 1.2, 0.8] }, // Left side
    { pos: [0.3, 0.6, 0], rot: [0, -0.5, 0.3], scale: [0.8, 1.2, 0.8] }, // Right side
    { pos: [-0.2, 0.5, -0.2], rot: [0.2, 0.3, -0.2], scale: [0.7, 1, 0.7] }, // Back left
    { pos: [0.2, 0.5, -0.2], rot: [0.2, -0.3, 0.2], scale: [0.7, 1, 0.7] }, // Back right
    { pos: [0, 0.7, -0.1], rot: [0.3, 0, 0], scale: [0.6, 1.5, 0.6] }, // Top back
  ], []);

  return (
    <group ref={head}>
      {/* Goku's head */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Goku's spiky hair */}
      {hairSpikes.map((spike, i) => (
        <mesh
          key={i}
          position={spike.pos}
          rotation={spike.rot}
          scale={spike.scale}
        >
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
      ))}

      {/* Eyes */}
      <mesh ref={leftEye}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>
      <mesh ref={rightEye}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>

      {/* Irises */}
      <mesh ref={leftIris}>
        <circleGeometry args={[0.05, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>
      <mesh ref={rightIris}>
        <circleGeometry args={[0.05, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>

      {/* Eyebrows */}
      <mesh ref={(n)=> (brows.current.left = n)} position={[-0.18, 0.28, 0.45]} rotation={[0,0,0.15]}>
        <boxGeometry args={[0.15, 0.03, 0.03]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>
      <mesh ref={(n)=> (brows.current.right = n)} position={[0.18, 0.28, 0.45]} rotation={[0,0,-0.15]}>
        <boxGeometry args={[0.15, 0.03, 0.03]} />
        <meshStandardMaterial color={hairColor} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.1, 0.5]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouth} position={[0, -0.05, 0.48]}>
        <circleGeometry args={[0.12, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>

      {/* Goku's muscular neck */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.3, 16]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Orange Gi Top */}
      <group position={[0, -0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.6, 0.7, 0.6, 16]} />
          <meshStandardMaterial {...giTopMat} />
        </mesh>
        {/* Blue wristbands */}
        <mesh position={[-0.7, -0.2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.15, 16]} />
          <meshStandardMaterial {...wristbandsMat} />
        </mesh>
        <mesh position={[0.7, -0.2, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.15, 16]} />
          <meshStandardMaterial {...wristbandsMat} />
        </mesh>
      </group>

      {/* Blue Gi Pants */}
      <group position={[0, -0.9, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.4, 16]} />
          <meshStandardMaterial {...giPantsMat} />
        </mesh>
        {/* Red belt */}
        <mesh position={[0, -0.2, 0]}>
          <torusGeometry args={[0.55, 0.05, 16, 32]} />
          <meshStandardMaterial {...beltMat} />
        </mesh>
      </group>

      {/* Boots */}
      <group position={[0, -1.2, 0]}>
        <mesh position={[-0.2, -0.1, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
          <meshStandardMaterial {...bootsMat} />
        </mesh>
        <mesh position={[0.2, -0.1, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.4, 16]} />
          <meshStandardMaterial {...bootsMat} />
        </mesh>
      </group>
    </group>
  );
}

export default function Goku3D({ speaking, mood = 'normal', isSSJ = false }) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 4], fov: 45 }} 
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
      
      <group position={[0, 0.5, 0]}>
        <GokuHead speaking={speaking} mood={mood} isSSJ={isSSJ} />
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
