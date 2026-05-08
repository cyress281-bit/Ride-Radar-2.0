import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import EkgLayer from '@/components/splash/EkgLayer';
import FinalLogoResolve from '@/components/splash/FinalLogoResolve';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

const SPLASH_ANIMATION_MS = 3450;
const REDUCED_MOTION_SPLASH_MS = 900;
const SPLASH_READY_GRACE_MS = 6500;

export default function SplashScreen({ onComplete, isReady = true }) {
  const reduceMotion = useReducedMotion();
  const [animationDone, setAnimationDone] = useState(false);
  const [readyGraceElapsed, setReadyGraceElapsed] = useState(false);

  useEffect(() => {
    const logo = new Image();
    logo.src = RIDE_RADAR_LOGO_URL;
  }, []);

  useEffect(() => {
    const animationDuration = reduceMotion ? REDUCED_MOTION_SPLASH_MS : SPLASH_ANIMATION_MS;
    const animationTimer = setTimeout(() => setAnimationDone(true), animationDuration);
    const graceTimer = setTimeout(() => setReadyGraceElapsed(true), SPLASH_READY_GRACE_MS);

    return () => {
      clearTimeout(animationTimer);
      clearTimeout(graceTimer);
    };
  }, [reduceMotion]);

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
      transition={{ duration: reduceMotion ? 0.18 : 0.42, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 opacity-[0.04] radar-grid" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(57,255,20,0.08),transparent_34%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_18%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/18 to-transparent" />

      <div className="relative w-[92vw] max-w-[760px] aspect-square">
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full overflow-visible">
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
