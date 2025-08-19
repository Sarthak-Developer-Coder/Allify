import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, useGLTF, Center, Bounds, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, SSAO, Vignette } from "@react-three/postprocessing";

function tuneMaterials(root) {
  root.traverse((obj) => {
    const mat = obj.material;
    if (!mat) return;
    if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
      mat.envMapIntensity = 1.0;
      // Eyes / cornea
      if (/eye|cornea|pupil|iris/i.test(obj.name)) {
        if (mat.isMeshPhysicalMaterial) {
          mat.clearcoat = 1.0; mat.clearcoatRoughness = 0.05;
          mat.ior = 1.45; mat.specularIntensity = 0.8;
          mat.roughness = 0.1; mat.metalness = 0.0;
        }
      }
      // Skin
      if (/skin|face|head|body/i.test(obj.name)) {
        if (mat.isMeshPhysicalMaterial) {
          mat.sheen = 0.35; mat.sheenRoughness = 0.6;
          mat.metalness = 0.0; mat.roughness = 0.45;
          mat.ior = 1.4; mat.specularIntensity = 0.4;
          mat.transmission = 0.0; // approximation for SSS
          mat.thickness = 0.15;
        }
      }
      // Hair
      if (/hair/i.test(obj.name)) {
        if (mat.isMeshPhysicalMaterial) {
          mat.metalness = 0.0; mat.roughness = 0.35;
          mat.clearcoat = 0.6; mat.clearcoatRoughness = 0.2;
        }
      }
      mat.needsUpdate = true;
    }
  });
}

function Model({ url }) {
  const { scene } = useGLTF(url, true);
  useMemo(() => { if (scene) tuneMaterials(scene); }, [scene]);
  return (
    <Bounds fit clip observe margin={1.2}>
      <Center>
        <primitive object={scene} />
      </Center>
    </Bounds>
  );
}

export default function CinematicAvatar({ url, quality = "high" }) {
  const is3D = typeof url === "string" && /\.(glb|gltf|vrm)(\?|#|$)/i.test(url);
  if (!is3D) {
    return <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#eee'}}>Set a GLB/GLTF URL for cinematic render.</div>;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, quality === 'ultra' ? 2 : 1.5);
  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 1.5, 2.4], fov: 35 }}
      gl={{ antialias: true, physicallyCorrectLights: true }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.0;
      }}
      shadows
    >
      <Suspense fallback={null}>
        {/* Three-point cinematic lighting */}
        <ambientLight intensity={0.3} />
        <directionalLight castShadow intensity={1.2} position={[2.2, 3.0, 1.5]} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight intensity={0.5} position={[-2.5, 1.5, -2.0]} color={0x99aaff} />
        <directionalLight intensity={0.6} position={[0.0, 2.0, -1.5]} color={0xffc4a1} />

        <Environment preset="studio" />
        <Model url={url} />
        <ContactShadows opacity={0.35} blur={2.5} scale={10} far={4.5} />

        <EffectComposer>
          <SSAO samples={16} radius={0.15} intensity={20} luminanceInfluence={0.6} color="black" />
          <Bloom intensity={0.6} luminanceThreshold={0.8} luminanceSmoothing={0.2} mipmapBlur />
          <DepthOfField focusDistance={0.02} focalLength={0.045} bokehScale={1.8} height={480} />
          <Vignette eskil={false} offset={0.2} darkness={0.6} />
        </EffectComposer>
      </Suspense>
      <OrbitControls enablePan={false} minDistance={1.4} maxDistance={3.2} target={[0, 1.4, 0]} />
    </Canvas>
  );
}
