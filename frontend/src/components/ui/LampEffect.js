import React from 'react';
import { Box, useColorModeValue } from '@chakra-ui/react';
import { motion, useMotionTemplate, useMotionValue, useSpring } from 'framer-motion';

// LampContainer: Wrap a hero section to add an interactive "lamp" spotlight background.
export default function LampContainer({ children, height = '82vh', radius = 260 }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 28, mass: 0.2 });
  const sy = useSpring(y, { stiffness: 200, damping: 28, mass: 0.2 });

  const isDark = useColorModeValue(false, true);

  const lampBg = useMotionTemplate`radial-gradient(${radius}px ${radius}px at ${sx}px ${sy}px, ${
    isDark ? 'rgba(124, 58, 237, 0.45)' : 'rgba(99, 102, 241, 0.35)'
  } 0%, rgba(0,0,0,0) 65%)`;

  const onMove = (e) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX);
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY);
    if (clientX == null || clientY == null) return;
    x.set(clientX - rect.left);
    y.set(clientY - rect.top);
  };

  return (
  <Box position="relative" overflow="hidden" onMouseMove={onMove} onTouchMove={onMove} h={height} w="full">
      {/* Subtle base gradients */}
      <Box
        position="absolute"
        inset={0}
        bgGradient={
          isDark
            ? 'radial( at 20% 20%, rgba(124,58,237,0.22), rgba(0,0,0,0) 60% ), radial( at 80% 40%, rgba(6,182,212,0.18), rgba(0,0,0,0) 60% )'
            : 'radial( at 20% 20%, rgba(99,102,241,0.18), rgba(255,255,255,0) 60% ), radial( at 80% 40%, rgba(34,197,94,0.14), rgba(255,255,255,0) 60% )'
        }
        filter="blur(42px)"
        opacity={0.75}
        zIndex={0}
        pointerEvents="none"
      />

      {/* Interactive lamp following cursor */}
      <motion.div
        style={{ position: 'absolute', inset: 0, background: lampBg, filter: 'blur(70px)', mixBlendMode: 'screen', pointerEvents: 'none', zIndex: 1 }}
      />

      {/* Content */}
      <Box position="relative" zIndex={2}>
        {children}
      </Box>

      {/* Soft vignette to focus center */}
      <Box position="absolute" inset={0} bgGradient={
        isDark ? 'radial( circle at 50% 40%, rgba(255,255,255,0.05), rgba(0,0,0,0) 45% )' : 'radial( circle at 50% 40%, rgba(0,0,0,0.05), rgba(255,255,255,0) 45% )'
      } pointerEvents="none" zIndex={1} />
    </Box>
  );
}
