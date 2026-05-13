import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { captureError } from '@/lib/sentry';
import { logger } from '@/lib/logger';
import { AlertTriangle } from 'lucide-react';
import { RIDE_RADAR_LOGO_URL } from '@/components/splash/logoAsset';

/**
 * ErrorBoundary — Class-based React error boundary.
 *
 * Catches render errors anywhere in its child tree and displays a branded
 * full-screen error card instead of crashing the entire app.
 *
 * Features:
 * - Full-screen error card with Ride Radar branding
 * - "Reload" button to recover
 * - Dev-only stack trace disclosure
 * - Reports to Sentry when available
 *
 * @example
 * <ErrorBoundary>
 *   <MyFeature />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps) {
    if (
      this.state.hasError &&
      this.props.resetKey !== undefined &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  componentDidCatch(error, errorInfo) {
    try {
      logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
      this.setState({ errorInfo });

      captureError(error, {
        errorBoundary: 'ErrorBoundary',
        componentStack: errorInfo.componentStack,
      });
    } catch (boundaryError) {
      // Prevent infinite error loops if Sentry or setState itself throws
      logger.error('[ErrorBoundary] Failed to process error:', boundaryError);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || 'An unexpected error occurred';
      const stackTrace = this.state.error?.stack || '';
      const componentStack = this.state.errorInfo?.componentStack || '';

      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6 z-50">
          <div
            className={cn(
              'w-full max-w-lg rounded-[24px] p-8 text-center',
              'rr-surface-strong',
              'shadow-[0_28px_90px_rgba(0,0,0,0.62)]',
              'border border-primary/15'
            )}
          >
            {/* Brand logo */}
            <img
              src={RIDE_RADAR_LOGO_URL}
              alt="Ride Radar"
              className="mx-auto h-12 w-auto object-contain mb-5 drop-shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
            />

            {/* Alert icon with glow */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
              <AlertTriangle
                className="h-8 w-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                aria-hidden="true"
              />
            </div>

            <h1 className="font-display text-xl font-extrabold tracking-tight mb-2 text-foreground">
              System Error
            </h1>
            <p className="text-sm text-muted-foreground mb-1">
              {errorMessage}
            </p>

            {/* Always show error details */}
            <details className="mb-5 mt-3 text-left text-xs bg-black/40 border border-border/50 p-3 rounded-xl overflow-auto max-h-48">
              <summary className="cursor-pointer font-semibold mb-2 text-muted-foreground hover:text-foreground transition-colors">
                Error details (copy this)
              </summary>
              <div className="space-y-2 text-muted-foreground/80">
                <div>
                  <strong className="text-foreground/60">Message:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{errorMessage}</pre>
                </div>
                {stackTrace && (
                  <div>
                    <strong className="text-foreground/60">Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{stackTrace}</pre>
                  </div>
                )}
                {componentStack && (
                  <div>
                    <strong className="text-foreground/60">Component Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{componentStack}</pre>
                  </div>
                )}
              </div>
            </details>

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)] font-bold tracking-wide"
              >
                Reload
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary font-bold tracking-wide"
              >
                Go Home
              </Button>
              <Button
                onClick={this.handleReset}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground font-bold tracking-wide"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
