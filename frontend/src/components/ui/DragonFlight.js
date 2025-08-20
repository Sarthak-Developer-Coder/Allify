import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

// Minimal dragon silhouette with wings and tail
function Dragon({ size = 140, hue = 140 }) {
	const body = `hsl(${hue}, 50%, 45%)`;
	const wing = `hsl(${(hue + 30) % 360}, 55%, 52%)`;
	return (
		<svg width={size} height={(size * 2) / 3} viewBox="0 0 210 140" fill="none" xmlns="http://www.w3.org/2000/svg">
			<g filter="url(#shadow)">
				{/* body and neck */}
				<path d="M20 80 C50 60, 80 50, 110 60 C140 70, 150 60, 165 55 C170 58, 168 64, 162 68 C155 73, 150 80, 145 86 C140 92, 132 98, 120 98 C95 98, 70 95, 50 100 C35 104, 25 96, 22 90 C20 86, 19 83, 20 80 Z" fill={body} />
				{/* head */}
				<path d="M165 55 C175 50, 190 52, 200 58 C204 60, 205 65, 200 67 C193 70, 185 70, 178 69 C172 68, 170 62, 165 55 Z" fill={body} />
				{/* tail */}
				<path d="M20 80 C10 84, 8 92, 6 102 C4 110, 8 116, 16 118 C24 120, 28 115, 30 110 C32 104, 30 98, 28 94 C25 89, 22 84, 20 80 Z" fill={body} />
				{/* wings */}
				<path d="M90 60 C70 30, 40 26, 18 40 C40 42, 52 52, 60 66 C66 78, 78 84, 92 84 C96 76, 94 68, 90 60 Z" fill={wing} />
				<path d="M110 60 C135 45, 158 46, 180 58 C162 58, 146 66, 136 78 C126 90, 114 90, 104 84 C108 74, 110 66, 110 60 Z" fill={wing} />
			</g>
			<defs>
				<filter id="shadow" x="0" y="0" width="220" height="160">
					<feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.35)" />
				</filter>
			</defs>
		</svg>
	);
}

// DragonFlight - few large, slow-moving dragons to complement butterflies
export default function DragonFlight({ count = 1 }) {
	const dragons = useMemo(() => {
		return new Array(count).fill(0).map((_, i) => {
			const delay = Math.random() * 20;
			const duration = 45 + Math.random() * 40; // slower than butterflies
			const y = 10 + Math.random() * 70; // avoid extremes
			const amp = 12 + Math.random() * 20;
			const size = 120 + Math.round(Math.random() * 60);
			const hue = 120 + Math.round(Math.random() * 60); // green-ish
			return { id: i, delay, duration, y, amp, size, hue };
		});
	}, [count]);

	return (
		<div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
			{dragons.map((d, idx) => (
				<motion.div
					key={d.id}
					initial={{ x: idx % 2 === 0 ? '-30vw' : '130vw', y: `${d.y}vh`, opacity: 0 }}
					animate={{
						x: idx % 2 === 0 ? ['-30vw', '130vw'] : ['130vw', '-30vw'],
						opacity: [0, 0.9, 0.9, 0],
					}}
					transition={{ duration: d.duration, ease: 'linear', repeat: Infinity, delay: d.delay }}
					style={{ position: 'absolute' }}
				>
					<motion.div
						animate={{ y: [0, -d.amp, d.amp, 0], rotateZ: [-3, 3, -3] }}
						transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
						style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.35))' }}
					>
						<motion.div
							animate={{ scaleY: [1, 1.06, 1], scaleX: [1, 0.96, 1] }} // gentle wing beats
							transition={{ duration: 1.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
							style={{ originX: 0.5, originY: 0.5 }}
						>
							<Dragon size={d.size} hue={d.hue} />
						</motion.div>
					</motion.div>
				</motion.div>
			))}
		</div>
	);
}

