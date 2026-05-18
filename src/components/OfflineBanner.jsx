import { useState, useEffect, useRef, memo } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

/**
 * OfflineBanner — Slide-in banner for online/offline state changes.
 *
 * Shows "You're offline — viewing cached data" when disconnected.
 * Shows "Back online!" briefly (2s) when reconnected, then auto-hides.
 * Positioned above all content with z-index 50.
 *
 * Guard: "Back online!" only fires after actually going offline in this
 * session, so it never appears on cold start.
 */
const OfflineBanner = memo(function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState('offline'); // 'offline' | 'online'
  const didGoOfflineRef = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      didGoOfflineRef.current = true;
      setBannerType('offline');
      setShowBanner(true);
    } else {
      if (!didGoOfflineRef.current) return;
      didGoOfflineRef.current = false;
      setBannerType('online');
      setShowBanner(true);

      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  // Don't render anything until we've determined we need to show the banner
  if (!showBanner) return null;

  const isOffline = bannerType === 'offline';

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 pt-safe transition-transform duration-300 ease-out',
        showBanner ? 'translate-y-0' : '-translate-y-full'
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className={cn(
          'mx-auto max-w-2xl px-4 pt-2',
          isOffline ? 'pb-2' : 'pb-2'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg backdrop-blur-md',
            isOffline
              ? 'bg-destructive/90 text-destructive-foreground border border-destructive/20'
              : 'bg-primary/90 text-primary-foreground border border-primary/20'
          )}
        >
          {isOffline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>You&apos;re offline — viewing cached data</span>
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Back online!</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

export default OfflineBanner;
