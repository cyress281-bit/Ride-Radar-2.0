import React, { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import EkgLayer from '@/components/splash/EkgLayer';
import FinalLogoResolve from '@/components/splash/FinalLogoResolve';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

const SPLASH_ANIMATION_MS = 3300;
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
      transition={{ type: 'spring', stiffness: 180, damping: 28, mass: 0.9, duration: reduceMotion ? 0.18 : undefined }}
    >
      {/* Base layers */}
      <div className="absolute inset-0 bg-black" />
      <div className="absolute inset-0 opacity-[0.04] radar-grid" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(57,255,20,0.08),transparent_34%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_18%)]" />
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/18 to-transparent" />

      {/* Heart-monitor boot scanlines */}
      {!reduceMotion && (
        <>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.35)_3px)] pointer-events-none z-[1]" />
          <motion.div
            className="absolute inset-x-0 h-[3px] bg-primary/30 blur-[2px] pointer-events-none z-[2]"
            initial={{ top: '0%' }}
            animate={{ top: '100%' }}
            transition={{ duration: 2.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 0.4 }}
          />
        </>
      )}

      {/* Central logo + EKG container */}
      <div className="relative aspect-square w-[88vw] max-w-[430px] sm:max-w-[520px]">
        <svg viewBox="0 0 1024 1024" className="absolute inset-0 h-full w-full overflow-visible">
          <defs>
            <filter id="splashNeonGlow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="4.5" result="blur" />
              <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.45 0 0 0 0 1 0 0 0 0 0.08 0 0 0 0.85 0" />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <EkgLayer />
        </svg>

        {/* Boot sequence text */}
        {!reduceMotion && (
          <motion.div
            className="absolute inset-x-0 bottom-[12%] flex flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.8, times: [0, 0.15, 0.7, 1], ease: 'easeInOut' }}
          >
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_hsl(var(--primary))]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary/70">
                Initializing systems
              </span>
            </div>
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </motion.div>
        )}

        <FinalLogoResolve />
      </div>

      {/* Bottom corner HUD details */}
      <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/40">Ride Radar</span>
          <span className="text-[9px] font-mono text-muted-foreground/50">v2.0.0</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-8 rounded-full bg-primary/20 overflow-hidden">
            <motion.span
              className="block h-full bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.8, ease: 'easeInOut' }}
            />
          </span>
          <span className="text-[9px] font-mono text-primary/50">SYS.OK</span>
        </div>
      </div>
    </motion.div>
  );
}
