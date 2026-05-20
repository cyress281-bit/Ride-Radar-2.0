import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CalendarPlus, X } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleEventOccurrence } from '@/features/admin/api/admin-api.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';

/**
 * ScheduleOccurrenceDialog — Admin-only dialog for duplicating an event broadcast
 * to a future date. Creates a clean new broadcasts row; does not copy RSVPs,
 * comments, reports, or moderation state.
 *
 * Props:
 * - broadcast: The source event broadcast object (type must be 'event')
 * - open: boolean controlled open state
 * - onOpenChange: (open: boolean) => void
 * - onSuccess: () => void — called after successful insert
 */
export default function ScheduleOccurrenceDialog({ broadcast, open, onOpenChange, onSuccess }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [error, setError] = useState(null);

  // Reset fields each time the dialog opens with a new broadcast
  useEffect(() => {
    if (open && broadcast) {
      setTitle(broadcast.title || '');
      setEventDate('');
      setError(null);
    }
  }, [open, broadcast]);

  const hasValidDate = eventDate.trim() !== '' && !isNaN(new Date(eventDate).getTime());

  const schedule = useMutation({
    mutationFn: () => scheduleEventOccurrence(broadcast, eventDate, title),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error.message || 'Failed to schedule occurrence.');
        return;
      }
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message || 'Failed to schedule occurrence.');
    },
  });

  // Quick-fill helpers: offset from the source event_date when available
  const sourceDate = broadcast?.event_date ? new Date(broadcast.event_date) : null;

  function toDatetimeLocalValue(date) {
    // datetime-local input expects "YYYY-MM-DDTHH:mm"
    const pad = (n) => String(n).padStart(2, '0');
    return (
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
      `T${pad(date.getHours())}:${pad(date.getMinutes())}`
    );
  }

  function applyQuickFill(days) {
    if (!sourceDate) return;
    const next = new Date(sourceDate);
    next.setDate(next.getDate() + days);
    setEventDate(toDatetimeLocalValue(next));
    setError(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    schedule.mutate();
  }

  if (!broadcast) return null;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/60 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'transition-all duration-200'
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-md rounded-[24px]',
            'bg-surface border border-white/[0.06] shadow-depth-5',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[state=open]:duration-200 data-[state=closed]:duration-150',
            'outline-none'
          )}
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby="schedule-dialog-desc"
        >
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <HStack align="center" justify="between" className="px-5 pt-5 pb-4 border-b border-white/[0.06]">
              <HStack align="center" gap={2}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                  <CalendarPlus className="h-4 w-4 text-primary" />
                </div>
                <DialogPrimitive.Title asChild>
                  <Text variant="h3" color="default">Schedule next occurrence</Text>
                </DialogPrimitive.Title>
              </HStack>
              <DialogPrimitive.Close
                className={cn(
                  'flex items-center justify-center min-w-[40px] min-h-[40px] rounded-full',
                  'text-muted-foreground hover:text-foreground',
                  'transition-all duration-150 pressable',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </DialogPrimitive.Close>
            </HStack>

            {/* Body */}
            <VStack gap={4} className="px-5 py-5">
              <p id="schedule-dialog-desc" className="text-xs text-muted-foreground leading-relaxed">
                Creates a new event broadcast from this one with a fresh date. RSVPs, comments, and reports are not carried over. You will be set as the author.
              </p>

              {/* Title field */}
              <VStack gap={1.5}>
                <label htmlFor="occ-title" className="text-xs font-semibold text-foreground">
                  Event title
                </label>
                <Input
                  id="occ-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Event title"
                  required
                />
              </VStack>

              {/* Date/time field */}
              <VStack gap={1.5}>
                <label htmlFor="occ-date" className="text-xs font-semibold text-foreground">
                  New event date &amp; time <span className="text-brand-emergency">*</span>
                </label>
                <Input
                  id="occ-date"
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => { setEventDate(e.target.value); setError(null); }}
                  required
                  className="[color-scheme:dark]"
                />

                {/* Quick-fill chips — only shown when source has an event_date */}
                {sourceDate && (
                  <HStack gap={2} className="pt-1">
                    <Text variant="micro" color="muted" className="self-center">Quick fill:</Text>
                    <button
                      type="button"
                      onClick={() => applyQuickFill(7)}
                      className={cn(
                        'px-3 py-1 rounded-full border border-primary/20 bg-primary/5',
                        'text-xs font-medium text-primary hover:bg-primary/10 transition-colors pressable'
                      )}
                    >
                      +1 week
                    </button>
                    <button
                      type="button"
                      onClick={() => applyQuickFill(30)}
                      className={cn(
                        'px-3 py-1 rounded-full border border-primary/20 bg-primary/5',
                        'text-xs font-medium text-primary hover:bg-primary/10 transition-colors pressable'
                      )}
                    >
                      +1 month
                    </button>
                  </HStack>
                )}
              </VStack>

              {/* Error message */}
              {error && (
                <Text variant="caption" className="text-brand-emergency">
                  {error}
                </Text>
              )}
            </VStack>

            {/* Footer */}
            <HStack gap={2} justify="end" className="px-5 pb-5">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                size="sm"
                disabled={!hasValidDate || schedule.isPending}
              >
                <CalendarPlus className="h-4 w-4" />
                {schedule.isPending ? 'Scheduling…' : 'Schedule occurrence'}
              </Button>
            </HStack>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
