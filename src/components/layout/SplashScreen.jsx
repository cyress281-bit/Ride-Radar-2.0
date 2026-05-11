import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const DURATION_MS = 2800;
const REDUCED_MS = 700;
const SAFETY_MS = 6000;
const FADE_MS = 400;

const EKG_PATH = 'M0 50 L20 50 L30 45 L40 55 L50 20 L65 80 L80 50 L100 50';

export default function SplashScreen({ visible, onComplete, isReady = true }) {
  const reduceMotion = useReducedMotion();
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return;
    const t1 = setTimeout(finish, reduceMotion ? REDUCED_MS : DURATION_MS);
    const t2 = setTimeout(finish, SAFETY_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [visible, reduceMotion, finish]);

  // Keep prop referenced for API compatibility and exhaustive-deps
  useEffect(() => {
    if (!isReady) return;
  }, [isReady]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE_MS / 1000, ease: 'easeInOut' }}
        >
          <motion.div
            className="relative w-48 h-48 flex items-center justify-center"
            animate={reduceMotion ? {} : {
              scale: [1, 1.05, 1, 1.03, 1],
              opacity: [0.8, 1, 0.8, 1, 0.8],
            }}
            transition={reduceMotion ? {} : {
              duration: 1.2, repeat: Infinity, ease: 'easeInOut',
            }}
          >
            <svg viewBox="0 0 100 100" fill="none" className="w-full h-full drop-shadow-[0_0_12px_hsl(var(--primary)/0.8)]">
              <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <motion.path
                d={EKG_PATH}
                stroke="#39FF14"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              />
            </svg>
          </motion.div>

          <motion.button
            onClick={finish}
            className={cn(
              'absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
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
