import { memo } from 'react';
import { motion } from 'framer-motion';
import { Route } from 'lucide-react';
import SignalIcon from '@/components/brand/SignalIcon';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

const GROUPS = [
  { id: 'bike_down', label: 'Bike Down', microcopy: 'Fast safety alert — accident or rider down', color: 'alert' },
  { id: 'solo_ride', label: 'Ride Now', microcopy: "Let riders know you're out", color: 'solo' },
  { id: 'event', label: 'Plan a Meetup', microcopy: 'Bike night, event, or group ride', color: 'event' },
  { id: 'iso', label: 'Need Help', microcopy: 'Find crew or mechanical support', color: 'iso' },
  { id: 'alert', label: 'Road Warning', microcopy: 'Road hazard or surface condition', color: 'alert' },
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
              {group.id === 'solo_ride' ? (
                <div className="relative shrink-0 border overflow-hidden flex items-center justify-center w-12 h-12 rounded-2xl border-primary/30 bg-primary/10 text-primary shadow-[inset_0_1px_0_hsl(0_0%_100%/0.06)]">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,hsl(0_0%_100%/0.12),transparent_42%)]" />
                  <div className="absolute inset-1 rounded-[inherit] border border-current/10" />
                  <Route className="relative z-10 w-6 h-6" strokeWidth={2.35} />
                </div>
              ) : (
                <SignalIcon type={group.id} size="md" />
              )}
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
