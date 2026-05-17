import { memo } from 'react';
import { cn } from '@/lib/utils';

const PageLoader = memo(function PageLoader({ className }) {
  return (
    <div
      className={cn('fixed inset-0 flex flex-col items-center justify-center bg-black', className)}
      role="status"
    >
      <div className="flex flex-col items-center gap-5">
        <svg
          viewBox="0 0 80 200"
          className="w-20 stroke-primary fill-none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 6px hsl(var(--primary) / 0.8))' }}
          aria-hidden="true"
        >
          <polyline points="40,10 40,55 36,64 44,74 40,82 40,96 37,102 64,116 26,130 40,137 40,154 46,161 40,170 40,190" />
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
