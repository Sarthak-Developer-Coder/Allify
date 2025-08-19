import React, { useEffect, useMemo, useState } from 'react';
import { Box } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';

const MotionBox = motion(Box);

// Read list from localStorage (array of URL strings)
function useAnimeImages() {
  const [list, setList] = useState(() => {
    try {
      const raw = localStorage.getItem('animeImages');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  useEffect(() => {
    const onChange = () => {
      try {
        const raw = localStorage.getItem('animeImages');
        const arr = raw ? JSON.parse(raw) : [];
        setList(Array.isArray(arr) ? arr : []);
      } catch {}
    };
    window.addEventListener('anime-images-change', onChange);
    return () => window.removeEventListener('anime-images-change', onChange);
  }, []);
  return list.filter(Boolean);
}

export default function AnimeImageBackground() {
  const images = useAnimeImages();
  const enabled = images.length > 0;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 15000);
    return () => clearInterval(id);
  }, [enabled, images.length]);

  // Preload
  useEffect(() => {
    images.forEach((src) => { const img = new Image(); img.src = src; });
  }, [images]);

  const current = useMemo(() => images[idx], [images, idx]);

  if (!enabled) return null;

  return (
    <Box position="fixed" inset={0} zIndex={0} pointerEvents="none" overflow="hidden">
      <AnimatePresence mode="wait">
        <MotionBox
          key={current}
          position="absolute"
          inset={0}
          bgImage={`url('${current}')`}
          bgPos="center"
          bgSize="cover"
          bgRepeat="no-repeat"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2 }}
          filter="brightness(0.9)"
        />
      </AnimatePresence>
      {/* Legibility overlay */}
      <Box position="absolute" inset={0} bgGradient="linear(to-b, blackAlpha.300, transparent 20%, transparent 70%, blackAlpha.300)" />
    </Box>
  );
}
