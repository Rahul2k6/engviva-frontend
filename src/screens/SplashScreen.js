import React, { Suspense, useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useAnimations, PointMaterial, Points, MeshReflectorMaterial, Environment, Loader, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';

// Import Assets
import animationGlb from '../assets/animation.glb';
import hdriMap from '../assets/hdri/broadcast-studio.hdr';

// ============================================
// NATIVE SVG ICONS (Replaces lucide-react)
// ============================================
const HeadsetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/>
  </svg>
);
const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// ============================================
// 1. VFX: REALISTIC STUDIO DUST
// ============================================
function BackdraftSmoke() {
  const pointsRef = useRef();
  const particleCount = 800;

  const [positions, velocities, phases] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const phs = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3] = (Math.random() - 0.5) * 25;
      pos[i3 + 1] = (Math.random() * 8) - 3;
      pos[i3 + 2] = (Math.random() * -15) - 2;

      vel[i3] = (Math.random() - 0.5) * 0.01;
      vel[i3 + 1] = Math.random() * 0.015 + 0.005;
      vel[i3 + 2] = (Math.random() - 0.5) * 0.008;

      phs[i] = Math.random() * Math.PI * 2;
    }
    return [pos, vel, phs];
  }, [particleCount]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const pos = pointsRef.current.geometry.attributes.position.array;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3] += velocities[i3] + Math.sin(state.clock.elapsedTime * 0.5 + phases[i]) * 0.003;
      pos[i3 + 1] += velocities[i3 + 1];
      pos[i3 + 2] += velocities[i3 + 2];

      if (pos[i3 + 1] > 12) {
        pos[i3] = (Math.random() - 0.5) * 25;
        pos[i3 + 1] = -3;
        pos[i3 + 2] = (Math.random() * -15) - 2;
      }
    }
    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial size={1.5} sizeAttenuation color="#c9b8ff" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

// ============================================
// 2. 3D MODEL
// ============================================
function EnlargedAvatar({ setIsLoaded }) {
  const groupRef = useRef();
  const { scene, animations } = useGLTF(animationGlb);
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    setIsLoaded(true);
    const animationNames = Object.keys(actions);

    if (animationNames.length > 0) {
      const action = actions[animationNames[0]];
      action.reset().play();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    }
  }, [actions, setIsLoaded]);

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <primitive ref={groupRef} object={scene} scale={[3.5, 3.5, 3.5]} position={[0, -3, 2]} />
  );
}

// ============================================
// 3. ENVIRONMENT & LIGHTING (lavender palette)
// ============================================
function StudioEnvironment({ isVRMode }) {
  return (
    <>
      <color attach="background" args={['#100a1c']} />

      {!isVRMode && <fog attach="fog" args={['#100a1c', 12, 45]} />}

      <Environment files={hdriMap} background={isVRMode} environmentIntensity={0.8} />

      <spotLight position={[14, 18, 12]} angle={0.35} penumbra={0.4} intensity={25} color="#d9c8ff" castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001} />
      <spotLight position={[-18, 12, -18]} angle={0.5} penumbra={0.8} intensity={45} color="#b8a4ff" castShadow />
      <directionalLight position={[-12, 6, 8]} intensity={1.5} color="#f0e9ff" />

      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[120, 120]} />
        <MeshReflectorMaterial
          blur={[400, 150]}
          resolution={1024}
          mixBlur={0.8}
          mixStrength={50}
          roughness={0.15}
          depthScale={1.5}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#140e22"
          metalness={0.6}
          mirror={0.4}
        />
      </mesh>
    </>
  );
}

// ============================================
// 4. CAMERA MANAGER
// ============================================
function CameraManager({ isVRMode }) {
  const { camera } = useThree();
  const cinematicTarget = useMemo(() => new THREE.Vector3(0, 1.8, 2), []);
  const vrTarget = useMemo(() => new THREE.Vector3(0, 1.5, 2), []);

  useEffect(() => {
    if (isVRMode) {
      camera.position.set(0, 2, 12);
    }
  }, [isVRMode, camera]);

  useFrame((state) => {
    if (!isVRMode) {
      const t = state.clock.elapsedTime;
      const progress = Math.min(t / 5, 1);
      const ease = 1 - Math.pow(1 - progress, 3);

      const startX = -12, startY = 10, startZ = 22;
      const endX = 0, endY = -1.2, endZ = 11;

      camera.position.x = startX + (endX - startX) * ease;
      camera.position.y = startY + (endY - startY) * ease;
      camera.position.z = startZ + (endZ - startZ) * ease;

      if (progress === 1) {
        camera.position.x += Math.sin(t * 0.4) * 0.015;
        camera.position.y += Math.cos(t * 0.3) * 0.01;
      }
      camera.lookAt(cinematicTarget);
    }
  });

  return isVRMode ? (
    <OrbitControls
      target={vrTarget}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 1.8}
      minDistance={4}
      maxDistance={25}
    />
  ) : null;
}

// ============================================
// 5. UI COMPONENTS
// ============================================
function SmoothTitle({ isLoaded, isVRMode }) {
  return (
    <div className={`title-wrapper ${isLoaded && !isVRMode ? 'reveal' : 'hide'}`}>
      <h1 className="cinematic-title">ENGVIVA</h1>
      <div className="title-underline"></div>
      <p className="cinematic-subtitle">HR INTELLIGENCE PLATFORM</p>
    </div>
  );
}

// ============================================
// MAIN SCREEN COMPONENT
// ============================================
export default function SplashScreen() {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVRMode, setIsVRMode] = useState(false);

  return (
    <>
      <style>{`
        :root { --color-dark: #100a1c; --color-text: #ffffff; --color-lavender: #b9a3ff; --color-lavender-light: #e4d9ff; --color-lavender-deep: #6f52d6; }
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: var(--color-dark); font-family: 'Inter', sans-serif; }
        .splash-container { width: 100vw; height: 100vh; position: relative; background: var(--color-dark); }

        .title-wrapper { position: absolute; top: 15%; left: 50%; transform: translateX(-50%); text-align: center; z-index: 10; pointer-events: none; opacity: 0; transition: opacity 0.5s ease; }
        .title-wrapper.reveal { animation: titleFadeIn 3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; animation-delay: 1.5s; }
        .title-wrapper.hide { opacity: 0 !important; animation: none; }
        .cinematic-title { font-size: 90px; font-weight: 900; margin: 0; letter-spacing: 0px; color: var(--color-text); background: linear-gradient(to bottom, #ffffff 0%, var(--color-lavender) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; filter: drop-shadow(0 0 22px rgba(185, 163, 255, 0.4)); transition: letter-spacing 5s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .title-wrapper.reveal .cinematic-title { letter-spacing: 32px; }
        .title-underline { height: 1px; width: 0%; margin: 15px auto 10px; background: linear-gradient(90deg, transparent, var(--color-lavender), transparent); opacity: 0.6; }
        .title-wrapper.reveal .title-underline { animation: lineExpand 2.5s ease-out 2s forwards; }
        .cinematic-subtitle { color: #c9b8ff; letter-spacing: 12px; font-size: 13px; opacity: 0; transform: translateY(10px); }
        .title-wrapper.reveal .cinematic-subtitle { animation: slideUpFade 2s ease-out 2.5s forwards; }

        .enter-action { position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); z-index: 20; opacity: 0; transition: opacity 1s, transform 0.5s ease; }
        .enter-action.reveal { opacity: 1; animation: fadeIn 2s forwards 3.5s; }
        .enter-action.vr-active { transform: translateX(-50%) translateY(20px); opacity: 0.3; }
        .enter-action.vr-active:hover { opacity: 1; transform: translateX(-50%) translateY(0); }

        .enter-btn {
          background: linear-gradient(135deg, #8a6fe8, var(--color-lavender));
          border: 1px solid rgba(228, 217, 255, 0.6);
          color: #ffffff;
          padding: 19px 58px;
          font-size: 13px;
          letter-spacing: 6px;
          border-radius: 4px;
          cursor: pointer;
          backdrop-filter: blur(10px);
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          text-transform: uppercase;
          font-weight: 700;
          position: relative;
          overflow: hidden;
          animation: buttonGlow 2.4s ease-in-out infinite alternate;
        }
        .enter-btn::before { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transition: left 0.7s ease; }
        .enter-btn:hover::before { left: 100%; }
        .enter-btn:hover { background: linear-gradient(135deg, #9b82f2, var(--color-lavender-light)); border-color: #ffffff; color: #ffffff; box-shadow: 0 0 45px rgba(185, 163, 255, 0.85), 0 0 90px rgba(111, 82, 214, 0.5); letter-spacing: 8px; }

        .vr-toggle-btn {
          position: absolute; top: 30px; right: 30px; z-index: 30;
          background: rgba(20, 12, 34, 0.5); border: 1px solid rgba(185, 163, 255, 0.35);
          color: white; border-radius: 50%; width: 50px; height: 50px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; backdrop-filter: blur(8px); transition: all 0.3s ease;
          opacity: 0;
        }
        .vr-toggle-btn.reveal { animation: fadeIn 1s forwards 4s; }
        .vr-toggle-btn:hover { background: rgba(185, 163, 255, 0.18); transform: scale(1.1); box-shadow: 0 0 20px rgba(185, 163, 255, 0.4); }
        .vr-tooltip {
          position: absolute; right: 65px; background: rgba(16, 10, 28, 0.9); color: white; padding: 6px 12px;
          border-radius: 4px; font-size: 11px; letter-spacing: 2px; opacity: 0; transition: opacity 0.3s; pointer-events: none;
          white-space: nowrap; border: 1px solid rgba(185, 163, 255, 0.25);
        }
        .vr-toggle-btn:hover .vr-tooltip { opacity: 1; }

        @keyframes titleFadeIn { 0% { opacity: 0; filter: blur(25px); transform: translateX(-50%) translateY(30px) scale(0.9); } 100% { opacity: 1; filter: blur(0px); transform: translateX(-50%) translateY(0) scale(1); } }
        @keyframes lineExpand { to { width: 100%; } }
        @keyframes slideUpFade { to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { to { opacity: 1; } }
        @keyframes buttonGlow {
          0% { box-shadow: 0 0 20px rgba(185, 163, 255, 0.45), 0 0 45px rgba(111, 82, 214, 0.25); }
          100% { box-shadow: 0 0 38px rgba(185, 163, 255, 0.8), 0 0 85px rgba(111, 82, 214, 0.45); }
        }
      `}</style>

      <div className="splash-container">
        <Canvas style={{ position: 'absolute', inset: 0 }} dpr={[1, 1.5]} shadows gl={{ powerPreference: "high-performance" }}>

          <StudioEnvironment isVRMode={isVRMode} />

          <Suspense fallback={null}>
            <BackdraftSmoke />
            <EnlargedAvatar setIsLoaded={setIsLoaded} />
          </Suspense>

          <EffectComposer disableNormalPass multisampling={4}>
            <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.9} height={300} intensity={1.5} opacity={1} />
            <Noise opacity={0.025} />
            <Vignette eskil={false} offset={0.1} darkness={0.65} />
          </EffectComposer>

          <CameraManager isVRMode={isVRMode} />
        </Canvas>

        <Loader dataInterpolation={(p) => `Loading Environment ${p.toFixed(0)}%`} />

        <SmoothTitle isLoaded={isLoaded} isVRMode={isVRMode} />

        <button
          className={`vr-toggle-btn ${isLoaded ? 'reveal' : ''}`}
          onClick={() => setIsVRMode(!isVRMode)}
        >
          {isVRMode ? <XIcon /> : <HeadsetIcon />}
          <div className="vr-tooltip">{isVRMode ? 'EXIT 360 EXPLORE' : '360Â° EXPLORE MODE'}</div>
        </button>

        <div className={`enter-action ${isLoaded ? 'reveal' : ''} ${isVRMode ? 'vr-active' : ''}`}>
          <button className="enter-btn" onClick={() => navigate('/login')}>
            Initialize System
          </button>
        </div>
      </div>
    </>
  );
}
