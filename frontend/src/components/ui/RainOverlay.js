import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Drop({ length = 14, thickness = 1.5 }) {
  return (
    <svg width={2} height={length} viewBox={`0 0 2 ${length}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="1" y1="0" x2="1" y2={length} stroke="rgba(148, 163, 184, 0.6)" strokeWidth={thickness} strokeLinecap="round" />
    </svg>
  );
}

export default function RainOverlay({ count = 80, speed = 1 }) {
  const drops = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const x = Math.random() * 100; // vw
    const delay = Math.random() * 3;
    const duration = (4 + Math.random() * 3) / speed; // 4-7s adjusted by speed
    const length = 10 + Math.round(Math.random() * 12);
    const thickness = 1 + Math.random() * 1.5;
    return { id: i, x, delay, duration, length, thickness };
  }), [count, speed]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {drops.map((d) => (
        <motion.div key={d.id}
          initial={{ x: `${d.x}vw`, y: '-10vh', opacity: 0 }}
          animate={{ x: `${d.x}vw`, y: ['-10vh', '110vh'], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: d.duration, ease: 'linear', repeat: Infinity, delay: d.delay }}
          style={{ position: 'absolute' }}
        >
          <Drop length={d.length} thickness={d.thickness} />
        </motion.div>
      ))}
    </div>
  );
}
