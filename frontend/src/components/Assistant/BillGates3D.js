import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function BillGatesHead({ speaking, mood }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const glasses = useRef();
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  // Signature appearance
  const skinColor = '#F5D0B8';
  const hairColor = '#A0522D';
  const sweaterColor = '#4682B4';
  const shirtColor = '#FFFFFF';

  useFrame((state, dt) => {
    const { mouse } = state;
    const k = 0.3;
    targetRot.current.y = mouse.x * 0.25;
    targetRot.current.x = -mouse.y * 0.15;
    head.current.rotation.y += (targetRot.current.y - head.current.rotation.y) * k * dt * 10;
    head.current.rotation.x += (targetRot.current.x - head.current.rotation.x) * k * dt * 10;

    const eyeOffsetY = mood === 'serious' ? -0.01 : mood === 'smiling' ? 0.02 : 0;
    [leftEye.current, rightEye.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = 0.1 + eyeOffsetY;
      e.position.x = (i === 0 ? -0.18 : 0.18);
      e.position.z = 0.45;
    });
    [leftIris.current, rightIris.current].forEach((e, i) => {
      if (!e) return;
      e.position.y = (0.1 + eyeOffsetY) + mouse.y * -0.008;
      e.position.x = (i === 0 ? -0.18 : 0.18) + mouse.x * 0.008;
      e.position.z = 0.48;
    });

    blink.current.t -= dt;
    if (blink.current.t <= 0) {
      blink.current.t = 4 + Math.random() * 3;
      blink.current.closing = true;
    }
    const sclY = leftEye.current.scale.y;
    const speed = 12;
    const target = blink.current.closing ? 0.05 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.1) blink.current.closing = false;

    const base = 0.1;
    const amp = speaking ? 0.15 : 0.03;
    const freq = speaking ? 6 : 1.5;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'smiling' ? 0.2 : mood === 'serious' ? -0.05 : 0);
  });

  const skinMat = useMemo(() => ({ color: skinColor, roughness: 0.6, metalness: 0.1 }), []);
  const eyeWhiteMat = useMemo(() => ({ color: '#FFFFFF', roughness: 0.3 }), []);
  const irisMat = useMemo(() => ({ color: '#3A3A3A', roughness: 0.2 }), []);
  const mouthMat = useMemo(() => ({ color: '#8B4513', roughness: 0.5 }), []);
  const hairMat = useMemo(() => ({ color: hairColor, roughness: 0.7 }), []);
  const glassesMat = useMemo(() => ({ color: '#333333', transparent: true, opacity: 0.8, metalness: 0.3 }), []);
  const sweaterMat = useMemo(() => ({ color: sweaterColor, roughness: 0.5 }), []);
  const shirtMat = useMemo(() => ({ color: shirtColor, roughness: 0.4 }), []);

  // Hair geometry (simple strip)
  const hairGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0.3);
    shape.lineTo(0.4, 0.3);
    shape.lineTo(0.3, 0.5);
    shape.lineTo(-0.3, 0.5);
    shape.lineTo(-0.4, 0.3);
    return new THREE.ShapeGeometry(shape);
  }, []);

  return (
    <group ref={head}>
      {/* Head */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 0.4, 0.1]}>
        <primitive object={hairGeometry} attach="geometry" />
        <meshStandardMaterial {...hairMat} />
      </mesh>

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

      {/* Glasses */}
      <group ref={glasses} position={[0, 0.1, 0.46]}>
        <mesh>
          <torusGeometry args={[0.1, 0.01, 16, 32]} />
          <meshStandardMaterial {...glassesMat} />
        </mesh>
        <mesh position={[0.2, 0, 0]}>
          <torusGeometry args={[0.1, 0.01, 16, 32]} />
          <meshStandardMaterial {...glassesMat} />
        </mesh>
        <mesh position={[0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.02, 0.01]} />
          <meshStandardMaterial {...glassesMat} />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouth} position={[0, -0.15, 0.48]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.3, 16]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Shirt collar */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.1, 16]} />
        <meshStandardMaterial {...shirtMat} />
      </mesh>

      {/* Sweater vest */}
      <group position={[0, -0.6, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.6, 16]} />
          <meshStandardMaterial {...sweaterMat} />
        </mesh>
      </group>
    </group>
  );
}

export default function BillGates3D({ speaking, mood = 'neutral' }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={['#F5F5F5']} />
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[3, 2, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <group position={[0, 0.2, 0]}>
        <BillGatesHead speaking={speaking} mood={mood} />
      </group>

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
