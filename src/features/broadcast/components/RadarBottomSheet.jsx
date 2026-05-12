import { memo } from 'react';
import { SlidersHorizontal, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import RRLogo from '@/components/RRLogo';
import RadarBroadcastList from './RadarBroadcastList';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'solo_ride', label: 'Riders' },
  { id: 'iso', label: 'ISO' },
  { id: 'event', label: 'Events' },
];

const FILTER_STYLES = {
  all:    { active: 'bg-primary text-primary-foreground glow-kawasaki-sm' },
  alert:  { active: 'bg-alert text-alert-foreground glow-honda' },
  solo_ride: { active: 'bg-solo text-solo-foreground glow-kawasaki-sm' },
  iso:    { active: 'bg-iso text-iso-foreground glow-yamaha' },
  event:  { active: 'bg-event text-event-foreground glow-ducati' },
};

/**
 * Draggable bottom sheet containing filters, sort, and the broadcast list.
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
}) {
  return (
    <div
      ref={sheetRef}
      className={cn(
        'absolute left-0 right-0 z-20 bg-surface/85 backdrop-blur-[28px] border-t border-border/30 rounded-t-[24px] transition-transform duration-300 ease-out min-h-[56px]',
        sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-56px)]'
      )}
      style={{
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        maxHeight: sheetOpen
          ? 'calc(100svh - 80px - env(safe-area-inset-bottom, 0px))'
          : '70vh',
      }}
      {...sheetTouchHandlers}
    >
      {/* Sheet handle */}
      <button
        onClick={() => setSheetOpen((v) => !v)}
        className="w-full flex flex-col items-center pt-3 pb-2 min-h-[44px] active:scale-95 active:opacity-80 transition-all duration-150"
      >
        <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs font-bold text-foreground">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'} nearby
          </span>
          <ChevronUp
            className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', sheetOpen && 'rotate-180')}
          />
        </div>
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
          'overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6 pb-safe',
          sheetOpen ? 'max-h-[55vh]' : 'max-h-0'
        )}
      >
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
                  'shrink-0 rounded-full px-4 py-2 min-h-[44px] text-xs font-bold transition-all duration-150 active:scale-95 active:opacity-80 disabled:opacity-50 border border-transparent',
                  filter === f.id
                    ? fStyle.active
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                )}
              >
                {f.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 min-h-[44px] px-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={isPending}
              className="bg-transparent text-xs font-bold text-muted-foreground outline-none py-2 px-1 disabled:opacity-50"
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
        />
      </div>
    </div>
  );
});

export default RadarBottomSheet;
