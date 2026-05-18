import { memo } from 'react';
import { cn } from '@/lib/utils';

const PageLoader = memo(function PageLoader({ className, exiting = false }) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity [transition-duration:400ms] ease-out',
        exiting && 'opacity-0',
        className
      )}
      role="status"
    >
      <style>{`
        .rr-ekg-line {
          stroke: hsl(var(--primary));
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: rr-ekg-draw 2.4s ease-in-out infinite;
          filter: drop-shadow(0 0 5px hsl(var(--primary) / 0.55));
        }
        .rr-ekg-label {
          animation: rr-ekg-label 2.4s ease-in-out infinite;
        }
        @keyframes rr-ekg-draw {
          0%   { stroke-dashoffset: 1; opacity: 0; }
          5%   { stroke-dashoffset: 1; opacity: 1; }
          65%  { stroke-dashoffset: 0; opacity: 1; }
          80%  { stroke-dashoffset: 0; opacity: 1; }
          95%  { stroke-dashoffset: 1; opacity: 0; }
          100% { stroke-dashoffset: 1; opacity: 0; }
        }
        @keyframes rr-ekg-label {
          0%   { opacity: 0; }
          10%  { opacity: 0.6; }
          70%  { opacity: 0.6; }
          90%  { opacity: 0; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rr-ekg-line {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
          }
          .rr-ekg-label {
            animation: none;
            opacity: 0.6;
          }
        }
      `}</style>

      <span className="rr-ekg-label mb-5 text-[14px] font-extrabold uppercase tracking-[0.3em] text-primary select-none">
        Ride Radar
      </span>

      <svg
        viewBox="0 0 400 100"
        className="w-full fill-none"
        aria-hidden="true"
      >
        <path
          pathLength="1"
          className="rr-ekg-line"
          d="M 0 50 L 100 50 L 104 58 L 116 8 L 128 80 L 140 50 L 170 50 L 184 30 L 200 50 L 400 50"
          strokeWidth="3"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>

      <span className="sr-only">Loading</span>
    </div>
  );
});

export default PageLoader;
