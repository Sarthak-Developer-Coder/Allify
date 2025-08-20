import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function Bolt({ width = 6, height = 80, hue = 55 }) {
  const color = `hsl(${hue}, 100%, 82%)`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={`M${width/2} 0 L ${width*0.2} ${height*0.4} L ${width*0.6} ${height*0.4} L ${width*0.1} ${height} L ${width*0.8} ${height*0.55} L ${width*0.4} ${height*0.55} Z`} fill={color} />
    </svg>
  );
}

export default function ThunderOverlay({ flashEverySec = [6, 14], boltCount = 3, flashStrength = 0.4 }) {
  const [seed, setSeed] = useState(0);
  useEffect(() => {
    const min = Math.min(...flashEverySec);
    const max = Math.max(...flashEverySec);
    const tick = setInterval(() => setSeed((s) => s + 1), (min + Math.random() * (max - min)) * 1000);
    return () => clearInterval(tick);
  }, [flashEverySec]);

  const bolts = useMemo(() => {
    // simple seeded pseudo-random based on current seed and index
    const rnd = (n) => {
      const x = Math.sin(n) * 10000;
      return x - Math.floor(x);
    };
  return new Array(Math.max(1, boltCount)).fill(0).map((_, i) => {
      const r1 = rnd(seed * 7 + i * 13 + 0.11);
      const r2 = rnd(seed * 11 + i * 17 + 0.23);
      const r3 = rnd(seed * 13 + i * 19 + 0.37);
      const r4 = rnd(seed * 17 + i * 23 + 0.49);
      const r5 = rnd(seed * 19 + i * 29 + 0.59);
      const x = 10 + r1 * 80; // vw
      const y = r2 * 40; // vh
      const height = 60 + Math.round(r3 * 80);
      const width = 4 + Math.round(r4 * 4);
      const hue = 50 + Math.round(r5 * 10);
      return { id: i, x, y, height, width, hue };
    });
  }, [seed, boltCount]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {/* screen flash */}
      <motion.div
        key={`flash-${seed}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, flashStrength, 0] }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(250, 250, 210, 0.15)' }}
      />
      {bolts.map((b) => (
        <motion.div key={b.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.28, ease: 'easeOut' }}
          style={{ position: 'absolute', left: `${b.x}vw`, top: `${b.y}vh` }}
        >
          <Bolt width={b.width} height={b.height} hue={b.hue} />
        </motion.div>
      ))}
    </div>
  );
}
