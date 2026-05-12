import { memo, useMemo } from 'react';
import { SlidersHorizontal, ChevronUp } from 'lucide-react';
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
  all:    { active: 'bg-primary text-primary-foreground glow-kawasaki-sm' },
  alert:  { active: 'bg-alert text-alert-foreground glow-honda' },
  solo_ride: { active: 'bg-solo text-solo-foreground glow-kawasaki-sm' },
  iso:    { active: 'bg-iso text-iso-foreground glow-yamaha' },
  event:  { active: 'bg-event text-event-foreground glow-ducati' },
};

/**
 * Draggable bottom sheet containing stories, filters, sort, and the broadcast list.
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
        className="w-full flex flex-col items-center pt-3 pb-2 min-h-[44px] active:scale-[0.96] active:opacity-80 transition-all duration-150"
      >
        <span className="h-1 w-10 rounded-full bg-muted-foreground/30" />
        <HStack gap={2} align="center" className="mt-2">
          <Text variant="micro" className="text-foreground">
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
          'overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] px-4 pb-6 pb-safe',
          sheetOpen ? 'max-h-[55vh]' : 'max-h-0'
        )}
      >
        {/* Stories / Highlights */}
        {stories.length > 0 && (
          <div className="mb-4 -mx-4 px-4">
            <Text variant="micro" color="muted" className="mb-2">Active riders</Text>
            <div className="flex gap-3 overflow-x-auto scroll-hide pb-1">
              {stories.map((story) => (
                <button
                  key={story.id}
                  className="shrink-0 flex flex-col items-center gap-1.5 active:scale-[0.96] transition-transform"
                >
                  <div className={cn(
                    'relative p-[2px] rounded-full',
                    story.type === 'alert' && 'bg-gradient-to-br from-alert/60 to-alert/20',
                    story.type === 'solo_ride' && 'bg-gradient-to-br from-solo/60 to-solo/20',
                    story.type === 'iso' && 'bg-gradient-to-br from-iso/60 to-iso/20',
                    story.type === 'event' && 'bg-gradient-to-br from-event/60 to-event/20',
                  )}>
                    <Avatar className="h-12 w-12 border-2 border-background">
                      <AvatarImage src={story.avatar} alt={story.name} />
                      <AvatarFallback>{story.name[0]}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Text variant="caption" color="muted" className="max-w-[64px] truncate">
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
                  'shrink-0 rounded-full px-4 py-2 min-h-[44px] text-xs font-bold transition-all duration-150 active:scale-[0.96] active:opacity-80 disabled:opacity-50 border border-transparent',
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
