import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Simple butterfly SVG (two wings) with gradient fill
function Butterfly({ size = 22, hue = 270 }) {
  const colorA = `hsl(${hue}, 85%, 65%)`;
  const colorB = `hsl(${(hue + 60) % 360}, 85%, 60%)`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wingGradient" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor={colorA} />
          <stop offset="100%" stopColor={colorB} />
        </linearGradient>
      </defs>
      {/* body */}
      <rect x="30" y="22" width="4" height="20" rx="2" fill="#0ea5e9"/>
      {/* left wing */}
      <path d="M32 32 C 18 16, 10 16, 8 28 C 6 40, 22 44, 32 36 Z" fill="url(#wingGradient)" opacity="0.9"/>
      {/* right wing */}
      <path d="M32 32 C 46 16, 54 16, 56 28 C 58 40, 42 44, 32 36 Z" fill="url(#wingGradient)" opacity="0.95"/>
    </svg>
  );
}

/**
 * ButterflyField - Non-interactive, low-cost floating butterflies for a dreamy theme.
 * Props: count (default 16)
 */
export default function ButterflyField({ count = 16 }) {
  const butterflies = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const delay = Math.random() * 10;
      const duration = 30 + Math.random() * 35; // 30s - 65s across screen
      const y = Math.random() * 100; // vh
      const amp = 10 + Math.random() * 18; // vertical sway amplitude in px
      const flap = 0.7 + Math.random() * 0.6; // flap speed multiplier
      const size = 18 + Math.round(Math.random() * 14);
      const hue = Math.round(250 + Math.random() * 80); // purple-cyan range
      // Slightly different waves per bug
      const yKeyframes = [0, -amp, amp, 0];
      const rotateKeyframes = [-6, 6, -6];
      return { id: i, delay, duration, y, amp, flap, size, hue, yKeyframes, rotateKeyframes };
    });
  }, [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {butterflies.map((b) => (
        <motion.div
          key={b.id}
          initial={{ x: '-10vw', y: `${b.y}vh`, opacity: 0 }}
          animate={{
            x: ['-10vw', '110vw'],
            opacity: [0, 0.9, 0.9, 0],
          }}
          transition={{ duration: b.duration, ease: 'linear', repeat: Infinity, delay: b.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: b.yKeyframes, rotateZ: b.rotateKeyframes, scale: [1, 1.05, 1] }}
            transition={{ duration: 4 + Math.random() * 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
          >
            <motion.div
              animate={{ scaleX: [1, 0.85, 1], scaleY: [1, 1.05, 1] }} // wing flaps
              transition={{ duration: 0.6 / b.flap, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <Butterfly size={b.size} hue={b.hue} />
            </motion.div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
