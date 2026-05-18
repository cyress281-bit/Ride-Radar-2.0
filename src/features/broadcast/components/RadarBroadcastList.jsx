import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RideCard } from '@/components/shared/RideCard';
import VirtualList from '@/components/shared/VirtualList';
import { VIRTUALIZATION_THRESHOLD } from '@/lib/constants.js';
import { VStack } from '@/components/ui/primitives/Stack';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Radio } from 'lucide-react';
import { SIGNAL_TYPE_ICONS } from '@/components/brand/SignalIcon';

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
 * @param {string} props.filter
 */
const RadarBroadcastList = memo(function RadarBroadcastList({
  broadcasts,
  getProfile,
  userLat,
  userLng,
  isLoading,
  scrollElementRef,
  filter = 'all',
  hasUserLocation,
}) {
  const navigate = useNavigate();
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
    const noLocAction = { label: 'Find me', onClick: () => navigate('/home') };
    const emptyStates = {
      all: hasUserLocation
        ? {
            icon: Radio,
            title: 'Radar is quiet nearby.',
            description: "You'll see nearby rides, events, help requests, and warnings here.",
            action: { label: 'Start a signal', onClick: () => navigate('/broadcast') },
          }
        : {
            icon: Radio,
            title: 'Enable location to see nearby signals',
            description: 'Radar is showing a US overview. Tap the locate button to scan your area.',
            action: { label: 'Start a signal', onClick: () => navigate('/broadcast') },
          },
      alert: hasUserLocation
        ? { icon: SIGNAL_TYPE_ICONS.alert, title: 'No warnings nearby.', description: 'Roads are clear. Ride safe.' }
        : { icon: SIGNAL_TYPE_ICONS.alert, title: 'Enable location to see warnings.', description: 'Tap Find me to scan your area.', action: noLocAction },
      solo_ride: hasUserLocation
        ? { icon: SIGNAL_TYPE_ICONS.solo_ride, title: 'No riders nearby right now.', description: "Start a ride signal when you're out.", action: { label: 'Ride Now', onClick: () => navigate('/broadcast') } }
        : { icon: SIGNAL_TYPE_ICONS.solo_ride, title: 'Enable location to find riders.', description: 'Tap Find me to scan your area.', action: noLocAction },
      iso: hasUserLocation
        ? { icon: SIGNAL_TYPE_ICONS.iso, title: 'No help requests nearby.', description: 'Find crew or mechanical support when you need it.', action: { label: 'Request Help', onClick: () => navigate('/broadcast') } }
        : { icon: SIGNAL_TYPE_ICONS.iso, title: 'Enable location to see help requests.', description: 'Tap Find me to scan your area.', action: noLocAction },
      event: hasUserLocation
        ? { icon: SIGNAL_TYPE_ICONS.event, title: 'No events nearby this week.', description: 'Plan a meetup, bike night, or group ride.', action: { label: 'Plan a Meetup', onClick: () => navigate('/broadcast') } }
        : { icon: SIGNAL_TYPE_ICONS.event, title: 'Enable location to see events.', description: 'Tap Find me to scan your area.', action: noLocAction },
    };
    const emptyConfig = emptyStates[filter] || emptyStates.all;

    return (
      <EmptyState
        icon={emptyConfig.icon}
        title={emptyConfig.title}
        description={emptyConfig.description}
        action={emptyConfig.action}
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
