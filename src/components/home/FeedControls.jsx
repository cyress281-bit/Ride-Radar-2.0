import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'solo_ride', label: 'Solo' },
  { value: 'event', label: 'Events' },
  { value: 'iso', label: 'ISO' },
  { value: 'alert', label: 'Alerts' },
];

export default function FeedControls({ activeFilter, onFilterChange, sort, onSortChange }) {
  return (
    <div className="mb-3 rounded-2xl border border-border/70 bg-black/25 p-2.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <div className="scroll-hide flex flex-1 gap-1.5 overflow-x-auto">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all',
                activeFilter === filter.value
                  ? 'border-primary/55 bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.14)]'
                  : 'border-border/70 bg-secondary/20 text-muted-foreground hover:border-primary/35 hover:text-foreground'
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 w-[128px] rounded-full border-primary/20 bg-primary/5 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="priority">Live / Priority</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="nearest">Nearest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}