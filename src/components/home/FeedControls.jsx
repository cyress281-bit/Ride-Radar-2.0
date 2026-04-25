import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'solo_ride', label: 'Solo' },
  { value: 'event', label: 'Events' },
  { value: 'iso', label: 'ISO' },
  { value: 'alert', label: 'Alerts' },
];

export default function FeedControls({ activeFilter, onFilterChange, sort, onSortChange }) {
  return (
    <div className="mb-3 rounded-2xl border border-border/55 bg-black/25 p-1.5 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-1.5">
        <Select value={activeFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 rounded-xl border-border/45 bg-secondary/20 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/90 shadow-none hover:border-primary/35 hover:bg-primary/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start" className="border-border/70 bg-popover/95 shadow-2xl shadow-black/50">
            {filters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 rounded-xl border-border/45 bg-secondary/20 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-foreground/90 shadow-none hover:border-primary/35 hover:bg-primary/5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="border-border/70 bg-popover/95 shadow-2xl shadow-black/50">
            <SelectItem value="priority">Live / Priority</SelectItem>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="nearest">Nearest</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}