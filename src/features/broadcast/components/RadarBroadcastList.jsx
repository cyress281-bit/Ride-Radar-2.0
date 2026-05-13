import { memo, useCallback } from 'react';
import { RideCard } from '@/components/shared/RideCard';
import VirtualList from '@/components/shared/VirtualList';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import { VStack } from '@/components/ui/primitives/Stack';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Radio } from 'lucide-react';

/**
 * Virtualized list of broadcasts for the radar bottom sheet.
 * Electric Neon Edition.
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
    (broadcast, _index) => {
      return (
        <div className="will-change-transform transform-gpu">
          <RideCard
            broadcast={broadcast}
            author={getProfile(broadcast.author_id)}
            userLat={userLat}
            userLng={userLng}
            to={`/broadcast/${broadcast.id}`}
          />
        </div>
      );
    },
    [getProfile, userLat, userLng]
  );

  const getItemKey = useCallback((index) => broadcasts[index]?.id ?? index, [broadcasts]);

  if (isLoading && broadcasts.length === 0) {
    return (
      <LoadingState
        variant="spinner"
        message="Scanning area…"
        className="py-12"
      />
    );
  }

  if (broadcasts.length === 0 && !isLoading) {
    return (
      <EmptyState
        icon={Radio}
        title="No signals in this area"
        description="Tap the + button to create one."
        className="mt-4"
      />
    );
  }

  const shouldVirtualize = broadcasts.length >= VIRTUALIZATION_THRESHOLD;

  if (!shouldVirtualize) {
    return (
      <VStack gap={3}>
        {broadcasts.map((broadcast, _index) => (
          <div key={broadcast.id} className="will-change-transform transform-gpu">
            <RideCard
              broadcast={broadcast}
              author={getProfile(broadcast.author_id)}
              userLat={userLat}
              userLng={userLng}
              to={`/broadcast/${broadcast.id}`}
            />
          </div>
        ))}
      </VStack>
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
