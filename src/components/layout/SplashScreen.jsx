import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

const SPLASH_ANIMATION_MS = 3200;
const REDUCED_MOTION_MS = 700;
const READY_GRACE_MS = 6000;

const NEON_GREEN = '#39ff14';

/* ────────────────────────────────────────────────────────────────
   Motorcycle silhouette SVG — sport bike matching logo style
   ViewBox 0 0 320 120
   ──────────────────────────────────────────────────────────────── */
function MotorcycleSVG({ className }) {
  return (
    <svg
      viewBox="0 0 320 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g>
        {/* Rear wheel outer ring */}
        <circle cx="58" cy="84" r="19" stroke={NEON_GREEN} strokeWidth="8" fill="none" />
        {/* Rear wheel hub */}
        <circle cx="58" cy="84" r="7" fill={NEON_GREEN} />

        {/* Front wheel outer ring */}
        <circle cx="258" cy="84" r="19" stroke={NEON_GREEN} strokeWidth="8" fill="none" />
        {/* Front wheel hub */}
        <circle cx="258" cy="84" r="7" fill={NEON_GREEN} />

        {/* Main body — sleek sport-bike silhouette */}
        <path
          d="M58 84
             C53 79 49 73 48 66
             C47 59 50 52 56 46
             C62 40 71 36 82 35
             C93 34 104 35 115 36
             C126 37 137 38 148 39
             C159 40 170 40 181 39
             C192 38 203 37 214 36
             C225 35 236 36 245 40
             C254 44 261 51 265 60
             C269 69 269 79 265 88
             C261 97 254 104 245 108
             C236 112 225 112 216 108
             L203 100
             C198 97 193 94 188 92
             L169 86
             C164 84 159 84 154 85
             L135 89
             C130 90 125 92 120 95
             L105 103
             C100 106 95 108 90 108
             C85 108 80 106 76 102
             C72 98 70 93 70 87
             C70 81 72 75 77 70
             C82 65 89 62 97 61
             C105 60 113 61 121 63
             L135 67
             C140 68 145 69 150 69
             L165 69
             C170 69 175 68 180 67
             L195 64
             C200 63 205 62 210 62
             L225 62
             C230 62 235 63 240 65
             L255 70
             C260 72 265 75 269 79
             C273 83 275 88 275 94
             C275 100 272 106 267 110
             C262 114 256 116 250 115
             C244 114 239 111 234 107
             L224 98
             C220 94 216 91 212 89
             L197 83
             C193 81 189 81 185 82
             L170 86
             C166 87 162 89 158 91
             L145 98
             C141 100 137 102 133 102
             C129 102 125 100 121 97
             C117 94 115 89 115 84
             C115 79 117 74 121 70"
          fill={NEON_GREEN}
        />

        {/* Windscreen / front fairing top */}
        <path
          d="M214 36
             C222 30 232 27 242 28
             C252 29 260 35 264 43
             C268 51 266 59 260 65
             C254 71 246 72 238 70
             L228 66
             C224 64 220 61 217 57
             L211 49
             C209 45 208 41 209 37
             L210 35"
          fill={NEON_GREEN}
        />

        {/* Tail section */}
        <path
          d="M58 84
             C52 80 46 76 41 71
             C36 66 33 61 33 55
             C33 49 37 44 43 41
             C49 38 56 39 63 42
             L73 48
             C78 51 82 55 85 60
             L88 68
             C90 73 89 78 86 82
             L82 86
             C78 89 73 90 68 88
             L62 86"
          fill={NEON_GREEN}
        />
      </g>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────
   EKG / heartbeat trail SVG
   Matches the logo waveform: flat → small wave → big spike → flat
   ──────────────────────────────────────────────────────────────── */
function EKGSVG({ className }) {
  return (
    <svg
      viewBox="0 0 420 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0 60 H50 L60 52 L72 68 L88 15 L108 105 L124 50 L140 70 L156 60 H220"
        stroke={NEON_GREEN}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * SplashScreen — Premium boot animation with motorcycle drive + EKG pulse.
 *
 * Animation sequence (≈3.2 s):
 *  Phase 1 (0–0.9 s): Motorcycle enters from left, drives across screen,
 *                      leaving a neon trail that draws itself.
 *  Phase 2 (0.9–1.8 s): Bike exits right; trail morphs into EKG heartbeat
 *                        and pulses with neon glow.
 *  Phase 3 (1.6–2.6 s): Full logo (motorcycle + EKG) fades in centered
 *                        with a strong neon glow.
 *  Phase 4 (2.6–3.2 s): Entire splash fades out to reveal the app.
 *
 * Respects prefers-reduced-motion — shows a static centered logo.
 * Keeps skip button, scanline effects, HUD details, progress bar.
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

  /* ── Reduced motion: static centered logo ── */
  if (reduceMotion) {
    return (
      <AnimatePresence>
        {!skipped && (
          <motion.div
            key="splash"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="relative w-[60vw] max-w-[280px] aspect-square flex items-center justify-center">
              <img
                src={RIDE_RADAR_LOGO_URL}
                alt="Ride Radar"
                className="h-full w-full object-contain drop-shadow-[0_0_20px_hsl(var(--primary)/0.35)]"
                loading="eager"
                decoding="async"
              />
            </div>
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
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              Skip
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

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
          }}
        >
          {/* ── Background layers ── */}
          <div className="absolute inset-0 bg-black" />
          <div className="absolute inset-0 opacity-[0.04] radar-grid" aria-hidden="true" />
          <div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_34%),radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.04),transparent_18%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-primary/18 to-transparent"
            aria-hidden="true"
          />

          {/* ── Scanline + sweep effect ── */}
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

          {/* ═══════════════════════════════════════════════════════════
              ANIMATION STAGE
              ═══════════════════════════════════════════════════════════ */}
          <div className="relative z-10 w-full h-full flex items-center justify-center">
            {/* Phase 1 & 2: Driving motorcycle + trail */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              initial={{ opacity: 1 }}
              animate={{ opacity: [1, 1, 0] }}
              transition={{
                duration: 2.2,
                times: [0, 0.75, 1],
                ease: 'easeInOut',
              }}
            >
              {/* EKG Trail — draws itself as the bike moves */}
              <div className="absolute w-[90vw] max-w-[700px] h-[120px] flex items-center">
                <motion.div
                  className="w-full h-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 1, 1, 0.6, 0] }}
                  transition={{
                    duration: 2.0,
                    times: [0, 0.1, 0.4, 0.6, 0.85, 1],
                    ease: 'easeInOut',
                  }}
                >
                  <svg
                    viewBox="0 0 900 120"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <filter id="trailGlow" x="-20%" y="-50%" width="140%" height="200%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    {/* The EKG trail path */}
                    <motion.path
                      d="M0 60 H150 L165 48 L180 72 L205 8 L235 112 L260 45 L285 75 L310 60 H450 L465 52 L480 68 L500 20 L525 100 L545 55 L565 70 L580 60 H900"
                      stroke={NEON_GREEN}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      filter="url(#trailGlow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{
                        pathLength: [0, 0.45, 1],
                        opacity: [0, 1, 1, 0.8, 0],
                      }}
                      transition={{
                        pathLength: {
                          duration: 1.4,
                          times: [0, 0.5, 1],
                          ease: 'easeInOut',
                        },
                        opacity: {
                          duration: 2.0,
                          times: [0, 0.15, 0.5, 0.8, 1],
                          ease: 'easeInOut',
                        },
                      }}
                    />
                  </svg>
                </motion.div>
              </div>

              {/* Motorcycle that drives across */}
              <motion.div
                className="absolute w-[180px] h-[68px] will-change-transform"
                style={{ left: '50%', top: '50%', marginTop: '-10px' }}
                initial={{ x: '-55vw', opacity: 0 }}
                animate={{
                  x: ['-55vw', '-10vw', '55vw'],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  duration: 1.8,
                  times: [0, 0.15, 0.75, 1],
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
              >
                <MotorcycleSVG className="w-full h-full drop-shadow-[0_0_16px_hsl(var(--primary)/0.9)]" />
              </motion.div>

              {/* EKG Pulse overlay (appears after bike passes) */}
              <motion.div
                className="absolute w-[90vw] max-w-[700px] h-[120px] flex items-center justify-center"
                initial={{ opacity: 0, scaleY: 0.3 }}
                animate={{
                  opacity: [0, 0, 1, 1, 0.6, 0],
                  scaleY: [0.3, 0.3, 1, 1.15, 1.05, 0.8],
                }}
                transition={{
                  duration: 2.2,
                  times: [0, 0.45, 0.55, 0.7, 0.85, 1],
                  ease: 'easeInOut',
                }}
              >
                <EKGSVG className="w-full h-full drop-shadow-[0_0_20px_hsl(var(--primary)/0.9)]" />
              </motion.div>
            </motion.div>

            {/* Phase 3: Full logo centered with neon glow */}
            <motion.div
              className="relative flex flex-col items-center gap-8 px-6"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{
                opacity: [0, 0, 1, 1, 0],
                scale: [0.85, 0.85, 1, 1, 0.95],
              }}
              transition={{
                duration: 2.6,
                times: [0, 0.55, 0.7, 0.92, 1],
                ease: 'easeInOut',
              }}
            >
              {/* Ambient glow ring behind logo */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/5"
                animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />

              <div className="relative w-[72vw] max-w-[360px] aspect-square flex items-center justify-center">
                <motion.img
                  src={RIDE_RADAR_LOGO_URL}
                  alt="Ride Radar"
                  className="relative h-full w-full object-contain drop-shadow-[0_0_32px_hsl(var(--primary)/0.55)] will-change-transform"
                  loading="eager"
                  decoding="async"
                />
              </div>

              {/* Boot text + progress */}
              <motion.div
                className="flex flex-col items-center gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 2.2,
                  times: [0, 0.2, 0.7, 1],
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
            </motion.div>
          </div>

          {/* ── Bottom HUD details ── */}
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
                    duration: 2.8,
                    ease: 'easeInOut',
                  }}
                />
              </span>
              <span className="text-[9px] font-mono text-primary/50">SYS.OK</span>
            </div>
          </div>

          {/* ── Skip button ── */}
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
