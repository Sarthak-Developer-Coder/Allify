import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Leaf({ size = 18, hue = 120 }) {
  const fill = `hsl(${hue}, 55%, 45%)`;
  const vein = `hsl(${hue}, 45%, 30%)`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 C4 8, 14 2, 26 6 C30 18, 22 26, 14 28 C10 28, 6 24, 4 18 Z" fill={fill} />
      <path d="M10 14 C14 14, 18 12, 22 10" stroke={vein} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LeafFall({ count = 20 }) {
  const leaves = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const delay = Math.random() * 8;
    const duration = 16 + Math.random() * 18; // 16-34s
    const x = Math.random() * 100; // vw
    const amp = 12 + Math.random() * 20;
    const drift = 20 + Math.random() * 40; // horizontal drift px
    const size = 14 + Math.round(Math.random() * 14);
    const hue = 90 + Math.round(Math.random() * 40); // greenish/yellowish
    return { id: i, delay, duration, x, amp, drift, size, hue };
  }), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {leaves.map((l) => (
        <motion.div
          key={l.id}
          initial={{ x: `${l.x}vw`, y: '-10vh', opacity: 0 }}
          animate={{ x: [`${l.x}vw`, `${l.x + (l.drift/10)}vw`, `${l.x - (l.drift/10)}vw`, `${l.x}vw`], y: ['-10vh', '110vh'], opacity: [0, 0.95, 0.95, 0] }}
          transition={{ duration: l.duration, ease: 'linear', repeat: Infinity, delay: l.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ rotateZ: [-20, 20, -20], y: [0, -l.amp, l.amp, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
          >
            <Leaf size={l.size} hue={l.hue} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
