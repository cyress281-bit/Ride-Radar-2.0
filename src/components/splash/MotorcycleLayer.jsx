import React from 'react';
import { motion } from 'framer-motion';

export default function MotorcycleLayer() {
  return (
    <motion.g
      initial={{ x: -360, y: 438, opacity: 0 }}
      animate={{
        x: [-360, -310, 560, 560, 560, 560],
        opacity: [0, 1, 1, 1, 1, 0],
        filter: [
          'blur(0px)',
          'blur(0px)',
          'blur(0px)',
          'blur(0px)',
          'blur(0px)',
          'blur(1px)'
        ]
      }}
      transition={{
        duration: 3.45,
        times: [0, 0.08, 0.52, 0.66, 0.72, 0.74],
        ease: [0.22, 1, 0.36, 1]
      }}
    >
      <g filter="url(#splashNeonGlow)">
        <circle cx="72" cy="96" r="48" fill="none" stroke="#7CFF22" strokeWidth="16" />
        <circle cx="282" cy="96" r="48" fill="none" stroke="#7CFF22" strokeWidth="16" />
        <path
          d="M70 96 L126 124 L98 144 L38 108 Z M108 82 L166 38 L250 32 L318 78 L278 88 L206 104 L132 102 Z M164 38 L124 12 L190 14 L204 40 Z M248 32 L294 0 L334 26 L318 78 Z M132 102 L206 104 L252 124 H120 Z M282 96 L252 52 M72 96 L104 56 M198 28 L224 10"
          fill="none"
          stroke="#7CFF22"
          strokeWidth="18"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M124 124 H252" stroke="#7CFF22" strokeWidth="18" strokeLinecap="round" />
        <path d="M-78 108 H34" stroke="#7CFF22" strokeWidth="8" strokeLinecap="round" opacity="0.22" />
      </g>
    </motion.g>
  );
}