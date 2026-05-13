import { memo, useMemo, useEffect } from 'react';
import { SlidersHorizontal, ChevronUp, Radio } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import RRLogo from '@/components/RRLogo';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Text } from '@/components/ui/primitives/Text';
import { HStack } from '@/components/ui/primitives/Stack';
import RadarBroadcastList from './RadarBroadcastList';

const FILTER_TYPES = [
  { id: 'all', label: 'All' },
  { id: 'alert', label: 'Alerts' },
  { id: 'solo_ride', label: 'Riders' },
  { id: 'iso', label: 'ISO' },
  { id: 'event', label: 'Events' },
];

const FILTER_STYLES = {
  all:    { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'hover:bg-primary/10 hover:text-primary hover:border-primary/20' },
  alert:  { active: 'bg-destructive text-destructive-foreground shadow-[0_0_20px_hsl(var(--destructive)/0.3)]', inactive: 'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20' },
  solo_ride: { active: 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]', inactive: 'hover:bg-primary/10 hover:text-primary hover:border-primary/20' },
  iso:    { active: 'bg-cyan text-cyan-foreground shadow-[0_0_20px_hsl(var(--cyan)/0.3)]', inactive: 'hover:bg-cyan/10 hover:text-cyan hover:border-cyan/20' },
  event:  { active: 'bg-amber text-amber-foreground shadow-[0_0_20px_hsl(var(--amber)/0.3)]', inactive: 'hover:bg-amber/10 hover:text-amber hover:border-amber/20' },
};

const STORY_RING_STYLES = {
  alert: 'from-destructive/70 to-destructive/20 shadow-[0_0_10px_hsl(var(--destructive)/0.3)]',
  solo_ride: 'from-primary/70 to-primary/20 shadow-[0_0_10px_hsl(var(--primary)/0.3)]',
  iso: 'from-cyan/70 to-cyan/20 shadow-[0_0_10px_hsl(var(--cyan)/0.3)]',
  event: 'from-amber/70 to-amber/20 shadow-[0_0_10px_hsl(var(--amber)/0.3)]',
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

  // Build unique author stories from broadcasts
  const stories = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const b of broadcasts) {
      const author = getProfile(b.author_id);
      if (!author || !author.avatar_url) continue;
      if (seen.has(b.author_id)) continue;
      seen.add(b.author_id);
      list.push({
        id: b.author_id,
        name: author.display_name || 'Rider',
        avatar: author.avatar_url,
        type: b.type,
      });
      if (list.length >= 10) break;
    }
    return list;
  }, [broadcasts, getProfile]);

  return (
    <div
      ref={sheetRef}
      className={cn(
        'absolute left-0 right-0 z-20 bg-surface/90 backdrop-blur-[32px] border-t border-white/[0.06] rounded-t-[24px] transition-transform duration-300 ease-out min-h-[56px]',
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
        className="w-full flex flex-col items-center pt-3 pb-2 min-h-[44px] active:scale-[0.96] active:opacity-80 transition-all duration-150"
      >
        <span className="h-1 w-10 rounded-full bg-white/20" />
        <HStack gap={2} align="center" className="mt-2">
          <Radio className="w-3 h-3 text-primary animate-glow-pulse" />
          <Text variant="micro" className="text-foreground font-semibold">
            {activeCount} {activeCount === 1 ? 'signal' : 'signals'} nearby
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
          sheetOpen ? 'max-h-[55vh]' : 'max-h-0'
        )}
      >
        {/* Stories / Highlights */}
        {stories.length > 0 && (
          <div className="mb-4 -mx-4 px-4">
            <HStack gap={2} align="center" className="mb-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse-green" />
              <Text variant="micro" color="muted" className="font-semibold uppercase tracking-wider">Active riders</Text>
            </HStack>
            <div className="flex gap-3 overflow-x-auto scroll-hide pb-1">
              {stories.map((story) => (
                <button
                  key={story.id}
                  className="shrink-0 flex flex-col items-center gap-1.5 active:scale-[0.96] transition-transform"
                >
                  <div className={cn(
                    'relative p-[2.5px] rounded-full bg-gradient-to-br',
                    STORY_RING_STYLES[story.type] || STORY_RING_STYLES.solo_ride
                  )}>
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={story.avatar} alt={story.name} />
                      <AvatarFallback>{story.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Text variant="caption" color="muted" className="max-w-[64px] truncate font-medium">
                    {story.name}
                  </Text>
                </button>
              ))}
            </div>
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
        />
      </div>
    </div>
  );
});

export default RadarBottomSheet;
