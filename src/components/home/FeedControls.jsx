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
    <div className="mb-3 rounded-xl border border-border/70 bg-black/30 p-2 shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)] backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-2">
        <Select value={activeFilter} onValueChange={onFilterChange}>
          <SelectTrigger className="h-8 rounded-lg border-border/70 bg-black/35 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="start">
            {filters.map((filter) => (
              <SelectItem key={filter.value} value={filter.value}>{filter.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="h-8 rounded-lg border-border/70 bg-black/35 px-3 text-[11px] font-bold uppercase tracking-[0.1em] text-foreground">
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