import React from 'react';
import { Box } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';

// Floating blob animation
const float1 = keyframes`
  0% { transform: translateY(0px) translateX(0px) scale(1); }
  50% { transform: translateY(-20px) translateX(10px) scale(1.05); }
  100% { transform: translateY(0px) translateX(0px) scale(1); }
`;

const float2 = keyframes`
  0% { transform: translateY(0px) translateX(0px) scale(1); }
  50% { transform: translateY(15px) translateX(-10px) scale(1.03); }
  100% { transform: translateY(0px) translateX(0px) scale(1); }
`;

// Twinkle animation for stars
const twinkle = keyframes`
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 0.9; transform: scale(1.3); }
`;

export default function AnimeBackground() {
  return (
    <Box position="fixed" inset={0} zIndex={0} pointerEvents="none" overflow="hidden">
      {/* Gradient blobs */}
      <Box position="absolute" top="-10%" left="-10%" w="45vw" h="45vw" borderRadius="full"
           filter="blur(60px)" opacity={0.35}
           bgGradient="radial(brand.400, transparent 60%)"
           animation={`${float1} 12s ease-in-out infinite`} />

      <Box position="absolute" bottom="-12%" right="-8%" w="50vw" h="50vw" borderRadius="full"
           filter="blur(70px)" opacity={0.3}
           bgGradient="radial(cyan.300, transparent 60%)"
           animation={`${float2} 16s ease-in-out infinite`} />

      {/* Twinkling stars */}
      {[...Array(20)].map((_, i) => (
        <Box key={i}
             position="absolute"
             top={`${Math.random() * 100}%`}
             left={`${Math.random() * 100}%`}
             w="6px" h="6px" borderRadius="full"
             bg="whiteAlpha.800"
             boxShadow="0 0 12px rgba(255,255,255,0.8)"
             opacity={0.5}
             animation={`${twinkle} ${6 + Math.random() * 6}s ease-in-out ${Math.random() * 3}s infinite`} />
      ))}
    </Box>
  );
}
