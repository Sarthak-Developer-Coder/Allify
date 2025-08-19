import React, { useCallback } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

// SparklesCore - lightweight particles background (Aceternity-like)
export const SparklesCore = ({
  id = 'tsparticles',
  background = 'transparent',
  minSize = 0.6,
  maxSize = 1.4,
  particleDensity = 100,
  particleColor = '#FFFFFF',
  className,
}) => {
  const particlesInit = useCallback(async (engine) => {
    // load the slim bundle for smaller size
    await loadSlim(engine);
  }, []);

  return (
    <Particles
      id={id}
      init={particlesInit}
      className={className}
      options={{
        background: { color: { value: background } },
        fullScreen: { enable: false },
        fpsLimit: 60,
        detectRetina: true,
        particles: {
          number: {
            value: particleDensity,
            density: { enable: true, area: 800 },
          },
          color: { value: particleColor },
          shape: { type: 'circle' },
          opacity: {
            value: 0.8,
            animation: { enable: true, speed: 0.6, minimumValue: 0.2, startValue: 'random' },
          },
          size: {
            value: { min: minSize, max: maxSize },
          },
          move: {
            enable: true,
            speed: 0.4,
            direction: 'none',
            random: true,
            straight: false,
            outModes: { default: 'out' },
          },
          links: { enable: false },
        },
        interactivity: {
          events: { onHover: { enable: false }, resize: true },
        },
      }}
    />
  );
};
