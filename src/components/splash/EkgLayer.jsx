import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const EKG_PATH = 'M102 534 H226 L248 498 L292 574 L344 348 L408 684 L458 470 L480 534 H650';

export default function EkgLayer() {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return null;
  }

  return (
    <>
      <motion.path
        d={EKG_PATH}
        fill="none"
        stroke="#7CFF22"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#splashNeonGlow)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: [0, 1, 1, 0]
        }}
        transition={{
          pathLength: { delay: 0.2, type: 'spring', stiffness: 72, damping: 18, mass: 0.85 },
          opacity: { duration: 2.55, times: [0, 0.1, 0.82, 1], ease: [0.22, 1, 0.36, 1] }
        }}
      />
      <motion.path
        d={EKG_PATH}
        fill="none"
        stroke="#B8FF55"
        strokeWidth="24"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#splashNeonGlow)"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.72, 0.18, 0.54, 0] }}
        transition={{
          duration: 1.08,
          delay: 1.68,
          times: [0, 0.22, 0.48, 0.68, 1],
          ease: [0.22, 1, 0.36, 1]
        }}
      />
    </>
  );
}
