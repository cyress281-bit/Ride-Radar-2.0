import { memo } from 'react';
import { motion } from 'framer-motion';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const GROUPS = [
  { id: 'solo_ride', label: 'Ride Now', microcopy: "Let riders know you're out", color: 'solo' },
  { id: 'event', label: 'Plan a Meetup', microcopy: 'Bike night, event, or group ride', color: 'event' },
  { id: 'iso', label: 'Need Help', microcopy: 'Find crew or mechanical support', color: 'iso' },
  { id: 'alert', label: 'Road Warning', microcopy: 'Road hazard or surface condition', color: 'alert' },
  { id: 'bike_down', label: 'Bike Down', microcopy: 'Fast safety alert — accident or rider down', color: 'bike_down' },
];

const GROUP_STYLES = {
  solo: {
    border: 'border-primary/20',
    borderLeft: 'border-l-primary/50',
    text: 'text-primary',
    iconBorder: 'border-primary/25',
    iconBg: 'bg-primary/10',
    hoverBorder: 'hover:border-primary/50',
  },
  event: {
    border: 'border-event/20',
    borderLeft: 'border-l-event/50',
    text: 'text-event',
    iconBorder: 'border-event/25',
    iconBg: 'bg-event/10',
    hoverBorder: 'hover:border-event/50',
  },
  iso: {
    border: 'border-iso/20',
    borderLeft: 'border-l-iso/50',
    text: 'text-iso',
    iconBorder: 'border-iso/25',
    iconBg: 'bg-iso/10',
    hoverBorder: 'hover:border-iso/50',
  },
  alert: {
    border: 'border-alert/20',
    borderLeft: 'border-l-alert/50',
    text: 'text-alert',
    iconBorder: 'border-alert/25',
    iconBg: 'bg-alert/10',
    hoverBorder: 'hover:border-alert/50',
  },
  bike_down: {
    border: 'border-destructive/20',
    borderLeft: 'border-l-destructive/50',
    text: 'text-destructive',
    iconBorder: 'border-destructive/25',
    iconBg: 'bg-destructive/10',
    hoverBorder: 'hover:border-destructive/50',
  },
};

/**
 * Broadcast type selector — action-group cards for choosing a signal type.
 * Mobile-first, clean, minimal motion.
 */
const BroadcastTypeSelector = memo(function BroadcastTypeSelector({ onSelect }) {
  return (
    <VStack gap={3}>
      {GROUPS.map((group, index) => {
        const styles = GROUP_STYLES[group.color];
        return (
          <motion.button
            key={group.id}
            onClick={() => onSelect(group.id)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'w-full text-left rounded-2xl border border-l-[3px] bg-surface-elevated/60 backdrop-blur-sm transition-all duration-200 pressable active:scale-[0.98]',
              styles.border,
              styles.borderLeft,
              styles.hoverBorder
            )}
          >
            <HStack gap={3} align="center" className="px-4 py-3.5">
              <SignalIcon type={group.id} size="md" />
              <VStack gap={0.5} flex>
                <Text variant="body" className={cn('font-bold', styles.text)}>
                  {group.label}
                </Text>
                <Text variant="caption" color="muted" className="font-medium">
                  {group.microcopy}
                </Text>
              </VStack>
            </HStack>
          </motion.button>
        );
      })}
    </VStack>
  );
});

export default BroadcastTypeSelector;
