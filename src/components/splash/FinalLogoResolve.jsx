import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

export default function FinalLogoResolve() {
  const reduceMotion = useReducedMotion();
  const baseClassName = 'absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_18px_rgba(57,255,20,0.28)] will-change-transform';

  if (reduceMotion) {
    return (
      <img
        src={RIDE_RADAR_LOGO_URL}
        alt="Ride Radar"
        className={baseClassName}
        loading="eager"
        decoding="async"
      />
    );
  }

  return (
    <motion.img
      src={RIDE_RADAR_LOGO_URL}
      alt="Ride Radar"
      className={baseClassName}
      style={{ transformOrigin: 'center center' }}
      loading="eager"
      decoding="async"
      initial={{ opacity: 0, scale: 0.965, y: 8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0
      }}
      transition={{
        delay: 2.5,
        type: 'spring',
        stiffness: 170,
        damping: 22,
        mass: 0.72
      }}
    />
  );
}
