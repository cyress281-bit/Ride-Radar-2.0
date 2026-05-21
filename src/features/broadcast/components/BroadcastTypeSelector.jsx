import { memo, useEffect, useState } from 'react';
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
  { id: 'bike_down', label: 'Bike Down', microcopy: 'Fast safety alert - accident or rider down', color: 'bike_down' },
];

const HELPER_COPY = {
  solo_ride:
    'Shares that you are out riding now and open to nearby riders. It appears in Radar and the feed while active. It does not automatically turn on Go Live unless you use that flow.',
  event:
    'For planned rides, bike nights, or events. Shows in Radar, the feed, and the detail page. The meetup spot can be confirmed on the map and is meant to be exact.',
  iso:
    'Lets nearby riders know you need wrench help or a bike crew. It appears in Radar, the feed, and the detail page. Location stays approximate for privacy.',
  alert:
    'Shares a temporary road hazard or condition with nearby riders. It appears in Radar, the feed, and the detail page. Use the nearest useful location, not more than you need to share.',
  bike_down:
    'For urgent rider or motorcycle-down situations. It appears prominently in Radar, the feed, and the detail page. Call 911 first if anyone may be injured. Ride Radar is not an emergency service.',
};

const HELPER_STORAGE_PREFIX = 'rr:signal-helper:seen-count:v1:';
const HELPER_AUTO_SHOW_LIMIT = 3;

function readHelperSeenCount(signalType) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(`${HELPER_STORAGE_PREFIX}${signalType}`);
    if (raw == null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return null;
  }
}

function bumpHelperSeenCount(signalType) {
  if (typeof window === 'undefined') return false;
  try {
    const current = readHelperSeenCount(signalType);
    if (current == null) return false;
    window.localStorage.setItem(`${HELPER_STORAGE_PREFIX}${signalType}`, String(current + 1));
    return true;
  } catch {
    return false;
  }
}

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
 * Broadcast type selector - action-group cards for choosing a signal type.
 * Mobile-first, clean, minimal motion.
 */
const BroadcastTypeSelector = memo(function BroadcastTypeSelector({ onSelect }) {
  const [helperOpenByType, setHelperOpenByType] = useState(() => {
    const initial = {};
    GROUPS.forEach((group) => {
      const seenCount = readHelperSeenCount(group.id);
      initial[group.id] = seenCount == null ? true : seenCount < HELPER_AUTO_SHOW_LIMIT;
    });
    return initial;
  });

  useEffect(() => {
    const raf =
      typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function'
        ? window.requestAnimationFrame(() => {
            let storageFailed = false;
            GROUPS.forEach((group) => {
              if (!bumpHelperSeenCount(group.id)) storageFailed = true;
            });

            if (storageFailed) {
              setHelperOpenByType((current) => {
                const next = { ...current };
                GROUPS.forEach((group) => {
                  next[group.id] = true;
                });
                return next;
              });
            }
          })
        : window.setTimeout(() => {
            let storageFailed = false;
            GROUPS.forEach((group) => {
              if (!bumpHelperSeenCount(group.id)) storageFailed = true;
            });

            if (storageFailed) {
              setHelperOpenByType((current) => {
                const next = { ...current };
                GROUPS.forEach((group) => {
                  next[group.id] = true;
                });
                return next;
              });
            }
          }, 0);

    return () => {
      if (typeof window === 'undefined') return;
      if (typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(raf);
      } else {
        window.clearTimeout(raf);
      }
    };
  }, []);

  const handleToggleHelper = (signalType) => {
    setHelperOpenByType((current) => ({
      ...current,
      [signalType]: !current[signalType],
    }));
  };

  return (
    <div className="relative isolate overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_50%_0%,hsl(var(--primary)/0.10),transparent_50%),radial-gradient(circle_at_15%_12%,hsl(var(--cyan)/0.06),transparent_28%),radial-gradient(circle_at_85%_8%,hsl(var(--brand-amber)/0.05),transparent_24%)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent_0%,hsl(240_20%_2%/_0.2)_100%)]" />
      <VStack gap={3.5} className="relative z-10">
        {GROUPS.map((group, index) => {
          const styles = GROUP_STYLES[group.color];
          const helperOpen = helperOpenByType[group.id] ?? true;
          const helperId = `signal-helper-${group.id}`;

          return (
            <div key={group.id} className="space-y-2">
              <motion.button
                type="button"
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

              <div className="px-1">
                {helperOpen ? (
                  <div
                    id={helperId}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 backdrop-blur-xl"
                  >
                    <Text variant="caption" color="muted" className="block text-pretty leading-snug">
                      {HELPER_COPY[group.id]}
                    </Text>
                    <button
                      type="button"
                      onClick={() => handleToggleHelper(group.id)}
                      aria-expanded="true"
                      aria-controls={helperId}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-full px-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current/25 text-[10px] leading-none">
                        ?
                      </span>
                      Hide
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleHelper(group.id)}
                    aria-expanded="false"
                    aria-controls={helperId}
                    className="inline-flex items-center gap-1.5 rounded-full px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-current/25 text-[10px] leading-none">
                      ?
                    </span>
                    Learn more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </VStack>
    </div>
  );
});

export default BroadcastTypeSelector;
