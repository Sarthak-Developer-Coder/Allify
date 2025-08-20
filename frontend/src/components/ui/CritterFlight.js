import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Original, non-IP creatures (round body with tiny wings and ears)
function Critter({ size = 28, hue = 210 }) {
  const primary = `hsl(${hue}, 75%, 60%)`;
  const wing = `hsl(${(hue + 40) % 360}, 85%, 75%)`;
  const cheek = `hsl(${(hue + 320) % 360}, 85%, 70%)`;
  const w = size;
  const h = Math.round(size * 0.9);
  return (
    <svg width={w} height={h} viewBox="0 0 64 58" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* wings */}
      <path d="M10 28 C2 20, 2 12, 12 12 C18 12, 20 18, 18 24 C16 30, 14 30, 10 28 Z" fill={wing} />
      <path d="M54 28 C62 20, 62 12, 52 12 C46 12, 44 18, 46 24 C48 30, 50 30, 54 28 Z" fill={wing} />
      {/* body */}
      <ellipse cx="32" cy="30" rx="18" ry="16" fill={primary} />
      {/* ears */}
      <path d="M24 16 C20 12, 18 8, 22 6 C26 4, 28 10, 28 14 Z" fill={primary} />
      <path d="M40 16 C44 12, 46 8, 42 6 C38 4, 36 10, 36 14 Z" fill={primary} />
      {/* eyes */}
      <circle cx="27" cy="28" r="2.4" fill="#222" />
      <circle cx="37" cy="28" r="2.4" fill="#222" />
      {/* cheeks */}
      <circle cx="24" cy="32" r="2.2" fill={cheek} opacity="0.85" />
      <circle cx="40" cy="32" r="2.2" fill={cheek} opacity="0.85" />
      {/* mouth */}
      <path d="M28 34 C32 36, 34 36, 38 34" stroke="#222" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// CritterFlight - small cheerful creatures flying across the screen
export default function CritterFlight({ count = 8 }) {
  const critters = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const delay = Math.random() * 12;
      const duration = 28 + Math.random() * 24; // 28s - 52s
      const y = Math.random() * 100; // vh
      const amp = 8 + Math.random() * 16;
      const flap = 0.8 + Math.random() * 0.8;
      const size = 22 + Math.round(Math.random() * 14);
      const hue = Math.round(Math.random() * 360);
      const reverse = Math.random() < 0.5;
      return { id: i, delay, duration, y, amp, flap, size, hue, reverse };
    });
  }, [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {critters.map((c) => (
        <motion.div
          key={c.id}
          initial={{ x: c.reverse ? '110vw' : '-10vw', y: `${c.y}vh`, opacity: 0 }}
          animate={{
            x: c.reverse ? ['110vw', '-10vw'] : ['-10vw', '110vw'],
            opacity: [0, 0.95, 0.95, 0],
          }}
          transition={{ duration: c.duration, ease: 'linear', repeat: Infinity, delay: c.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -c.amp, c.amp, 0], rotateZ: [-4, 4, -4] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 3px 9px rgba(0,0,0,0.35))' }}
          >
            <motion.div
              animate={{ scaleY: [1, 1.1, 1], scaleX: [1, 0.92, 1] }}
              transition={{ duration: 0.7 / c.flap, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <Critter size={c.size} hue={c.hue} />
            </motion.div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
