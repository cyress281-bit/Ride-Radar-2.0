import { memo } from 'react';
import { motion } from 'framer-motion';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const GROUPS = [
  { id: 'solo_ride', label: 'Ride Now', microcopy: "Let riders know you're out", color: 'solo' },
  { id: 'event', label: 'Plan a Meetup', microcopy: 'Event or group ride', color: 'event' },
  { id: 'iso', label: 'Need Help', microcopy: 'Mechanic or crew', color: 'iso' },
  { id: 'alert', label: 'Warning', microcopy: 'Road hazard or accident', color: 'alert' },
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
    border: 'border-brand-amber/20',
    borderLeft: 'border-l-brand-amber/50',
    text: 'text-brand-amber',
    iconBorder: 'border-brand-amber/25',
    iconBg: 'bg-brand-amber/10',
    hoverBorder: 'hover:border-brand-amber/50',
  },
  iso: {
    border: 'border-brand-radar/20',
    borderLeft: 'border-l-brand-radar/50',
    text: 'text-brand-radar',
    iconBorder: 'border-brand-radar/25',
    iconBg: 'bg-brand-radar/10',
    hoverBorder: 'hover:border-brand-radar/50',
  },
  alert: {
    border: 'border-brand-emergency/20',
    borderLeft: 'border-l-brand-emergency/50',
    text: 'text-brand-emergency',
    iconBorder: 'border-brand-emergency/25',
    iconBg: 'bg-brand-emergency/10',
    hoverBorder: 'hover:border-brand-emergency/50',
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
              <div
                className={cn(
                  'h-11 w-11 rounded-xl flex items-center justify-center border shrink-0',
                  styles.iconBorder,
                  styles.iconBg
                )}
              >
                <SignalIcon type={group.id} size="md" />
              </div>
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
