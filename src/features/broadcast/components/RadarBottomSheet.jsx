import { memo, useMemo, useEffect } from 'react';
import { SlidersHorizontal, ChevronUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import RRLogo from '@/components/RRLogo';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';
import RadarBroadcastList from './RadarBroadcastList';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Warnings' },
  { id: 'solo_ride', label: 'Riders' },
  { id: 'iso', label: 'Help' },
  { id: 'event', label: 'Events' },
];

const FILTER_STYLES = {
  all:    { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'hover:bg-primary/10 hover:text-primary hover:border-primary/20' },
  alert:  { active: 'bg-alert text-alert-foreground shadow-[0_0_20px_hsl(var(--alert)/0.3)]', inactive: 'hover:bg-alert/10 hover:text-alert hover:border-alert/20' },
  solo_ride: { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'hover:bg-primary/10 hover:text-primary hover:border-primary/20' },
  iso:    { active: 'bg-iso text-iso-foreground shadow-[0_0_20px_hsl(var(--iso)/0.3)]', inactive: 'hover:bg-iso/10 hover:text-iso hover:border-iso/20' },
  event:  { active: 'bg-event text-event-foreground shadow-[0_0_20px_hsl(var(--event)/0.3)]', inactive: 'hover:bg-event/10 hover:text-event hover:border-event/20' },
};

/**
 * Draggable bottom sheet containing stories, filters, sort, and the broadcast list.
 * Electric Neon Edition.
 *
 * @param {Object} props
 */
const RadarBottomSheet = memo(function RadarBottomSheet({
  sheetOpen,
  setSheetOpen,
  sheetRef,
  sheetContentRef,
  pullOffset,
  sheetTouchHandlers,
  contentTouchHandlers,
  filter,
  setFilter,
  sortBy,
  setSortBy,
  broadcasts,
  getProfile,
  userLat,
  userLng,
  isLoading,
  activeCount,
  isPending,
  peekLabel,
  totalCount,
  hasUserLocation,
}) {
  // Close the sheet with Escape key when open
  useEffect(() => {
    if (!sheetOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setSheetOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sheetOpen, setSheetOpen]);

  // Phase 4: honest category summary for expanded state
  const categorySummary = useMemo(() => {
    if (!sheetOpen || totalCount === 0) return null;
    const warnings = broadcasts.filter((b) => b.type === 'alert' && b.alert_type !== 'bike_down').length;
    const bikeDowns = broadcasts.filter((b) => b.type === 'alert' && b.alert_type === 'bike_down').length;
    const rides = broadcasts.filter((b) => b.type === 'solo_ride').length;
    const iso = broadcasts.filter((b) => b.type === 'iso').length;
    const events = broadcasts.filter((b) => b.type === 'event').length;
    const parts = [];
    if (bikeDowns === 1) parts.push('1 bike down');
    else if (bikeDowns > 1) parts.push(`${bikeDowns} bike downs`);
    if (warnings === 1) parts.push('1 warning');
    else if (warnings > 1) parts.push(`${warnings} warnings`);
    if (rides === 1) parts.push('1 ride');
    else if (rides > 1) parts.push(`${rides} rides`);
    if (iso === 1) parts.push('1 help request');
    else if (iso > 1) parts.push(`${iso} help requests`);
    if (events === 1) parts.push('1 event');
    else if (events > 1) parts.push(`${events} events`);
    return parts.length > 0 ? parts.join(', ') + ' nearby' : null;
  }, [broadcasts, sheetOpen, totalCount]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        'absolute left-0 right-0 z-20 bg-surface/90 backdrop-blur-[32px] border-t border-white/[0.06] rounded-t-[24px] transition-transform duration-300 ease-out min-h-[56px]',
        sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'
      )}
      style={{
        bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
        maxHeight: sheetOpen
          ? 'calc(100svh - 64px - env(safe-area-inset-bottom, 0px))'
          : '70vh',
      }}
      {...sheetTouchHandlers}
    >
      {/* Sheet handle */}
      <button
        onClick={() => setSheetOpen((v) => !v)}
        className="w-full flex flex-col items-center pt-3 pb-2 min-h-[44px] active:scale-[0.96] active:opacity-80 transition-all duration-150"
      >
        <span className="h-1 w-10 rounded-full bg-white/20" />
        <HStack gap={2} align="center" className="mt-2">
          <Radio className="w-3 h-3 text-primary" />
          <Text variant="micro" className="text-foreground font-semibold">
            {peekLabel}
          </Text>
          <ChevronUp
            className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sheetOpen && 'rotate-180')}
          />
        </HStack>
      </button>

      {/* Pull indicator */}
      {pullOffset > 10 && (
        <div className="flex justify-center pt-2 pb-1">
          <RRLogo size="sm" className={cn('opacity-60', pullOffset > 40 && 'animate-spin')} glow={false} />
        </div>
      )}

      {/* Sheet content */}
      <div
        ref={sheetContentRef}
        {...contentTouchHandlers}
        className={cn(
          'overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6',
          sheetOpen ? 'max-h-[75svh]' : 'max-h-0'
        )}
      >
        {/* Expanded category summary */}
        {sheetOpen && categorySummary && (
          <div className="px-4 pt-2 pb-1">
            <Text variant="micro" color="muted" className="font-medium">
              {categorySummary}
            </Text>
          </div>
        )}

        {/* Filters */}
        <div className={cn('flex items-center gap-2 overflow-x-auto pb-3 pt-1 scroll-hide [-webkit-overflow-scrolling:touch]', isPending && 'opacity-60')}>
          {FILTER_TYPES.map((f) => {
            const fStyle = FILTER_STYLES[f.id];
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                disabled={isPending}
                className={cn(
                  'shrink-0 rounded-full px-4 py-2 min-h-[44px] text-xs font-bold transition-all duration-150 active:scale-[0.96] active:opacity-80 disabled:opacity-50 border',
                  filter === f.id
                    ? fStyle.active
                    : cn('bg-white/5 text-muted-foreground border-transparent', fStyle.inactive)
                )}
              >
                {f.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 min-h-[44px] px-2 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={isPending}
              className="bg-transparent text-xs font-bold text-muted-foreground outline-none py-2 px-1 disabled:opacity-50 cursor-pointer"
            >
              <option value="rank">Rank</option>
              <option value="distance">Distance</option>
              <option value="time">Newest</option>
            </select>
          </div>
        </div>

        {/* Broadcast list */}
        <RadarBroadcastList
          broadcasts={broadcasts}
          getProfile={getProfile}
          userLat={userLat}
          userLng={userLng}
          isLoading={isLoading}
          scrollElementRef={sheetContentRef}
          filter={filter}
          hasUserLocation={hasUserLocation}
        />
      </div>
    </div>
  );
});

export default RadarBottomSheet;
