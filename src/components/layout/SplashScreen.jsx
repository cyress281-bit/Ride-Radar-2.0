import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

const NEON = 'hsl(var(--primary))';
const GRID = 'hsl(var(--surface))';
const TOTAL = 3200;
const SAFETY = 5000;
const FADE = 400;
const EKG_PATH = 'M0 60 L50 60 L58 54 L66 66 L74 60 L82 55 L90 65 L100 10 L120 100 L140 60 L300 60';
const LINES = ['RIDE RADAR v2.0', 'ESTABLISHING UPLINK...', 'PULSE DETECTED'];

export default function SplashScreen({ visible, onComplete, isReady = true }) {
  const reduceMotion = useReducedMotion();
  const doneRef = useRef(false);
  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState(['', '', '']);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!isReady) return;
  }, [isReady]);

  useEffect(() => {
    if (!visible) return;
    if (reduceMotion) {
      const t = setTimeout(finish, 700);
      const s = setTimeout(finish, SAFETY);
      return () => { clearTimeout(t); clearTimeout(s); };
    }
    const timers = [
      setTimeout(() => setPhase(1), 0),
      setTimeout(() => setPhase(2), 400),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2200),
      setTimeout(() => setPhase(5), 2800),
      setTimeout(finish, TOTAL),
      setTimeout(finish, SAFETY),
    ];
    return () => timers.forEach(clearTimeout);
  }, [visible, reduceMotion, finish]);

  useEffect(() => {
    if (phase < 3) return;
    let line = 0, char = 0;
    const iv = setInterval(() => {
      if (line >= LINES.length) { clearInterval(iv); return; }
      setTyped(prev => {
        const next = [...prev];
        next[line] = LINES[line].slice(0, char + 1);
        return next;
      });
      char++;
      if (char >= LINES[line].length) { line++; char = 0; }
    }, 18);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[100] bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: FADE / 1000, ease: 'easeInOut' }}
        >
          {reduceMotion ? (
            <div className="flex items-center justify-center w-full h-full">
              <span className="font-mono text-xl tracking-[0.2em]" style={{ color: NEON }}>RIDE RADAR</span>
            </div>
          ) : (
            <motion.div
              className="relative w-full h-full flex flex-col items-center justify-center"
              animate={phase >= 5 ? { scale: 0.15, opacity: 0 } : { scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
              <div className="relative w-[300px] h-[120px]">
                <svg viewBox="0 0 300 120" className="w-full h-full" style={{ overflow: 'visible' }}>
                  <defs>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <motion.g
                    initial={{ opacity: 0 }}
                    animate={{ opacity: phase >= 1 ? (phase >= 4 ? 0.55 : 0.3) : 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {Array.from({ length: 6 }, (_, i) => (
                      <line key={`h${i}`} x1="0" y1={i * 20 + 10} x2="300" y2={i * 20 + 10} stroke={GRID} strokeWidth="1" />
                    ))}
                    {Array.from({ length: 10 }, (_, i) => (
                      <line key={`v${i}`} x1={i * 30 + 15} y1="0" x2={i * 30 + 15} y2="120" stroke={GRID} strokeWidth="1" />
                    ))}
                  </motion.g>

                  <motion.circle
                    cx="150" cy="60" r="2"
                    fill={NEON}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={phase >= 1 ? { opacity: [0.5, 1, 0.5], scale: 1 } : {}}
                    transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  <motion.g
                    animate={phase >= 4 ? { scaleY: 1.35 } : { scaleY: 1 }}
                    transition={{ duration: 0.3 }}
                    style={{ transformOrigin: 'center' }}
                  >
                    <motion.path
                      d={EKG_PATH}
                      fill="none"
                      stroke={NEON}
                      strokeWidth={phase >= 4 ? 2.5 : 1.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={phase >= 2 ? { pathLength: 1, opacity: 1 } : {}}
                      transition={{ duration: 1.2, ease: 'linear', repeat: Infinity, repeatDelay: 0.4 }}
                    />
                  </motion.g>

                  {phase >= 2 && (
                    <motion.line
                      x1="0" y1="0" x2="0" y2="120"
                      stroke={NEON}
                      strokeOpacity={0.25}
                      strokeWidth="1"
                      animate={{ x: [0, 300] }}
                      transition={{ duration: 1.2, ease: 'linear', repeat: Infinity, repeatDelay: 0.4 }}
                    />
                  )}
                </svg>
              </div>

              <div
                className="mt-6 h-20 flex flex-col items-center justify-start gap-1 font-mono text-[11px] tracking-wider"
                style={{ color: NEON, textShadow: '0 0 8px hsl(var(--primary) / 0.5)' }}
              >
                {typed.map((t, i) => (
                  <motion.div
                    key={i}
                    className="flex items-center"
                    animate={{ opacity: phase >= 4 ? 0 : t ? 1 : 0, y: phase >= 4 ? -4 : 0 }}
                    transition={{ delay: phase >= 4 ? i * 0.1 : 0, duration: 0.25 }}
                  >
                    <span>{t}</span>
                    {phase >= 3 && phase < 4 && t.length < LINES[i].length && (i === 0 || typed[i - 1].length === LINES[i - 1].length) && (
                      <span className="ml-0.5 inline-block w-1.5 h-3.5 bg-current animate-pulse" />
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(circle at center, hsl(var(--primary) / 0.12) 0%, transparent 60%)' }}
                animate={phase >= 4 ? { opacity: [0.2, 0.6, 0.2] } : { opacity: 0 }}
                transition={{ duration: 0.35, repeat: 2 }}
              />
            </motion.div>
          )}

          <motion.button
            onClick={finish}
            className={cn(
              'absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
              'border border-foreground/10 text-foreground/40 hover:text-foreground/80 hover:border-foreground/30',
              'bg-black/50 backdrop-blur-sm transition-colors'
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
