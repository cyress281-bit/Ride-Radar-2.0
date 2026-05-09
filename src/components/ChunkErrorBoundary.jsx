import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/sentry';
import { trackEvent } from '@/lib/analytics';
import { Zap } from 'lucide-react';

/**
 * Error boundary specifically for handling chunk/lazy-load failures.
 * When a dynamic import fails (e.g., network error, deploy invalidating old chunks),
 * this boundary catches the error and offers a retry mechanism.
 */
export class ChunkErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[ChunkErrorBoundary] Chunk load failed:', error, errorInfo);

    // Track chunk load failures
    const isChunkError = error.message && error.message.includes('Failed to fetch dynamically imported module');

    if (isChunkError) {
      trackEvent('Chunk Load Error', {
        errorType: 'chunk_load_failure',
      });

      // Send to Sentry with lower priority (these are often network issues)
      captureError(error, {
        errorBoundary: 'ChunkErrorBoundary',
        isChunkError: true,
        componentStack: errorInfo.componentStack,
      });
    } else {
      // Non-chunk error caught by ChunkErrorBoundary
      captureError(error, {
        errorBoundary: 'ChunkErrorBoundary',
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = async () => {
    this.setState({ hasError: false, error: null });
    if ('caches' in window) {
      const cacheNames = await window.caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.includes('workbox-precache'))
          .map((cacheName) => window.caches.delete(cacheName))
      );
    }

    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    }

    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6 z-50">
          <div className="rr-surface-strong max-w-sm rounded-[24px] p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.62)] border border-primary/15">
            {/* Icon with glow */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
              <Zap className="h-8 w-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" aria-hidden="true" />
            </div>

            <h2 className="font-display text-lg font-extrabold tracking-tight mb-2 text-foreground">
              Page Failed to Load
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This can happen due to a network issue or an app update. Please try again.
            </p>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)] font-bold tracking-wide"
                size="sm"
              >
                Retry
              </Button>
              <Button
                onClick={() => (window.location.href = '/home')}
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary font-bold tracking-wide"
                size="sm"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
