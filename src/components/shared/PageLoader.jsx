import { memo } from 'react';
import { cn } from '@/lib/utils';

const PageLoader = memo(function PageLoader({ className }) {
  return (
    <div
      className={cn('fixed inset-0 flex flex-col items-center justify-center bg-black', className)}
      role="status"
    >
      <style>{`
        .rr-ekg-line {
          stroke: hsl(var(--primary));
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          animation: rr-ekg-draw 2.2s ease-in-out infinite;
          filter: drop-shadow(0 0 5px hsl(var(--primary) / 0.75));
        }
        @keyframes rr-ekg-draw {
          0%   { stroke-dashoffset: 260; }
          80%  { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rr-ekg-line {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>

      <div className="flex flex-col items-center gap-5">
        <svg
          viewBox="0 0 80 220"
          className="w-20 fill-none"
          aria-hidden="true"
        >
          {/*
            Vertical EKG path — top to bottom:
            flat in → Q dip left → R spike right → S trough left → baseline
            → T wave → flat → small secondary pulse → flat out
          */}
          <polyline
            className="rr-ekg-line"
            points="40,12 40,62 37,70 63,85 25,100 40,107 40,124 45,130 40,138 40,155 43,160 50,166 43,172 40,177 40,208"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span className="text-[9px] font-extrabold uppercase tracking-[0.3em] text-primary opacity-50 select-none">
          Ride Radar
        </span>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
});

export default PageLoader;
