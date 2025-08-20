import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Heart({ size = 16, hue = 340 }) {
  const fill = `hsl(${hue}, 80%, 60%)`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 29 C16 29, 4 22, 4 12 C4 6, 10 4, 14 8 C16 10, 16 10, 18 8 C22 4, 28 6, 28 12 C28 22, 16 29, 16 29 Z" fill={fill} />
    </svg>
  );
}

export default function HeartFloaters({ count = 14 }) {
  const hearts = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const delay = Math.random() * 10;
    const duration = 20 + Math.random() * 20; // 20-40s
    const x = Math.random() * 100; // vw
    const amp = 4 + Math.random() * 10;
    const size = 10 + Math.round(Math.random() * 10);
    const hue = 330 + Math.round(Math.random() * 40);
    return { id: i, delay, duration, x, amp, size, hue };
  }), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          initial={{ x: `${h.x}vw`, y: '110vh', opacity: 0 }}
          animate={{ x: `${h.x}vw`, y: ['110vh', '-10vh'], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: h.duration, ease: 'linear', repeat: Infinity, delay: h.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -h.amp, h.amp, 0], scale: [1, 1.05, 1] }}
            transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.25))' }}
          >
            <Heart size={h.size} hue={h.hue} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
