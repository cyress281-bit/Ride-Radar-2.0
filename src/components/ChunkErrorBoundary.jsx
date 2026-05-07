import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/sentry';
import { trackEvent } from '@/lib/analytics';

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
      await Promise.all(cacheNames.map((cacheName) => window.caches.delete(cacheName)));
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
        <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
          <div className="max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mb-4 flex items-center justify-center">
              <div className="h-12 w-12 rounded-full border-2 border-destructive/30 bg-destructive/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <h2 className="font-display text-lg font-bold mb-2">
              Page failed to load
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              This can happen due to a network issue or an app update. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleRetry} variant="default" size="sm">
                Reload page
              </Button>
              <Button
                onClick={() => (window.location.href = '/home')}
                variant="outline"
                size="sm"
              >
                Go home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
