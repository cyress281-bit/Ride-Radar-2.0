import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { WifiOff, RefreshCw, Home, MapPin, MessageSquare, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const CAPABILITIES = [
  { icon: MapPin, label: 'View cached radar map and location pins' },
  { icon: MessageSquare, label: 'Read previous messages' },
  { icon: Radio, label: 'View saved broadcasts and signals' },
  { icon: User, label: 'Access your profile and settings' },
];

/**
 * OfflineFallback — Shown when navigation or data fetching fails while offline.
 *
 * Lists offline capabilities and provides "Try Again" and "Go to Home" actions.
 * Uses the project's dark theme styling with Tailwind.
 */
const OfflineFallback = memo(function OfflineFallback({ onRetry }) {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-12 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <WifiOff className="h-10 w-10 text-primary" aria-hidden="true" />
        </div>
        <span className="absolute inset-0 rounded-full animate-pulse-green" />
      </div>

      {/* Heading */}
      <h2 className="rr-heading text-2xl text-foreground mb-2">
        You&apos;re offline
      </h2>
      <p className="max-w-xs text-sm text-muted-foreground mb-8">
        Some features may be unavailable, but you can still access cached content.
      </p>

      {/* Capabilities list */}
      <div className="w-full max-w-sm mb-8 space-y-3">
        <p className="rr-premium-label mb-3 text-left">Available offline</p>
        {CAPABILITIES.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className={cn(
              'flex items-center gap-3 rounded-xl border border-primary/10 bg-primary/[0.04] px-4 py-3',
              'shadow-[inset_0_1px_0_hsl(0_0%_100%/0.04)]'
            )}
          >
            <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-sm text-foreground/90 text-left">{label}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex w-full max-w-sm flex-col gap-3">
        {onRetry && (
          <Button
            variant="default"
            size="default"
            className="w-full"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try Again
          </Button>
        )}
        <Button
          variant="outline"
          size="default"
          className="w-full"
          onClick={() => navigate('/home')}
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Go to Home
        </Button>
      </div>
    </div>
  );
});

export default OfflineFallback;
