import { memo, useCallback } from 'react';
import BroadcastCard from '@/components/shared/BroadcastCard';
import VirtualList from '@/components/shared/VirtualList';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import RRLogo from '@/components/RRLogo';

/**
 * Virtualized list of broadcasts for the radar bottom sheet.
 *
 * @param {Object} props
 * @param {Array<object>} props.broadcasts
 * @param {(userId: string) => object|null} props.getProfile
 * @param {number} props.userLat
 * @param {number} props.userLng
 * @param {boolean} props.isLoading
 * @param {React.RefObject<HTMLDivElement>} props.scrollElementRef — external scroll container
 */
const RadarBroadcastList = memo(function RadarBroadcastList({
  broadcasts,
  getProfile,
  userLat,
  userLng,
  isLoading,
  scrollElementRef,
}) {
  const renderItem = useCallback(
    (broadcast) => (
      <div className="will-change-transform transform-gpu">
        <BroadcastCard
          broadcast={broadcast}
          author={getProfile(broadcast.author_id)}
          userLat={userLat}
          userLng={userLng}
        />
      </div>
    ),
    [getProfile, userLat, userLng]
  );

  const getItemKey = useCallback((index) => broadcasts[index]?.id ?? index, [broadcasts]);

  if (isLoading && broadcasts.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-4">
        <RRLogo size="sm" className="opacity-40 animate-pulse" glow={false} />
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground animate-pulse">
          Scanning area…
        </p>
      </div>
    );
  }

  if (broadcasts.length === 0 && !isLoading) {
    return (
      <div className="py-12 text-center">
        <RRLogo size="sm" className="mx-auto mb-4 opacity-50" glow={false} />
        <p className="text-sm font-medium text-muted-foreground">No signals in this area.</p>
        <p className="text-xs text-muted-foreground/60 mt-2">Tap the + button to create one.</p>
      </div>
    );
  }

  const shouldVirtualize = broadcasts.length >= VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
      <div className="space-y-3">
        {broadcasts.map((broadcast) => (
          <div key={broadcast.id} className="will-change-transform transform-gpu">
            <BroadcastCard
              broadcast={broadcast}
              author={getProfile(broadcast.author_id)}
              userLat={userLat}
              userLng={userLng}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <VirtualList
      items={broadcasts}
      renderItem={renderItem}
      estimateSize={200}
      gap={12}
      overscan={3}
      scrollElementRef={scrollElementRef}
      getItemKey={getItemKey}
    />
  );
});

export default RadarBroadcastList;
