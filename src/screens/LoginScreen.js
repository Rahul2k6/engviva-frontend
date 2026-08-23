import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';

// ============================================
// ICONS
// ============================================
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = ({ off }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {off ? (
      <><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-3.22 4.44M14.12 14.12a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>
    ) : (
      <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>
    )}
  </svg>
);

// ============================================
// 1. 3D VFX: VIBRANT DATA DUST
// ============================================
function DataDust() {
  const pointsRef = useRef();
  const particleCount = 1000;

  const [positions] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
    }
    return [pos];
  }, [particleCount]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = time * 0.03;
      pointsRef.current.rotation.x = time * 0.015;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions}>
      <PointMaterial
        size={0.09}
        sizeAttenuation
        color="#d8b4fe" // Brighter purple particle
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// ============================================
// 2. 3D VFX: NEURAL INTELLIGENCE CORE
// ============================================
function NeuralCore() {
  const coreRef = useRef();
  const ringRef = useRef();

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (coreRef.current) {
      coreRef.current.rotation.y = time * 0.15;
      coreRef.current.rotation.x = time * 0.1;
      coreRef.current.position.y = Math.sin(time * 0.5) * 0.3; // Gentle hover
    }
    if (ringRef.current) {
      ringRef.current.rotation.x = Math.PI / 2 + Math.sin(time * 0.2) * 0.1;
      ringRef.current.rotation.z = time * -0.05;
      ringRef.current.position.y = Math.sin(time * 0.5) * 0.3;
    }
  });

  return (
    <group position={[4.5, 0, -4]}>
      {/* Outer Data Ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[5.5, 0.02, 16, 100]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </mesh>

      {/* Inner Geometric Core */}
      <mesh ref={coreRef}>
        <icosahedronGeometry args={[3.2, 1]} />
        <meshBasicMaterial color="#6d28d9" wireframe={true} transparent opacity={0.6} />
      </mesh>

      {/* Central Energy Source (Caught by Bloom for vibrant glow) */}
      <pointLight position={[0, 0, 0]} intensity={25} color="#c4b5fd" distance={25} />
      <pointLight position={[0, 0, 0]} intensity={10} color="#3b82f6" distance={15} /> {/* Blue accent light */}
    </group>
  );
}

// ============================================
// 3. MAIN AUTHENTICATION SCREEN
// ============================================
export default function LoginScreen() {
  const navigate = useNavigate();

  // State Management
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // AUTH GUARD: Skip Login if already authenticated
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard', { replace: true });
      } else {
        setIsCheckingAuth(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // Handle Standard Email/Password Auth
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') setError('Email is already registered. Please sign in.');
      else if (err.code === 'auth/weak-password') setError('Password should be at least 6 characters.');
      else if (err.code === 'auth/invalid-credential') setError('Invalid credentials. Please try again.');
      else setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Google Login/Signup via Popup
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setError('');

    try {
      await signInWithPopup(auth, googleProvider);
      navigate('/dashboard');
    } catch (err) {
      setError('Google authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // If Firebase is still verifying the token on load, show an empty vibrant background
  if (isCheckingAuth) {
    return <div style={{ background: '#090412', width: '100vw', height: '100vh' }} />;
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        :root {
          /* Vibrant Dark Theme */
          --bg: #090412;
          --glass-surface: rgba(255, 255, 255, 0.03);
          --glass-border: rgba(255, 255, 255, 0.08);
          --glass-highlight: rgba(255, 255, 255, 0.15);
          
          --accent: #a78bfa;
          --accent-light: #ddd6fe;
          --accent-deep: #7c3aed;
          
          --text: #ffffff;
          --text-dim: #9ca3af;
        }

        body, html {
          margin: 0; padding: 0; height: 100%;
          background-color: var(--bg);
          font-family: 'Space Grotesk', sans-serif;
          overflow: hidden; user-select: none;
        }

        .auth-wrapper {
          position: relative; width: 100vw; height: 100vh;
          display: flex; align-items: center; justify-content: flex-start;
          padding-left: 12vw; box-sizing: border-box;
          background: radial-gradient(circle at 100% 50%, rgba(124, 58, 237, 0.15) 0%, transparent 60%),
                      radial-gradient(circle at 0% 100%, rgba(59, 130, 246, 0.1) 0%, transparent 50%);
        }

        .canvas-container {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          z-index: 0; pointer-events: none;
        }

        /* True Glassmorphism Card */
        .auth-card {
          position: relative; z-index: 10; width: 100%; max-width: 420px;
          background: var(--glass-surface);
          backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px);
          border: 1px solid var(--glass-border);
          border-top: 1px solid var(--glass-highlight);
          border-left: 1px solid var(--glass-highlight);
          border-radius: 20px; padding: 48px 42px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 
                      0 0 80px rgba(124, 58, 237, 0.15);
          animation: slideRight 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          opacity: 0; transform: translateX(-30px);
        }

        .brand-title {
          font-size: 32px; font-weight: 700; text-align: center; margin: 0 0 4px 0;
          letter-spacing: 2px; color: var(--text);
          background: linear-gradient(135deg, #ffffff 0%, var(--accent-light) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        .auth-subtitle {
          text-align: center; color: var(--text-dim); font-size: 14px;
          margin-bottom: 36px; font-weight: 400; letter-spacing: 0.5px;
        }

        .input-group { margin-bottom: 20px; position: relative; }

        .input-icon {
          position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
          color: var(--text-dim); pointer-events: none; display: flex; transition: color 0.3s ease;
        }

        .input-group:focus-within .input-icon { color: var(--accent); }

        .auth-input {
          width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--glass-border);
          padding: 16px 16px 16px 48px; border-radius: 12px; color: var(--text); 
          font-size: 15px; font-family: 'Space Grotesk', sans-serif;
          transition: all 0.3s ease; box-sizing: border-box; outline: none;
        }
        .auth-input.has-toggle { padding-right: 48px; }

        .auth-input:focus {
          border-color: var(--accent); background: rgba(0, 0, 0, 0.5);
          box-shadow: 0 0 0 4px rgba(167, 139, 250, 0.15);
        }
        .auth-input::placeholder { color: #6b7280; font-weight: 300; }

        .password-toggle {
          position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--text-dim); cursor: pointer;
          display: flex; padding: 2px; transition: color 0.2s ease;
        }
        .password-toggle:hover { color: var(--accent); }

        .auth-btn {
          width: 100%; color: #fff;
          background: linear-gradient(135deg, var(--accent-deep), #5b21b6);
          padding: 16px; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px;
          font-size: 15px; font-weight: 600; font-family: 'Space Grotesk', sans-serif;
          letter-spacing: 1px; cursor: pointer; transition: all 0.3s ease;
          margin-bottom: 24px; position: relative; overflow: hidden; 
          display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.4);
        }

        .auth-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 15px 30px -5px rgba(124, 58, 237, 0.6);
          border-top: 1px solid rgba(255,255,255,0.3);
        }

        .auth-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

        .spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }

        .toggle-text {
          text-align: center; color: var(--text-dim); font-size: 14px;
          margin-bottom: 24px; font-weight: 400;
        }

        .toggle-link {
          color: var(--accent-light); cursor: pointer; font-weight: 600; margin-left: 6px;
          transition: all 0.2s;
        }
        .toggle-link:hover { color: #fff; text-shadow: 0 0 10px rgba(255,255,255,0.3); }

        .divider {
          display: flex; align-items: center; text-align: center; margin: 24px 0;
          color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;
          font-weight: 500;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; border-bottom: 1px solid var(--glass-border);
        }
        .divider:not(:empty)::before { margin-right: 1em; }
        .divider:not(:empty)::after { margin-left: 1em; }

        .google-btn {
          width: 100%; background: rgba(255, 255, 255, 0.05); color: var(--text);
          border: 1px solid var(--glass-border); padding: 14px; border-radius: 12px;
          font-size: 14px; font-weight: 500; font-family: 'Space Grotesk', sans-serif;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 12px;
          transition: all 0.3s ease; backdrop-filter: blur(10px);
        }

        .google-btn:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1); border-color: rgba(255,255,255,0.2);
          transform: translateY(-2px);
        }

        .google-icon-badge {
          width: 24px; height: 24px; border-radius: 50%; background: #fff;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .error-message {
          color: #fca5a5; background: rgba(239, 68, 68, 0.1); 
          border: 1px solid rgba(239, 68, 68, 0.3);
          padding: 12px 16px; border-radius: 8px; font-size: 13px; text-align: center;
          margin-bottom: 20px; font-weight: 500;
          animation: shake 0.4s ease;
        }

        @keyframes slideRight { to { opacity: 1; transform: translateX(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(2px); }
        }

        @media (max-width: 820px) {
          .auth-wrapper { justify-content: center; padding-left: 0; padding: 0 24px; }
          .auth-card { padding: 40px 32px; }
        }
      `}</style>

      <div className="auth-wrapper">

        {/* 3D BACKGROUND */}
        <div className="canvas-container">
          <Canvas camera={{ position: [0, 0, 10], fov: 60 }} dpr={[1, 1.5]} gl={{ powerPreference: "high-performance", antialias: false }}>
            <color attach="background" args={['#090412']} />
            <NeuralCore />
            <DataDust />

            {/* Cinematic Post Processing */}
            <EffectComposer disableNormalPass multisampling={0}>
              <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} height={300} intensity={2.0} />
              <Noise opacity={0.04} />
              <Vignette eskil={false} offset={0.1} darkness={0.7} />
            </EffectComposer>
          </Canvas>
        </div>

        {/* AUTHENTICATION UI */}
        <div className="auth-card">
          <h1 className="brand-title">ENGVIVA</h1>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to continue' : 'Create your account'}
          </p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleEmailAuth}>
            <div className="input-group">
              <span className="input-icon"><MailIcon /></span>
              <input
                type="email"
                className="auth-input"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="input-group">
              <span className="input-icon"><LockIcon /></span>
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input has-toggle"
                placeholder="Password (Min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength="6"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <EyeIcon off={showPassword} />
              </button>
            </div>

            <button type="submit" className="auth-btn" disabled={isLoading}>
              {isLoading ? (<><span className="spinner" />Please wait...</>) : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          {/* TOGGLE BETWEEN LOGIN AND SIGN UP */}
          <div className="toggle-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span
              className="toggle-link"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </span>
          </div>

          <div className="divider">Or continue with</div>

          <button onClick={handleGoogleAuth} className="google-btn" disabled={isLoading}>
            <span className="google-icon-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </span>
            Google
          </button>
        </div>
      </div>
    </>
  );
}