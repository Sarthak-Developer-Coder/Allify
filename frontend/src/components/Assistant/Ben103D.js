import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

function Ben10Head({ speaking, mood }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const brows = useRef({ left: null, right: null });
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });
  const omnitrix = useRef();

  // Ben 10's signature colors
  const skinColor = '#FFD699'; // Light skin tone
  const shirtColor = '#FFFFFF'; // White shirt
  const pantsColor = '#006600'; // Dark green pants
  const omnitrixColor = '#00FF00'; // Glowing green Omnitrix

  // Facial animations
  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.4;
    targetRot.current.y = mouse.x * 0.35;
    targetRot.current.x = -mouse.y * 0.2;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    // Eye tracking
    const eyeOffsetY = mood === 'angry' ? -0.02 : mood === 'excited' ? 0.03 : 0;
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

    // Blinking (cartoon-style fast blinks)
    blink.current.t -= dt;
    if (blink.current.t <= 0) {
      blink.current.t = 3 + Math.random() * 3;
      blink.current.closing = true;
    }
    const sclY = leftEye.current.scale.y;
    const speed = 20; // Fast blinks
    const target = blink.current.closing ? 0.05 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.1) blink.current.closing = false;

    // Eyebrow movements (excited/angry expressions)
    const leftB = brows.current.left; const rightB = brows.current.right;
    if (leftB && rightB) {
      const tMood = mood === 'angry' ? 0.15 : mood === 'excited' ? -0.1 : 0;
      leftB.rotation.z = 0.1 + tMood; rightB.rotation.z = -0.1 - tMood;
      leftB.position.y = 0.22 + (mood === 'excited' ? 0.02 : 0);
      rightB.position.y = 0.22 + (mood === 'excited' ? 0.02 : 0);
    }

    // Mouth movement (speaking / excited)
    const base = 0.12;
    const amp = speaking ? 0.2 : 0.05;
    const freq = speaking ? 8 : 2;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'excited' ? 0.3 : mood === 'angry' ? -0.1 : 0);

    // Omnitrix glow effect
    if (omnitrix.current) {
      omnitrix.current.material.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.3;
    }
  });

  // Materials (cartoon-style flat shading)
  const skinMat = useMemo(() => ({ 
    color: skinColor, 
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

  const shirtMat = useMemo(() => ({ 
    color: shirtColor,
    flatShading: true
  }), []);

  const pantsMat = useMemo(() => ({ 
    color: pantsColor,
    flatShading: true
  }), []);

  const omnitrixMat = useMemo(() => ({ 
    color: omnitrixColor,
    emissive: omnitrixColor,
    emissiveIntensity: 0.5,
    flatShading: true
  }), []);

  // Ben's spiky hair
  const hairSpikes = useMemo(() => [
    { pos: [0, 0.35, 0.1], rot: [0, 0, 0], scale: [0.8, 1.2, 0.8] }, // Front center
    { pos: [-0.2, 0.35, 0], rot: [0, 0.3, -0.2], scale: [0.7, 1, 0.7] }, // Left
    { pos: [0.2, 0.35, 0], rot: [0, -0.3, 0.2], scale: [0.7, 1, 0.7] }, // Right
  ], []);

  return (
    <group ref={head}>
      {/* Ben's head */}
      <mesh castShadow receiveShadow position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Spiky hair */}
      {hairSpikes.map((spike, i) => (
        <mesh
          key={i}
          position={spike.pos}
          rotation={spike.rot}
          scale={spike.scale}
        >
          <coneGeometry args={[0.1, 0.2, 4]} />
          <meshStandardMaterial color="#000000" flatShading />
        </mesh>
      ))}

      {/* Eyes */}
      <mesh ref={leftEye}>
        <circleGeometry args={[0.07, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>
      <mesh ref={rightEye}>
        <circleGeometry args={[0.07, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>

      {/* Irises */}
      <mesh ref={leftIris}>
        <circleGeometry args={[0.035, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>
      <mesh ref={rightIris}>
        <circleGeometry args={[0.035, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>

      {/* Eyebrows */}
      <mesh ref={(n)=> (brows.current.left = n)} position={[-0.13, 0.22, 0.45]} rotation={[0,0,0.1]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh ref={(n)=> (brows.current.right = n)} position={[0.13, 0.22, 0.45]} rotation={[0,0,-0.1]}>
        <boxGeometry args={[0.1, 0.02, 0.02]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.05, 0.48]}>
        <sphereGeometry args={[0.03, 12, 12]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouth} position={[0, -0.1, 0.45]}>
        <circleGeometry args={[0.09, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>

      {/* White T-shirt */}
      <group position={[0, -0.4, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.5, 0.6, 16]} />
          <meshStandardMaterial {...shirtMat} />
        </mesh>
      </group>

      {/* Green pants */}
      <group position={[0, -0.8, 0]}>
        <mesh>
          <cylinderGeometry args={[0.35, 0.45, 0.5, 16]} />
          <meshStandardMaterial {...pantsMat} />
        </mesh>
      </group>

      {/* Omnitrix (left wrist) */}
      <group position={[-0.45, -0.3, 0]} rotation={[0, 0, 0.3]}>
        <mesh ref={omnitrix}>
          <torusGeometry args={[0.08, 0.02, 16, 32]} />
          <meshStandardMaterial {...omnitrixMat} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.1, 0.05, 0.05]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
      </group>
    </group>
  );
}

export default function Ben103D({ speaking, mood = 'neutral' }) {
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
        <Ben10Head speaking={speaking} mood={mood} />
      </group>
      
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
