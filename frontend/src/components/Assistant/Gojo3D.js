import React, { useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';

function GojoHead({ speaking, mood, showBlindfold }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const blindfold = useRef();
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  const hairColor = '#FFFFFF';
  const blindfoldColor = '#000000';
  const eyeColor = '#7EC8E3';
  const uniformColor = '#2C3E50';

  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.4;
    targetRot.current.y = mouse.x * 0.35;
    targetRot.current.x = -mouse.y * 0.2;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    if (!showBlindfold) {
      const eyeOffsetY = mood === 'serious' ? -0.01 : mood === 'smirking' ? 0.02 : 0;
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

      blink.current.t -= dt;
      if (blink.current.t <= 0) {
        blink.current.t = 4 + Math.random() * 3;
        blink.current.closing = true;
      }
      const sclY = leftEye.current.scale.y;
      const speed = 15;
      const target = blink.current.closing ? 0.05 : 1;
      const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
      leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
      leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
      if (blink.current.closing && newS < 0.1) blink.current.closing = false;
    }

    const base = 0.1;
    const amp = speaking ? 0.15 : 0.03;
    const freq = speaking ? 6 : 1.5;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'smirking' ? 0.3 : mood === 'serious' ? -0.1 : 0);
  });

  const skinMat = useMemo(() => ({ color: '#FFE4C4', roughness: 0.6, metalness: 0.1 }), []);
  const eyeWhiteMat = useMemo(() => ({ color: '#FFFFFF', roughness: 0.3 }), []);
  const irisMat = useMemo(() => ({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 0.5, roughness: 0.2 }), []);
  const mouthMat = useMemo(() => ({ color: '#FF6B6B', roughness: 0.5 }), []);
  const hairMat = useMemo(() => ({ color: hairColor, roughness: 0.7 }), []);
  const blindfoldMat = useMemo(() => ({ color: blindfoldColor, roughness: 0.8 }), []);
  const uniformMat = useMemo(() => ({ color: uniformColor, roughness: 0.5 }), []);

  const hairSpikes = useMemo(() => [
    { pos: [0, 0.5, 0.1], rot: [0, 0, 0], scale: [1, 1.5, 1] },
    { pos: [-0.3, 0.45, 0], rot: [0, 0.5, -0.3], scale: [0.8, 1.2, 0.8] },
    { pos: [0.3, 0.45, 0], rot: [0, -0.5, 0.3], scale: [0.8, 1.2, 0.8] },
    { pos: [-0.2, 0.4, -0.2], rot: [0.2, 0.3, -0.2], scale: [0.7, 1, 0.7] },
    { pos: [0.2, 0.4, -0.2], rot: [0.2, -0.3, 0.2], scale: [0.7, 1, 0.7] },
  ], []);

  return (
    <group ref={head}>
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {hairSpikes.map((spike, i) => (
        <mesh key={i} position={spike.pos} rotation={spike.rot} scale={spike.scale}>
          <coneGeometry args={[0.15, 0.3, 4]} />
          <meshStandardMaterial {...hairMat} />
        </mesh>
      ))}

      {!showBlindfold && (
        <>
          <mesh ref={leftEye}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial {...eyeWhiteMat} />
          </mesh>
          <mesh ref={rightEye}>
            <circleGeometry args={[0.1, 16]} />
            <meshStandardMaterial {...eyeWhiteMat} />
          </mesh>
          <mesh ref={leftIris}>
            <circleGeometry args={[0.06, 12]} />
            <meshStandardMaterial {...irisMat} />
          </mesh>
          <mesh ref={rightIris}>
            <circleGeometry args={[0.06, 12]} />
            <meshStandardMaterial {...irisMat} />
          </mesh>
        </>
      )}

      {showBlindfold && (
        <mesh ref={blindfold} position={[0, 0.15, 0.45]}>
          <boxGeometry args={[0.6, 0.1, 0.05]} />
          <meshStandardMaterial {...blindfoldMat} />
        </mesh>
      )}

      <mesh ref={mouth} position={[0, -0.1, 0.48]}>
        <circleGeometry args={[0.12, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>

      <group position={[0, -0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.8, 16]} />
          <meshStandardMaterial {...uniformMat} />
        </mesh>
      </group>
    </group>
  );
}

export default function Gojo3D({ speaking, mood = 'smirking', showBlindfold = true }) {
  const [blindfoldOn, setBlindfoldOn] = useState(showBlindfold);

  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#F0F8FF']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 2, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <group position={[0, 0.2, 0]}>
        <GojoHead speaking={speaking} mood={mood} showBlindfold={blindfoldOn} />
      </group>

      <Html position={[0, -2, 0]}>
        <button
          onClick={() => setBlindfoldOn(!blindfoldOn)}
          style={{
            padding: '8px 16px',
            background: '#2C3E50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          {blindfoldOn ? 'Remove Blindfold' : 'Wear Blindfold'}
        </button>
      </Html>

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        maxPolarAngle={Math.PI / 2}
        minPolarAngle={Math.PI / 4}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
