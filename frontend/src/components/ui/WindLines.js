import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function WindLine({ length = 140, opacity = 0.4 }) {
  return (
    <svg width={length} height={20} viewBox={`0 0 ${length} 20`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={`M2 10 Q ${length/3} 2, ${length/2} 10 T ${length-2} 10`} stroke={`rgba(148, 163, 184, ${opacity})`} strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function WindLines({ count = 8 }) {
  const lines = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const y = Math.random() * 100; // vh
    const length = 100 + Math.round(Math.random() * 120);
    const delay = Math.random() * 10;
    const duration = 10 + Math.random() * 10; // 10-20s
    const opacity = 0.25 + Math.random() * 0.35;
    return { id: i, y, length, delay, duration, opacity };
  }), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {lines.map((l) => (
        <motion.div key={l.id}
          initial={{ x: '-20vw', y: `${l.y}vh`, opacity: 0 }}
          animate={{ x: ['-20vw', '120vw'], opacity: [0, l.opacity, l.opacity, 0] }}
          transition={{ duration: l.duration, ease: 'linear', repeat: Infinity, delay: l.delay }}
          style={{ position: 'absolute' }}
        >
          <WindLine length={l.length} opacity={l.opacity} />
        </motion.div>
      ))}
    </div>
  );
}
