import React from 'react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png';

export default function FinalLogoResolve() {
  return (
    <motion.img
      src={LOGO_URL}
      alt="Ride Radar"
      className="absolute inset-0 h-full w-full object-contain"
      style={{ transformOrigin: 'center center' }}
      initial={{ opacity: 0, scale: 0.985, filter: 'brightness(1) blur(0px)' }}
      animate={{
        opacity: [0, 0, 0, 1, 1, 1],
        scale: [0.985, 0.985, 0.985, 1.01, 1, 1],
        filter: [
          'brightness(1) blur(0px)',
          'brightness(1) blur(0px)',
          'brightness(1) blur(0px)',
          'brightness(1.35) blur(1px)',
          'brightness(1) blur(0px)',
          'brightness(1) blur(0px)'
        ]
      }}
      transition={{
        duration: 3.45,
        times: [0, 0.72, 0.74, 0.8, 0.9, 1],
        ease: 'easeInOut'
      }}
    />
  );
}
