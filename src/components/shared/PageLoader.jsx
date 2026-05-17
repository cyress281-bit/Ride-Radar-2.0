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
          filter: drop-shadow(0 0 6px hsl(var(--primary) / 0.6));
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
          10%  { opacity: 0.45; }
          70%  { opacity: 0.45; }
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
            opacity: 0.45;
          }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5">
        <svg
          viewBox="0 0 280 60"
          className="w-[86vw] max-w-[620px] fill-none"
          aria-hidden="true"
        >
          {/*
            Smooth EKG: cubic-bezier P wave and T wave; sharp angular QRS complex.
            pathLength="1" normalises the total length so dasharray/dashoffset
            work without manual length calculation.
          */}
          <path
            pathLength="1"
            className="rr-ekg-line"
            d="M 0 30 L 40 30 C 44 30 48 18 56 18 C 64 18 68 30 72 30 L 90 30 L 96 34 L 108 2 L 118 46 L 128 30 L 148 30 C 155 30 165 12 172 12 C 179 12 193 30 200 30 L 280 30"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="rr-ekg-label text-[9px] font-extrabold uppercase tracking-[0.3em] text-primary select-none">
          Ride Radar
        </span>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
});

export default PageLoader;
