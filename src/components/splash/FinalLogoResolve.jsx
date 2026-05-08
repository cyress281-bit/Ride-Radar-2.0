import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

export default function FinalLogoResolve() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <img
        src={RIDE_RADAR_LOGO_URL}
        alt="Ride Radar"
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_18px_rgba(57,255,20,0.28)]"
        loading="eager"
        decoding="async"
      />
    );
  }

  return (
    <motion.img
      src={RIDE_RADAR_LOGO_URL}
      alt="Ride Radar"
      className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_18px_rgba(57,255,20,0.28)]"
      style={{ transformOrigin: 'center center' }}
      loading="eager"
      decoding="async"
      initial={{ opacity: 0, scale: 0.992, filter: 'brightness(0.92) saturate(1)' }}
      animate={{
        opacity: [0, 0, 0, 1, 1, 1],
        scale: [0.992, 0.992, 0.992, 1.006, 1, 1],
        filter: [
          'brightness(0.92) saturate(1)',
          'brightness(0.92) saturate(1)',
          'brightness(0.92) saturate(1)',
          'brightness(1.16) saturate(1.18)',
          'brightness(1.03) saturate(1.08)',
          'brightness(1) saturate(1)'
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
