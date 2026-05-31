import { memo, useLayoutEffect } from 'react';
import { cn } from '@/lib/utils';

const PageLoader = memo(function PageLoader({
  className,
  exiting = false,
  intro = false,
  onSkip,
}) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useLayoutEffect(() => {
    document.getElementById('rr-prepaint')?.remove();
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#040406] transition-all duration-500 ease-out',
        exiting && 'opacity-0 scale-[1.02] blur-sm',
        className
      )}
      role="status"
      aria-label="Loading Ride Radar"
    >
      <style>{`
        @keyframes rr-brand-breathe {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.03); }
        }
        @keyframes rr-brand-bloom {
          0%   { transform: scale(0.9); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rr-brand-alive {
            animation: none !important;
          }
        }
      `}</style>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="absolute right-4 top-4 z-10 flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md bg-white/5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white/90"
          aria-label="Skip intro"
        >
          Skip
        </button>
      )}

      <div className="relative flex flex-col items-center justify-center" aria-hidden="true">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className={cn(
            'h-auto w-auto max-h-[72vh] max-w-[88vw] object-contain',
            !reduced && 'rr-brand-alive'
          )}
          style={
            reduced
              ? {}
              : {
                  animation: intro
                    ? 'rr-brand-bloom 0.6s ease-out both, rr-brand-breathe 2.6s ease-in-out 0.6s infinite'
                    : 'rr-brand-breathe 2.6s ease-in-out infinite',
                }
          }
        />
      </div>
    </div>
  );
});

export default PageLoader;
