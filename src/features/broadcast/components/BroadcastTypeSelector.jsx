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
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_50%),radial-gradient(circle_at_15%_12%,hsl(var(--cyan)/0.06),transparent_28%),radial-gradient(circle_at_85%_8%,hsl(var(--brand-amber)/0.05),transparent_24%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,hsl(240_20%_2%/_0.2)_100%)]" />
      <VStack gap={3.5} className="relative z-10">
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
              'w-full text-left rounded-3xl border border-l-[3px] bg-surface/86 backdrop-blur-2xl transition-all duration-200 pressable active:scale-[0.98] min-h-[92px]',
              styles.border,
              styles.borderLeft,
              styles.hoverBorder,
              'shadow-[0_18px_52px_hsl(0_0%_0%/0.28)] hover:shadow-[0_22px_60px_hsl(0_0%_0%/0.34)]'
            )}
          >
            <HStack gap={3.5} align="center" className="px-5 py-4.5">
              <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border backdrop-blur-sm', styles.iconBorder, styles.iconBg)}>
                <SignalIcon type={group.id} size="md" />
              </div>
              <VStack gap={0.35} flex className="min-w-0">
                <Text variant="body" className={cn('font-extrabold tracking-[-0.02em]', styles.text)}>
                  {group.label}
                </Text>
                <Text variant="caption" color="muted" className="max-w-[20rem] text-pretty font-medium leading-snug">
                  {group.microcopy}
                </Text>
              </VStack>
            </HStack>
          </motion.button>
        );
      })}
      </VStack>
    </div>
  );
});

export default BroadcastTypeSelector;
