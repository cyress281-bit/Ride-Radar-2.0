import { memo, useState, useEffect, useLayoutEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const LINES = ['RADAR ONLINE', 'SIGNAL LOCKED', 'RIDE READY'];

const SplashScreen = memo(function SplashScreen({ exiting, onSkip }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [phase, setPhase] = useState(0);
  const [typed, setTyped] = useState(['', '', '']);
  const [cursorOn, setCursorOn] = useState(true);
  const [showSkip, setShowSkip] = useState(false);

  useLayoutEffect(() => {
    document.getElementById('rr-prepaint')?.remove();
  }, []);

  useEffect(() => {
    const skipTimer = setTimeout(() => setShowSkip(true), 300);
    return () => clearTimeout(skipTimer);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const timers = [
      setTimeout(() => setPhase(1), 0),
      setTimeout(() => setPhase(2), 500),
      setTimeout(() => setPhase(3), 1500),
      setTimeout(() => setPhase(4), 2700),
      setTimeout(() => setPhase(5), 3300),
    ];
    return () => timers.forEach(clearTimeout);
  }, [reduced]);

  useEffect(() => {
    if (phase < 3) return;
    let line = 0;
    let char = 0;
    const iv = setInterval(() => {
      if (line >= LINES.length) {
        clearInterval(iv);
        return;
      }
      setTyped((prev) => {
        const next = [...prev];
        next[line] = LINES[line].slice(0, char + 1);
        return next;
      });
      char++;
      if (char >= LINES[line].length) {
        line++;
        char = 0;
      }
    }, 22);
    return () => clearInterval(iv);
  }, [phase]);

  useEffect(() => {
    if (phase < 3 || phase > 4) return;
    const iv = setInterval(() => setCursorOn((v) => !v), 530);
    return () => clearInterval(iv);
  }, [phase]);

  const handleSkip = useCallback(() => {
    onSkip();
  }, [onSkip]);

  /* ── Reduced-motion: static frame only ── */
  if (reduced) {
    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#040406]"
        role="status"
        aria-label="Loading Ride Radar"
      >
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="h-24 w-auto"
        />
        <span className="mt-4 text-xl tracking-[0.2em] text-[hsl(107,100%,54%)]">
          RIDE RADAR
        </span>
      </div>
    );
  }

  const cursorLine =
    typed.findIndex((t, i) => t.length < LINES[i].length) >= 0
      ? typed.findIndex((t, i) => t.length < LINES[i].length)
      : LINES.length - 1;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] overflow-hidden bg-[#040406] transition-all duration-500 ease-out',
        exiting && 'opacity-0 scale-[1.02] blur-sm'
      )}
      role="status"
      aria-label="Loading Ride Radar"
    >
      {/* Skip button */}
      {showSkip && (
        <button
          type="button"
          onClick={handleSkip}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-white/5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
          aria-label="Skip intro"
        >
          Skip
        </button>
      )}

      {/* ── Grid layer ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(hsl(240 14% 6%) 1px, transparent 1px), linear-gradient(90deg, hsl(240 14% 6%) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          opacity: phase >= 1 ? (phase >= 4 ? 0.2 : 0.35) : 0,
          transition: 'opacity 0.6s ease-out',
        }}
        aria-hidden="true"
      />

      {/* ── Center blip (phases 1-3) ── */}
      {phase >= 1 && phase < 4 && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <div
            className="h-2 w-2 rounded-full bg-[hsl(107,100%,54%)]"
            style={{
              animation: 'rr-splash-hold-pulse 1.2s ease-in-out infinite',
              opacity: phase >= 4 ? 0 : 1,
              transition: 'opacity 0.4s ease-out',
            }}
          />
        </div>
      )}

      {/* ── EKG line (phases 2-3) ── */}
      {phase >= 2 && phase < 4 && (
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 400 100"
            className="w-full"
            style={{ overflow: 'visible' }}
          >
            <path
              pathLength="1"
              stroke="hsl(107 100% 54%)"
              strokeWidth={phase >= 3 && typed[2].length > 5 ? 3 : 2}
              strokeLinecap="butt"
              strokeLinejoin="miter"
              fill="none"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: 1,
                animation: 'rr-splash-ekg-draw 2.4s ease-in-out infinite',
                filter: 'drop-shadow(0 0 5px hsl(107 100% 54% / 0.55))',
              }}
              d="M 0 50 L 100 50 L 104 58 L 116 8 L 128 80 L 140 50 L 170 50 L 184 30 L 200 50 L 400 50"
            />
          </svg>
        </div>
      )}

      {/* ── Scan line (phases 2-3) ── */}
      {phase >= 2 && phase < 4 && (
        <div
          className="absolute inset-y-0 left-0 w-[2px] bg-[hsl(107,100%,54%)]"
          style={{
            animation: 'rr-splash-scan 2s linear infinite',
            boxShadow: '0 0 12px hsl(107 100% 54% / 0.5)',
          }}
          aria-hidden="true"
        />
      )}

      {/* ── Typed text (phase 3) ── */}
      {phase >= 3 && phase < 5 && (
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          aria-hidden="true"
        >
          <div className="space-y-2 font-mono text-sm tracking-[0.15em] text-[hsl(107,100%,54%)]">
            {LINES.map((line, i) => (
              <div key={line} className="flex items-center">
                <span>{typed[i]}</span>
                {i === cursorLine && cursorOn && (
                  <span className="ml-0.5 inline-block h-[1em] w-[2px] bg-[hsl(107,100%,54%)]" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Logo + wordmark finale (phases 4-5) ── */}
      {phase >= 4 && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden="true"
        >
          {/* Radar ring ping (once at phase 4 start) */}
          {phase >= 4 && phase < 5 && (
            <div
              className="absolute h-48 w-48 rounded-full border border-[hsl(107,100%,54%)]"
              style={{ animation: 'rr-splash-ring-ping 1.2s ease-out both' }}
            />
          )}

          {/* Logo */}
          <img
            src="/logo.png"
            alt=""
            aria-hidden="true"
            className="relative z-10 h-24 w-auto"
            style={{
              animation:
                phase >= 4
                  ? 'rr-splash-logo-bloom 0.6s ease-out both'
                  : 'none',
            }}
          />

          {/* Wordmark */}
          <span
            className="relative z-10 mt-4 text-xl tracking-[0.2em] text-[hsl(107,100%,54%)]"
            style={{
              animation:
                phase >= 4
                  ? 'rr-splash-wordmark-settle 0.5s ease-out 0.3s both'
                  : 'none',
            }}
          >
            RIDE RADAR
          </span>

          {/* Holding pulse ring (phase 5) */}
          {phase >= 5 && (
            <div
              className="absolute h-48 w-48 rounded-full border border-[hsl(107,100%,54%)] opacity-20"
              style={{ animation: 'rr-splash-hold-pulse 2s ease-in-out infinite' }}
            />
          )}
        </div>
      )}
    </div>
  );
});

export default SplashScreen;
