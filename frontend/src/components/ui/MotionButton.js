import React from 'react';
import { Button } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MButton = motion(Button);

export default function MotionButton({ children, ...props }) {
  return (
    <MButton
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ y: 6, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      {...props}
    >
      {children}
    </MButton>
  );
}
