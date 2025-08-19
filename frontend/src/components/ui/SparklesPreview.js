import React from 'react';
import { Box, Heading } from '@chakra-ui/react';
import { SparklesCore } from './sparkles';

export function SparklesPreview() {
  return (
    <Box position="relative" h={{ base: '60vh', md: '70vh' }} w="full" overflow="hidden" rounded="md" bg="black">
      <Box position="absolute" inset={0}>
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.4}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </Box>
      <Box position="relative" zIndex={1} display="flex" alignItems="center" justifyContent="center" h="100%">
        <Heading as="h1" size={{ base: '2xl', md: '3xl' }} color="white" textAlign="center">
          Build great products
        </Heading>
      </Box>
    </Box>
  );
}
