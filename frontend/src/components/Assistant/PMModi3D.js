import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function PMModiHead({ speaking, mood }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const brows = useRef({ left: null, right: null });
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  // Signature colors
  const skinColor = '#D2B48C';
  const kurtaColor = '#FFFFFF';
  const jacketColor = '#4169E1';
  const beardColor = '#808080';

  // Facial animations
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
    const speed = 10;
    const target = blink.current.closing ? 0.05 : 1;
    const newS = sclY + (target - sclY) * Math.min(1, speed * dt);
    leftEye.current.scale.y = newS; rightEye.current.scale.y = newS;
    leftIris.current.scale.y = newS; rightIris.current.scale.y = newS;
    if (blink.current.closing && newS < 0.1) blink.current.closing = false;

    const leftB = brows.current.left; const rightB = brows.current.right;
    if (leftB && rightB) {
      const tMood = mood === 'serious' ? 0.1 : mood === 'smiling' ? -0.1 : 0;
      leftB.rotation.z = 0.1 + tMood; rightB.rotation.z = -0.1 - tMood;
      leftB.position.y = 0.25 + (mood === 'smiling' ? 0.01 : 0);
      rightB.position.y = 0.25 + (mood === 'smiling' ? 0.01 : 0);
    }

    const base = 0.1;
    const amp = speaking ? 0.15 : 0.03;
    const freq = speaking ? 6 : 1.5;
    const t = state.clock.getElapsedTime();
    mouth.current.scale.y = base + Math.abs(Math.sin(t * freq)) * amp;
    mouth.current.scale.x = 0.8 + (mood === 'smiling' ? 0.2 : mood === 'serious' ? -0.05 : 0);
  });

  // Materials
  const skinMat = useMemo(() => ({ color: skinColor, roughness: 0.6, metalness: 0.1 }), []);
  const eyeWhiteMat = useMemo(() => ({ color: '#FFFFFF', roughness: 0.3 }), []);
  const irisMat = useMemo(() => ({ color: '#3A3A3A', roughness: 0.2 }), []);
  const mouthMat = useMemo(() => ({ color: '#8B4513', roughness: 0.5 }), []);
  const beardMat = useMemo(() => ({ color: beardColor, roughness: 0.7 }), []);
  const kurtaMat = useMemo(() => ({ color: kurtaColor, roughness: 0.5 }), []);
  const jacketMat = useMemo(() => ({ color: jacketColor, roughness: 0.4 }), []);

  // Beard curve (simple polygonal strip)
  const beardGeometry = useMemo(() => {
    const geom = new THREE.BufferGeometry();
    const points = [
      new THREE.Vector3(-0.2, -0.1, 0.45),
      new THREE.Vector3(0, -0.15, 0.48),
      new THREE.Vector3(0.2, -0.1, 0.45),
      new THREE.Vector3(0.15, 0, 0.47),
      new THREE.Vector3(-0.15, 0, 0.47),
    ];
    geom.setFromPoints(points);
    return geom;
  }, []);

  return (
    <group ref={head}>
      {/* Head */}
      <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Eyes */}
      <mesh ref={leftEye}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>
      <mesh ref={rightEye}>
        <circleGeometry args={[0.08, 16]} />
        <meshStandardMaterial {...eyeWhiteMat} />
      </mesh>

      {/* Irises */}
      <mesh ref={leftIris}>
        <circleGeometry args={[0.04, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>
      <mesh ref={rightIris}>
        <circleGeometry args={[0.04, 12]} />
        <meshStandardMaterial {...irisMat} />
      </mesh>

      {/* Eyebrows */}
      <mesh ref={(n)=> (brows.current.left = n)} position={[-0.15, 0.25, 0.45]} rotation={[0,0,0.1]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      <mesh ref={(n)=> (brows.current.right = n)} position={[0.15, 0.25, 0.45]} rotation={[0,0,-0.1]}>
        <boxGeometry args={[0.12, 0.02, 0.02]} />
        <meshStandardMaterial color="#333333" />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 0.05, 0.5]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouth} position={[0, -0.1, 0.48]}>
        <circleGeometry args={[0.1, 12]} />
        <meshStandardMaterial {...mouthMat} />
      </mesh>

      {/* Beard (simple strip) */}
      <mesh position={[0, -0.05, 0.46]}>
        <primitive object={beardGeometry} attach="geometry" />
        <meshStandardMaterial {...beardMat} side={THREE.DoubleSide} />
      </mesh>

      {/* Mustache */}
      <mesh position={[0, 0, 0.48]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.25, 0.03, 0.02]} />
        <meshStandardMaterial {...beardMat} />
      </mesh>

      {/* White Kurta */}
      <group position={[0, -0.5, 0]}>
        <mesh>
          <cylinderGeometry args={[0.5, 0.6, 0.8, 16]} />
          <meshStandardMaterial {...kurtaMat} />
        </mesh>
      </group>

      {/* Blue Jacket */}
      <group position={[0, -0.3, 0]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.65, 0.5, 16]} />
          <meshStandardMaterial {...jacketMat} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.3, 16]} />
        <meshStandardMaterial {...skinMat} />
      </mesh>
    </group>
  );
}

export default function PMModi3D({ speaking, mood = 'neutral' }) {
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
        <PMModiHead speaking={speaking} mood={mood} />
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
