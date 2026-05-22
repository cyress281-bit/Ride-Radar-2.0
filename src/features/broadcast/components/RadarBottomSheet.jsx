import { memo, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, ChevronUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import RRLogo from '@/components/RRLogo';
import { SIGNAL_TYPE_ICONS } from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';
import RadarBroadcastList from './RadarBroadcastList';
import { withRoutePreload, preloadRiderProfile } from '@/lib/routePreload.js';

const FILTER_TYPES = [
  { id: 'all', label: 'All', Icon: Radio },
  { id: 'alert', label: 'Warnings', Icon: SIGNAL_TYPE_ICONS.alert },
  { id: 'solo_ride', label: 'Riders', Icon: SIGNAL_TYPE_ICONS.solo_ride },
  { id: 'iso', label: 'Help', Icon: SIGNAL_TYPE_ICONS.iso },
  { id: 'event', label: 'Events', Icon: SIGNAL_TYPE_ICONS.event },
];

const FILTER_STYLES = {
  all:    { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'bg-white/[0.11] text-foreground/82 border-white/[0.12] hover:bg-white/[0.13] hover:text-foreground hover:border-white/[0.16]' },
  alert:  { active: 'bg-alert text-alert-foreground shadow-[0_0_20px_hsl(var(--alert)/0.3)]', inactive: 'bg-white/[0.11] text-foreground/82 border-white/[0.12] hover:bg-white/[0.13] hover:text-foreground hover:border-white/[0.16]' },
  solo_ride: { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'bg-white/[0.11] text-foreground/82 border-white/[0.12] hover:bg-white/[0.13] hover:text-foreground hover:border-white/[0.16]' },
  iso:    { active: 'bg-iso text-iso-foreground shadow-[0_0_20px_hsl(var(--iso)/0.3)]', inactive: 'bg-white/[0.11] text-foreground/82 border-white/[0.12] hover:bg-white/[0.13] hover:text-foreground hover:border-white/[0.16]' },
  event:  { active: 'bg-event text-event-foreground shadow-[0_0_20px_hsl(var(--event)/0.3)]', inactive: 'bg-white/[0.11] text-foreground/82 border-white/[0.12] hover:bg-white/[0.13] hover:text-foreground hover:border-white/[0.16]' },
};

/**
 * Compact row for a single live rider in the presence section.
 * Links to their profile if user_id is available.
 */
const LiveRiderRow = memo(function LiveRiderRow({ rider }) {
  const userId = rider.user_id || rider.userId;
  const initial = (rider.display_name || 'R').charAt(0).toUpperCase();

  const content = (
    <HStack align="center" gap={2.5} className="px-2.5 py-2 rounded-xl border border-primary/[0.08] bg-primary/[0.04]">
      {/* Avatar with live indicator */}
      <div className="relative shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
        {rider.avatar_url ? (
          <img
            src={rider.avatar_url}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-primary leading-none">{initial}</span>
        )}
        {/* Pulsing live dot */}
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary border border-background" />
        </span>
      </div>

      {/* Name + vehicle */}
      <div className="flex-1 min-w-0">
        <Text variant="caption" className="font-semibold truncate block">
          {rider.display_name || 'Rider'}
        </Text>
        {rider.vehicle_label && (
          <Text variant="micro" color="muted" className="truncate block">
            {rider.vehicle_label}
          </Text>
        )}
      </div>

      {/* Status label */}
      <Text variant="micro" color="muted" className="shrink-0 font-mono-data tracking-wide">
        Live nearby
      </Text>
    </HStack>
  );

  if (userId) {
    return (
      <Link
        to={`/profile/${userId}`}
        className="block pressable"
        {...withRoutePreload(preloadRiderProfile)}
      >
        {content}
      </Link>
    );
  }
  return content;
});

/**
 * Draggable bottom sheet containing live riders, filters, sort, and the broadcast list.
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
  allBroadcasts,
  getProfile,
  userLat,
  userLng,
  isLoading,
  activeCount,
  isPending,
  peekLabel,
  totalCount,
  hasUserLocation,
  liveRiders = [],
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

  // Phase 4: honest category summary for expanded state — uses unfiltered list so active filter chips don't skew counts
  const categorySummary = useMemo(() => {
    if (!sheetOpen || totalCount === 0) return null;
    const source = allBroadcasts ?? broadcasts;
    const warnings = source.filter((b) => b.type === 'alert' && b.alert_type !== 'bike_down').length;
    const bikeDowns = source.filter((b) => b.type === 'alert' && b.alert_type === 'bike_down').length;
    const rides = source.filter((b) => b.type === 'solo_ride').length;
    const iso = source.filter((b) => b.type === 'iso').length;
    const events = source.filter((b) => b.type === 'event').length;
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
  }, [allBroadcasts, broadcasts, sheetOpen, totalCount]);

  return (
    <div
      ref={sheetRef}
      data-rr-sheet
      className={cn(
        'absolute left-0 right-0 z-20 rounded-t-[24px] transition-transform duration-300 ease-out min-h-[60px] shadow-[0_-8px_32px_hsl(0_0%_0%/0.55),0_-2px_8px_hsl(0_0%_0%/0.30)] overflow-visible',
        sheetOpen ? 'translate-y-0' : 'translate-y-[calc(100%-60px-var(--rr-nav-h)-var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px))-8px)]'
      )}
      style={{
        bottom: '0',
        maxHeight: sheetOpen
          ? 'var(--rr-viewport-height, 100svh)'
          : 'calc(var(--rr-viewport-height, 100svh) * 0.7)',
      }}
      {...sheetTouchHandlers}
    >
      {!sheetOpen && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 bottom-0 z-[-1] rounded-t-[24px] bg-surface/94 backdrop-blur-[32px] border-t border-white/[0.04]"
          style={{
            top: 'calc(100% - 8px)',
          }}
        />
      )}

      {/* Sheet handle */}
      <button
        onClick={() => setSheetOpen((v) => !v)}
        className="w-full flex flex-col items-center pt-2.5 pb-2 min-h-[44px] active:scale-[0.96] active:opacity-80 transition-all duration-150"
      >
        <span className="h-1 w-14 rounded-full bg-primary/70 shadow-[0_0_8px_hsl(var(--primary)/0.25)]" />
        <HStack gap={2} align="center" className="mt-1.5">
          <Radio className="w-3.5 h-3.5 text-primary" />
          <Text variant="micro" className="text-foreground font-semibold">
            {peekLabel}
          </Text>
          <ChevronUp
            className={cn('h-3.5 w-3.5 text-foreground/50 transition-transform', sheetOpen && 'rotate-180')}
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
          'overscroll-contain [-webkit-overflow-scrolling:touch]',
          sheetOpen ? 'overflow-y-auto max-h-[calc(var(--rr-viewport-height,100svh)*0.75)] px-4 pb-[calc(var(--rr-nav-h)+var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px))+1.5rem)]' : 'overflow-hidden max-h-0'
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

        {/* Live riders nearby — presence section */}
        {sheetOpen && liveRiders.length > 0 && (
          <div className="pb-3 pt-1">
            <HStack align="center" gap={1.5} className="px-1 pb-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <Text variant="micro" className="font-bold text-foreground/80 uppercase tracking-wider">
                Live riders nearby
              </Text>
            </HStack>
            <div className="flex flex-col gap-1.5">
              {liveRiders.map((rider) => (
                <LiveRiderRow key={rider.user_id || rider.userId} rider={rider} />
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={cn('flex items-center gap-2 pb-3 pt-1', isPending && 'opacity-60')}>
          <div className="flex flex-1 items-center gap-2 overflow-x-auto px-1 scroll-hide [-webkit-overflow-scrolling:touch]">
            {FILTER_TYPES.map((f) => {
              const fStyle = FILTER_STYLES[f.id];
              const Icon = f.Icon;
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  disabled={isPending}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 min-h-[44px] text-xs font-bold transition-all duration-150 active:scale-[0.96] active:opacity-80 disabled:opacity-50 border',
                    filter === f.id
                      ? fStyle.active
                      : cn('bg-white/5 text-muted-foreground border-transparent', fStyle.inactive)
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {f.label}
                </button>
              );
            })}
          </div>
          <div className="shrink-0 flex items-center gap-1 min-h-[44px] px-2 rounded-full border border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary shrink-0" />
            <select
              id="radar-sort"
              aria-label="Sort broadcasts"
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
