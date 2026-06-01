import { memo, useCallback } from 'react';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';

const STORAGE_KEY = 'rr_location_disclosure_shown';

export function hasSeenLocationDisclosure() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function markLocationDisclosureShown() {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * LocationDisclosureDialog — Google Play prominent disclosure.
 *
 * Must be shown BEFORE requesting location permission for the first time.
 * Explains why precise GPS is needed and how it's used.
 *
 * Props:
 * - isOpen: boolean
 * - onAllow: () => void — user tapped "Allow" → proceed to request location
 * - onDismiss: () => void — user tapped "Not now" → dismiss without requesting
 */
const LocationDisclosureDialog = memo(function LocationDisclosureDialog({
  isOpen,
  onAllow,
  onDismiss,
}) {
  const handleAllow = useCallback(() => {
    markLocationDisclosureShown();
    onAllow();
  }, [onAllow]);

  const handleDismiss = useCallback(() => {
    markLocationDisclosureShown();
    onDismiss();
  }, [onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 pb-[calc(var(--rr-nav-h)+var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px))+1rem)] pt-20 backdrop-blur-sm sm:items-center sm:pb-4"
      onClick={handleDismiss}
    >
      <div
        className="w-full max-w-sm rounded-[24px] border border-white/[0.08] bg-surface/95 p-5 shadow-[0_20px_60px_hsl(0_0%_0%/0.45)] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <HStack justify="between" align="center" className="mb-4">
          <HStack align="center" gap={2}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="w-4 h-4" />
            </div>
            <Text variant="h3" className="text-base font-bold">
              Ride Radar uses your precise location
            </Text>
          </HStack>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </HStack>

        <Text variant="body" className="text-foreground/80 leading-relaxed mb-6">
          Your GPS location is used to show nearby riders, broadcasts, and safety
          alerts on the live radar map. Your location is only visible to other riders
          while you are actively broadcasting.
        </Text>

        <VStack gap={2}>
          <button
            type="button"
            onClick={handleAllow}
            className={cn(
              'w-full rounded-xl px-4 py-3 text-sm font-bold',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 active:scale-[0.98]',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
            )}
          >
            Allow
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className={cn(
              'w-full rounded-xl px-4 py-3 text-sm font-medium',
              'bg-white/[0.03] text-muted-foreground border border-white/[0.06]',
              'hover:bg-white/[0.06] hover:text-foreground',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
          >
            Not now
          </button>
        </VStack>
      </div>
    </div>
  );
});

export default LocationDisclosureDialog;
