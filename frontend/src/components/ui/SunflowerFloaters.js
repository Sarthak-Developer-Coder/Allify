import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

function Sunflower({ size = 22, hue = 50 }) {
  const petal = `hsl(${hue}, 90%, 58%)`; // bright yellow
  const petalDark = `hsl(${hue}, 85%, 48%)`;
  const center = `hsl(30, 45%, 28%)`; // brown
  const seed = `hsl(30, 40%, 22%)`;
  const stem = `hsl(125, 35%, 30%)`;
  const leaf = `hsl(125, 45%, 36%)`;
  const w = size;
  const h = Math.round(size * 1.9);
  return (
    <svg width={w} height={h} viewBox="0 0 32 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* stem */}
      <path d="M16 26 L16 54" stroke={stem} strokeWidth="2.2" strokeLinecap="round" />
      {/* leaves */}
      <path d="M16 36 C11 34, 7 32, 7 28 C11 28, 13 30, 16 32" fill={leaf} opacity="0.95" />
      <path d="M16 40 C21 38, 25 36, 25 32 C21 32, 19 34, 16 36" fill={leaf} opacity="0.95" />
      {/* petals - simple ring */}
      <g transform="translate(16,18)">
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse key={i} cx="0" cy="-9" rx="3.6" ry="7" fill={i % 2 ? petal : petalDark} transform={`rotate(${(i * 30)})`} />
        ))}
      </g>
      {/* center */}
      <circle cx="16" cy="18" r="6.8" fill={center} />
      {/* seeds hint */}
      <circle cx="14" cy="16" r="1.1" fill={seed} />
      <circle cx="18" cy="17" r="1.1" fill={seed} />
      <circle cx="16" cy="20" r="1.1" fill={seed} />
    </svg>
  );
}

export default function SunflowerFloaters({ count = 8 }) {
  const sunflowers = useMemo(() => new Array(count).fill(0).map((_, i) => {
    const delay = Math.random() * 10;
    const duration = 28 + Math.random() * 22; // upwards
    const x = Math.random() * 100; // vw
    const amp = 5 + Math.random() * 9;
    const size = 18 + Math.round(Math.random() * 12);
    const hue = 48 + Math.round(Math.random() * 8); // yellow range
    return { id: i, delay, duration, x, amp, size, hue };
  }), [count]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {sunflowers.map((s) => (
        <motion.div
          key={s.id}
          initial={{ x: `${s.x}vw`, y: '110vh', opacity: 0 }}
          animate={{ x: `${s.x}vw`, y: ['110vh', '-10vh'], opacity: [0, 0.95, 0.95, 0] }}
          transition={{ duration: s.duration, ease: 'linear', repeat: Infinity, delay: s.delay }}
          style={{ position: 'absolute' }}
        >
          <motion.div
            animate={{ y: [0, -s.amp, s.amp, 0], rotateZ: [-2.5, 2.5, -2.5], scale: [1, 1.03, 1] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ filter: 'drop-shadow(0 3px 9px rgba(0,0,0,0.28))' }}
          >
            <Sunflower size={s.size} hue={s.hue} />
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}
