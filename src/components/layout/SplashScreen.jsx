import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

const SPLASH_ANIMATION_MS = 3200;
const REDUCED_MOTION_MS = 700;
const READY_GRACE_MS = 6000;

/**
 * SplashScreen — Boot animation with brand logo and EKG pulse.
 *
 * Displays a full-screen HUD-style boot sequence:
 * - Centered logo with neon pulse glow animation
 * - Progress bar indicating load status
 * - HUD details: "Initializing...", version number, system status
 * - Skip button for users with reduced-motion preference
 * - Respects prefers-reduced-motion automatically
 *
 * @param {Object} props
 * @param {boolean} [props.isReady=true] — Whether app data has finished loading
 * @param {() => void} props.onComplete — Callback when splash should dismiss
 * @returns {JSX.Element | null}
 */
export default function SplashScreen({ onComplete, isReady = true }) {
  const reduceMotion = useReducedMotion();
  const [animationDone, setAnimationDone] = useState(false);
  const [readyGraceElapsed, setReadyGraceElapsed] = useState(false);
  const [skipped, setSkipped] = useState(false);

  // Preload logo asset
  useEffect(() => {
    const img = new Image();
    img.src = RIDE_RADAR_LOGO_URL;
  }, []);

  // Animation timers
  useEffect(() => {
    const duration = reduceMotion ? REDUCED_MOTION_MS : SPLASH_ANIMATION_MS;
    const animTimer = setTimeout(() => setAnimationDone(true), duration);
    const graceTimer = setTimeout(() => setReadyGraceElapsed(true), READY_GRACE_MS);

    return () => {
      clearTimeout(animTimer);
      clearTimeout(graceTimer);
    };
  }, [reduceMotion]);

  // Complete when animation done AND (app ready OR grace period elapsed)
  useEffect(() => {
    if (skipped) {
      const t = setTimeout(onComplete, 120);
      return () => clearTimeout(t);
    }
    if (!animationDone || (!isReady && !readyGraceElapsed)) {
      return undefined;
    }
    const t = setTimeout(onComplete, 120);
    return () => clearTimeout(t);
  }, [animationDone, isReady, readyGraceElapsed, skipped, onComplete]);

  const handleSkip = useCallback(() => {
    setSkipped(true);
  }, []);

  return (
    <AnimatePresence>
      {!skipped && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 180,
            damping: 28,
            mass: 0.9,
            duration: reduceMotion ? 0.18 : undefined,
          }}
        >
          {/* Background layers */}
          <div className="absolute inset-0 bg-black" />
          <div className="absolute inset-0 opacity-[0.04] radar-grid" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(57,255,20,0.08),transparent_34%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_18%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/18 to-transparent"
            aria-hidden="true"
          />

          {/* Scanline + sweep effect (motion only) */}
          {!reduceMotion && (
            <>
              <div
                className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.35)_3px)] pointer-events-none z-[1]"
                aria-hidden="true"
              />
              <motion.div
                className="absolute inset-x-0 h-[3px] bg-primary/30 blur-[2px] pointer-events-none z-[2]"
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                  repeat: Infinity,
                  repeatDelay: 0.4,
                }}
              />
            </>
          )}

          {/* Central content */}
          <div className="relative z-10 flex flex-col items-center gap-8 px-6">
            {/* Logo with neon glow pulse */}
            <div className="relative w-[72vw] max-w-[360px] aspect-square flex items-center justify-center">
              {/* Ambient glow ring */}
              {!reduceMotion && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary/5"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              <motion.img
                src={RIDE_RADAR_LOGO_URL}
                alt="Ride Radar"
                className="relative h-full w-full object-contain drop-shadow-[0_0_28px_rgba(57,255,20,0.35)] will-change-transform"
                loading="eager"
                decoding="async"
                initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0.2 }
                    : {
                        delay: 0.3,
                        type: 'spring',
                        stiffness: 140,
                        damping: 20,
                        mass: 0.8,
                      }
                }
              />
            </div>

            {/* Boot text + progress */}
            {!reduceMotion && (
              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 2.8,
                  times: [0, 0.15, 0.7, 1],
                  ease: 'easeInOut',
                }}
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
          </div>

          {/* Bottom HUD details */}
          <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between pointer-events-none z-10">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary/40">
                Ride Radar
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50">
                v{import.meta.env.VITE_APP_VERSION || '2.0.0'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {/* Progress bar */}
              <span className="h-1.5 w-10 rounded-full bg-primary/20 overflow-hidden">
                <motion.span
                  className="block h-full bg-primary rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{
                    duration: reduceMotion ? 0.4 : 2.8,
                    ease: 'easeInOut',
                  }}
                />
              </span>
              <span className="text-[9px] font-mono text-primary/50">SYS.OK</span>
            </div>
          </div>

          {/* Skip button (reduced motion or anytime) */}
          <motion.button
            onClick={handleSkip}
            className={cn(
              'absolute top-4 right-4 z-20',
              'px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
              'border border-primary/20 text-primary/60 hover:text-primary hover:border-primary/40',
              'bg-background/50 backdrop-blur-sm transition-colors'
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            Skip
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
