import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Bird({ size = 26, color = '#334155' }) {
  const w = size * 2;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* simple flying bird silhouette */}
      <path d="M2 26 Q 18 8 32 14 Q 46 8 62 26" stroke={color} strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export default function BirdField({ count = 10 }) {
  const birds = useMemo(() => {
    return new Array(count).fill(0).map((_, i) => {
      const delay = Math.random() * 12;
      const duration = 24 + Math.random() * 26; // 24-50s
      const y = 5 + Math.random() * 70; // avoid top/bottom extremes
      const amp = 6 + Math.random() * 12;
      const size = 18 + Math.round(Math.random() * 16);
      const reverse = Math.random() < 0.4; // some fly right->left
      const color = `hsl(${200 + Math.random() * 60}, 30%, ${35 + Math.random() * 20}%)`;
      const flap = 0.9 + Math.random() * 0.8;
      return { id: i, delay, duration, y, amp, size, reverse, color, flap };
    });
  }, [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {birds.map((b) => (
        <motion.div
          key={b.id}
          initial={{ x: b.reverse ? '110vw' : '-10vw', y: `${b.y}vh`, opacity: 0 }}
          animate={{ x: b.reverse ? ['110vw', '-10vw'] : ['-10vw', '110vw'], opacity: [0, 0.9, 0.9, 0] }}
          transition={{ duration: b.duration, ease: 'linear', repeat: Infinity, delay: b.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -b.amp, b.amp, 0], rotateZ: [-2, 2, -2] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <motion.div
              animate={{ scaleY: [1, 0.9, 1], scaleX: [1, 1.05, 1] }}
              transition={{ duration: 0.8 / b.flap, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
              style={{ originX: 0.5, originY: 0.5, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.35))' }}
            >
              <Bird size={b.size} color={b.color} />
            </motion.div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
