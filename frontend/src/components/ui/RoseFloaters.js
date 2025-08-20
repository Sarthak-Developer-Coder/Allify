import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Rose({ size = 20, hue = 350 }) {
  const petal = `hsl(${hue}, 70%, 55%)`;
  const petalDark = `hsl(${hue}, 75%, 45%)`;
  const stem = `hsl(130, 40%, 30%)`;
  const leaf = `hsl(130, 50%, 38%)`;
  const w = size;
  const h = Math.round(size * 1.8);
  return (
    <svg width={w} height={h} viewBox="0 0 32 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* stem */}
      <path d="M16 24 L16 50" stroke={stem} strokeWidth="2.2" strokeLinecap="round" />
      {/* leaves */}
      <path d="M16 34 C10 32, 6 30, 6 26 C10 26, 12 28, 16 30" fill={leaf} opacity="0.95" />
      <path d="M16 38 C22 36, 26 34, 26 30 C22 30, 20 32, 16 34" fill={leaf} opacity="0.95" />
      {/* rose petals */}
      <circle cx="16" cy="16" r="8" fill={petal} />
      <path d="M10 16 C12 10, 20 10, 22 16 C20 20, 12 22, 10 16 Z" fill={petalDark} opacity="0.9" />
      <path d="M12 14 C16 12, 18 14, 20 16 C18 18, 16 18, 14 18 C12 18, 12 16, 12 14 Z" fill={petal} />
      <path d="M16 8 C20 10, 22 12, 22 16 C18 14, 16 12, 16 8 Z" fill={petal} opacity="0.95" />
    </svg>
  );
}

export default function RoseFloaters({ count = 10 }) {
  const roses = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const delay = Math.random() * 12;
    const duration = 26 + Math.random() * 22; // 26-48s upwards
    const x = Math.random() * 100; // vw
    const amp = 6 + Math.random() * 10;
    const size = 16 + Math.round(Math.random() * 12);
    const hue = 340 + Math.round(Math.random() * 20);
    return { id: i, delay, duration, x, amp, size, hue };
  }), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {roses.map((r) => (
        <motion.div
          key={r.id}
          initial={{ x: `${r.x}vw`, y: '110vh', opacity: 0 }}
          animate={{ x: `${r.x}vw`, y: ['110vh', '-10vh'], opacity: [0, 0.95, 0.95, 0] }}
          transition={{ duration: r.duration, ease: 'linear', repeat: Infinity, delay: r.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -r.amp, r.amp, 0], rotateZ: [-3, 3, -3], scale: [1, 1.04, 1] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 3px 9px rgba(0,0,0,0.3))' }}
          >
            <Rose size={r.size} hue={r.hue} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
