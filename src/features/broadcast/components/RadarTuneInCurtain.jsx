import { memo, useEffect, useState } from 'react';
import RRLogo from '@/components/RRLogo';

/**
 * RadarTuneInCurtain — Phase 3 cold-start choreography.
 *
 * Full-screen overlay that briefly covers the radar on mount, suggesting the
 * radar is "tuning in" before revealing the live map. Fades out via opacity
 * transition (reduced-motion safe). Always pointer-events-none so user taps
 * pass through, even mid-fade.
 *
 * The parent controls how long the curtain stays visible by toggling
 * `isVisible`. The curtain handles its own fade-out transition.
 */
const FADE_MS = 200;

const RadarTuneInCurtain = memo(function RadarTuneInCurtain({ isVisible }) {
  // After the fade-out completes, hide entirely so we don't keep painting.
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (isVisible) {
      setMounted(true);
      return undefined;
    }
    const timer = setTimeout(() => setMounted(false), FADE_MS + 50);
    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center bg-background"
      style={{
        opacity: isVisible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out`,
        visibility: isVisible ? 'visible' : 'hidden',
      }}
    >
      {/* Decorative tune-in ring behind the logo */}
      <span
        className="rr-tune-in pointer-events-none absolute h-[120px] w-[120px] rounded-full border border-primary/30 bg-primary/5"
      />
      <div className="relative flex flex-col items-center gap-3">
        <RRLogo size="lg" glow className="text-primary/70" />
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Tuning the radar
        </p>
      </div>
    </div>
  );
});

export default RadarTuneInCurtain;
