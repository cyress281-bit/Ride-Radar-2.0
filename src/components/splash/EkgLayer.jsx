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
          pathLength: [0, 0, 1, 1, 1, 1, 1],
          opacity: [0, 0, 1, 1, 1, 1, 0]
        }}
        transition={{
          duration: 3.45,
          times: [0, 0.08, 0.52, 0.62, 0.68, 0.72, 0.74],
          ease: 'easeInOut'
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
        animate={{ opacity: [0, 0, 0, 0.95, 0.24, 0.9, 0] }}
        transition={{
          duration: 3.45,
          times: [0, 0.54, 0.58, 0.62, 0.66, 0.7, 0.74],
          ease: 'easeInOut'
        }}
      />
    </>
  );
}
