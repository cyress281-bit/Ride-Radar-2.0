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
          stroke-dasharray: 340;
          stroke-dashoffset: 340;
          animation: rr-ekg-draw 2.2s ease-in-out infinite;
          filter: drop-shadow(0 0 8px hsl(var(--primary) / 0.65));
        }
        @keyframes rr-ekg-draw {
          0%   { stroke-dashoffset: 340; }
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
          viewBox="0 0 240 60"
          className="w-[86vw] max-w-[620px] fill-none"
          aria-hidden="true"
        >
          {/*
            Horizontal EKG — left to right:
            flat in → P wave → flat → QRS complex (R spike up, S dip down) → flat → T wave → flat out
          */}
          <polyline
            className="rr-ekg-line"
            points="0,30 50,30 58,22 66,38 74,30 96,30 102,34 114,4 122,48 130,30 152,30 164,18 178,30 240,30"
            strokeWidth="5"
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
