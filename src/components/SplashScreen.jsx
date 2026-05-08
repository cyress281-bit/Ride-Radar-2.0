import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import EkgLayer from '@/components/splash/EkgLayer';
import FinalLogoResolve from '@/components/splash/FinalLogoResolve';

const SPLASH_ANIMATION_MS = 3450;
const SPLASH_READY_GRACE_MS = 6500;

export default function SplashScreen({ onComplete, isReady = true }) {
  const [animationDone, setAnimationDone] = useState(false);
  const [readyGraceElapsed, setReadyGraceElapsed] = useState(false);

  useEffect(() => {
    const animationTimer = setTimeout(() => setAnimationDone(true), SPLASH_ANIMATION_MS);
    const graceTimer = setTimeout(() => setReadyGraceElapsed(true), SPLASH_READY_GRACE_MS);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(graceTimer);
    };
  }, []);

  useEffect(() => {
    if (!animationDone || (!isReady && !readyGraceElapsed)) {
      return undefined;
    }

    const completeTimer = setTimeout(onComplete, 120);
    return () => clearTimeout(completeTimer);
  }, [animationDone, isReady, onComplete, readyGraceElapsed]);

  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
    >
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 opacity-[0.035] radar-grid" />

      <div className="relative w-[92vw] max-w-[760px] aspect-square bg-black">
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full overflow-visible bg-black">
          <defs>
            <filter id="splashNeonGlow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.45 0 0 0 0 1 0 0 0 0 0.08 0 0 0 0.85 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <EkgLayer />
        </svg>

        <FinalLogoResolve />
      </div>
    </motion.div>
  );
}
