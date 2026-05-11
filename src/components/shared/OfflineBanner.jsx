import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

/**
 * OfflineBanner — Slide-in connectivity warning banner.
 *
 * Appears when the browser detects it is offline and auto-dismisses
 * when connectivity is restored. Uses Framer Motion for smooth
 * slide-in / slide-out transitions.
 *
 * @returns {JSX.Element}
 */
const OfflineBanner = memo(function OfflineBanner() {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-banner"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 22, stiffness: 320 }}
          className="fixed top-0 left-0 right-0 z-[60] px-4 pt-3 pb-2"
        >
          <div className="mx-auto max-w-md">
            <div
              className={cn(
                'rounded-2xl border border-destructive/30 px-4 py-3',
                'rr-surface-strong',
                'shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_20px_hsl(var(--destructive)/0.15)]'
              )}
            >
              <div className="flex items-center gap-3">
                {/* Pulsing icon */}
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-8 w-8 rounded-full bg-destructive/20 animate-pulse" />
                  <WifiOff
                    className="relative h-5 w-5 text-destructive"
                    aria-hidden="true"
                  />
                </div>

                {/* Text */}
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-destructive tracking-wide">
                    Working offline
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Viewing cached data. Check your connection.
                  </span>
                </div>

                {/* Status indicator */}
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse shadow-[0_0_6px_hsl(var(--destructive)/0.6)]" />
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-destructive/60">
                    NO SIGNAL
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default OfflineBanner;
