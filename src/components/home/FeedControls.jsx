import { memo } from 'react';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'solo_ride', label: 'Solo' },
  { value: 'event', label: 'Events' },
  { value: 'iso', label: 'ISO' },
  { value: 'alert', label: 'Alerts' },
];

const sorts = [
  { value: 'priority', label: 'Live' },
  { value: 'newest', label: 'Newest' },
  { value: 'nearest', label: 'Nearest' },
];

const FeedControls = memo(function FeedControls({ activeFilter, onFilterChange, sort, onSortChange }) {
  return (
    <div className="mb-3 rounded-2xl border border-border/40 bg-black/35 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04),0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={`rr-haptic relative overflow-hidden rounded-full px-3.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.45),inset_0_1px_0_hsl(0_0%_100%/0.2)]'
                  : 'border border-border/50 bg-secondary/20 text-foreground/70 hover:border-primary/35 hover:bg-primary/10 hover:text-foreground'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Sort pills */}
      <div className="mt-1.5 flex gap-1.5 border-t border-border/25 pt-1.5">
        {sorts.map((s) => {
          const isActive = sort === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => onSortChange(s.value)}
              className={`rr-haptic relative overflow-hidden rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-background ${
                isActive
                  ? 'border border-primary/50 bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]'
                  : 'border border-transparent text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default FeedControls;
