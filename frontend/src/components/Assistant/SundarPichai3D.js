import React, { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function SundarPichaiHead({ speaking = false, mood = 'neutral' }) {
  const head = useRef();
  const leftEye = useRef();
  const rightEye = useRef();
  const leftIris = useRef();
  const rightIris = useRef();
  const mouth = useRef();
  const blink = useRef({ t: 0, closing: false });
  const targetRot = useRef({ x: 0, y: 0 });

  // Materials (fallback, no external textures required)
  const skinMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#D2B48C',
    roughness: 0.7,
    metalness: 0.1,
  }), []);

  const facialHairMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#333333',
    roughness: 0.8,
    metalness: 0.05,
    transparent: true,
    opacity: 0.25,
  }), []);

  const eyeMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#FFFFFF',
    roughness: 0.2,
    metalness: 0.05,
  }), []);

  const irisMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#3A2718',
    roughness: 0.1,
    metalness: 0.3,
  }), []);

  const lipMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#C68C53',
    roughness: 0.6,
    metalness: 0.2,
  }), []);

  const glassesMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#222222',
    transmission: 0.6,
    roughness: 0.1,
    metalness: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
    ior: 1.5,
  }), []);

  // Micro-movements simulation
  useFrame((state, delta) => {
    const { mouse } = state;

    // Subtle head tracking
    targetRot.current.y = THREE.MathUtils.lerp(targetRot.current.y, mouse.x * 0.15, 0.1);
    targetRot.current.x = THREE.MathUtils.lerp(targetRot.current.x, -mouse.y * 0.1, 0.1);
    head.current.rotation.set(
      THREE.MathUtils.lerp(head.current.rotation.x, targetRot.current.x, 0.3),
      THREE.MathUtils.lerp(head.current.rotation.y, targetRot.current.y, 0.3),
      0
    );

    // Eye movements
    const lookIntensity = 0.015;
    [leftIris.current, rightIris.current].forEach((eye, idx) => {
      if (!eye) return;
      const baseX = idx === 0 ? -0.18 : 0.18;
      eye.position.x = baseX + mouse.x * lookIntensity;
      eye.position.y = 0.1 + mouse.y * lookIntensity * 0.7;
    });

    // Natural blinking pattern
    blink.current.t -= delta;
    if (blink.current.t <= 0) {
      blink.current.t = 2.5 + Math.random() * 3;
      blink.current.closing = true;
    }
    const blinkSpeed = 18;
    const targetY = blink.current.closing ? 0.02 : 1;
    const newY = THREE.MathUtils.lerp(leftEye.current.scale.y, targetY, delta * blinkSpeed);
    [leftEye.current, rightEye.current].forEach(eye => {
      if (eye) eye.scale.y = newY;
    });
    if (blink.current.closing && newY < 0.1) blink.current.closing = false;

    // Speech articulation
    const baseMouthScale = mood === 'smiling' ? 0.9 : 0.8;
    if (speaking) {
      const time = state.clock.getElapsedTime();
      mouth.current.scale.y = baseMouthScale + Math.sin(time * 8) * 0.15;
    } else {
      mouth.current.scale.y = baseMouthScale;
    }
  });

  // Hair geometry (simple extrude for silhouette)
  const hairGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0.35);
    shape.bezierCurveTo(-0.4, 0.4, -0.2, 0.45, 0, 0.45);
    shape.bezierCurveTo(0.2, 0.45, 0.4, 0.4, 0.4, 0.35);
    shape.lineTo(0.35, 0.5);
    shape.lineTo(-0.35, 0.5);
    return new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
  }, []);

  return (
    <group ref={head}>
      {/* Head base */}
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.5, 64, 64]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Facial hair (5 o'clock shadow) */}
      <mesh position={[0, 0, 0.01]}>
        <sphereGeometry args={[0.502, 64, 64]} />
        <primitive object={facialHairMat} attach="material" />
      </mesh>

      {/* Eyes */}
      <group position={[0, 0.1, 0.45]}>
        <mesh ref={leftEye} position={[-0.18, 0, 0]}>
          <sphereGeometry args={[0.07, 32, 32]} />
          <primitive object={eyeMat} attach="material" />
        </mesh>
        <mesh ref={rightEye} position={[0.18, 0, 0]}>
          <sphereGeometry args={[0.07, 32, 32]} />
          <primitive object={eyeMat} attach="material" />
        </mesh>

        {/* Irises */}
        <mesh ref={leftIris} position={[-0.18, 0, 0.07]}>
          <circleGeometry args={[0.035, 32]} />
          <primitive object={irisMat} attach="material" />
        </mesh>
        <mesh ref={rightIris} position={[0.18, 0, 0.07]}>
          <circleGeometry args={[0.035, 32]} />
          <primitive object={irisMat} attach="material" />
        </mesh>
      </group>

      {/* Glasses */}
      <group position={[0, 0.1, 0.48]}>
        <mesh rotation={[0, 0, 0.1]}>
          <torusGeometry args={[0.1, 0.008, 16, 32]} />
          <primitive object={glassesMat} attach="material" />
        </mesh>
        <mesh rotation={[0, 0, -0.1]} position={[0.2, 0, 0]}>
          <torusGeometry args={[0.1, 0.008, 16, 32]} />
          <primitive object={glassesMat} attach="material" />
        </mesh>
        <mesh position={[0.1, 0, 0]}>
          <boxGeometry args={[0.2, 0.008, 0.008]} />
          <primitive object={glassesMat} attach="material" />
        </mesh>
      </group>

      {/* Nose */}
      <mesh position={[0, 0, 0.5]}>
        <sphereGeometry args={[0.05, 32, 32]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Mouth */}
      <mesh ref={mouth} position={[0, -0.15, 0.48]}>
        <sphereGeometry args={[0.1, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        <primitive object={lipMat} attach="material" />
      </mesh>

      {/* Hair */}
      <mesh position={[0, 0.45, 0.05]} rotation={[0.1, 0, 0]}>
        <primitive object={hairGeometry} attach="geometry" />
        <meshStandardMaterial color="#2B1B0E" roughness={0.8} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.22, 0.25, 0.4, 32]} />
        <primitive object={skinMat} attach="material" />
      </mesh>

      {/* Turtleneck */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.25, 0.3, 0.2, 32]} />
        <meshStandardMaterial color="#1A1A1A" roughness={0.6} />
      </mesh>

      {/* Blazer */}
      <group position={[0, -0.7, 0]}>
        <mesh>
          <cylinderGeometry args={[0.55, 0.6, 0.6, 32]} />
          <meshStandardMaterial color="#2D2D2D" roughness={0.5} />
        </mesh>
        {/* Lapels */}
        <mesh position={[0, 0.3, 0.3]} rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.6, 0.02, 0.2]} />
          <meshStandardMaterial color="#1A1A1A" />
        </mesh>
      </group>
    </group>
  );
}

function RendererConfig() {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    // three@0.154+ uses colorSpace instead of outputEncoding
    if ('outputColorSpace' in gl) {
      gl.outputColorSpace = THREE.SRGBColorSpace;
    } else {
      // @ts-ignore legacy
      gl.outputEncoding = THREE.sRGBEncoding;
    }
  }, [gl]);
  return null;
}

export default function SundarPichai3D({ speaking = false, mood = 'neutral' }) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 0, 2.5], fov: 45 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <RendererConfig />

      {/* Studio lighting setup */}
      <ambientLight intensity={0.5} color="#FFFFFF" />
      <directionalLight
        position={[3, 2, 5]}
        intensity={2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <directionalLight position={[-3, 1, -2]} intensity={0.8} color="#AACCFF" />
      <directionalLight position={[0, -1, 1]} intensity={0.5} color="#FFEEDD" />

      {/* Environment */}
      <fog attach="fog" args={["#FFFFFF", 5, 15]} />

      {/* Avatar */}
      <group position={[0, -0.3, 0]}>
        <SundarPichaiHead speaking={speaking} mood={mood} />
      </group>

      {/* Professional backdrop */}
      <mesh position={[0, 0, -5]} rotation={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#F8F8F8" roughness={0.3} />
      </mesh>

      {/* Ground */}
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.2} />
      </mesh>

      <OrbitControls
        enableZoom
        enablePan
        maxPolarAngle={Math.PI * 0.6}
        minPolarAngle={Math.PI * 0.4}
        maxDistance={5}
        minDistance={1.5}
        enableDamping
        dampingFactor={0.05}
      />
    </Canvas>
  );
}
