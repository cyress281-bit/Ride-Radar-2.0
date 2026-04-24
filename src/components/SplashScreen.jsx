import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

const LOGO_URL = 'https://media.base44.com/images/public/69eaf617762119e163948021/010dd6122_Neonheartbeatmotorcyclelogo.png';
const EKG_PATH = 'M92 520 H220 L242 486 L285 560 L338 330 L402 670 L452 456 L474 520 H640';

function MotorcycleShape() {
  return (
    <g filter="url(#neonGlow)">
      <circle cx="62" cy="78" r="46" fill="none" stroke="#7CFF22" strokeWidth="18" />
      <circle cx="268" cy="78" r="46" fill="none" stroke="#7CFF22" strokeWidth="18" />
      <path
        d="M58 78 L122 112 L96 132 L32 92 Z M100 66 L158 24 L245 18 L300 60 L254 72 L198 90 L126 86 Z M142 24 L104 0 L178 4 L190 26 Z M244 18 L284 -10 L322 14 L302 60 Z M118 112 H248 L198 90 L126 86 Z M268 78 L244 38 M62 78 L94 42"
        fill="#7CFF22"
        stroke="#7CFF22"
        strokeWidth="12"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M120 112 H250" stroke="#7CFF22" strokeWidth="18" strokeLinecap="round" />
    </g>
  );
}

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    const done = setTimeout(() => onComplete(), 3850);
    return () => clearTimeout(done);
  }, [onComplete]);

  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <div className="relative w-[92vw] max-w-[760px] aspect-square bg-black">
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full overflow-visible bg-black">
          <defs>
            <filter id="neonGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.45 0 0 0 0 1 0 0 0 0 0.08 0 0 0 0.9 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <motion.path
            d={EKG_PATH}
            fill="none"
            stroke="#7CFF22"
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 0, 1, 1, 1, 1], opacity: [0, 0, 1, 1, 1, 0] }}
            transition={{ duration: 3.55, times: [0, 0.08, 0.56, 0.72, 0.86, 1], ease: 'easeInOut' }}
          />

          <motion.path
            d={EKG_PATH}
            fill="none"
            stroke="#B8FF55"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0, 0, 1, 0.22, 1, 0] }}
            transition={{ duration: 3.55, times: [0, 0.58, 0.62, 0.68, 0.74, 0.8, 1], ease: 'easeInOut' }}
          />

          <motion.g
            initial={{ x: -360, y: 442, opacity: 0 }}
            animate={{ x: [-360, -360, 636, 636, 636, 636], y: 442, opacity: [0, 1, 1, 1, 1, 0] }}
            transition={{ duration: 3.55, times: [0, 0.08, 0.56, 0.72, 0.86, 1], ease: [0.2, 0.9, 0.2, 1] }}
          >
            <MotorcycleShape />
          </motion.g>
        </svg>

        <motion.img
          src={LOGO_URL}
          alt="Ride Radar"
          className="absolute inset-0 h-full w-full object-contain"
          initial={{ opacity: 0, scale: 1, filter: 'brightness(1) blur(0px)' }}
          animate={{
            opacity: [0, 0, 0, 0, 1, 1, 0],
            scale: [1, 1, 1, 1, 1.01, 1, 1],
            filter: [
              'brightness(1) blur(0px)',
              'brightness(1) blur(0px)',
              'brightness(1) blur(0px)',
              'brightness(1) blur(0px)',
              'brightness(1.35) blur(1px)',
              'brightness(1) blur(0px)',
              'brightness(0.85) blur(0px)'
            ]
          }}
          transition={{ duration: 3.55, times: [0, 0.56, 0.62, 0.72, 0.78, 0.88, 1], ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}