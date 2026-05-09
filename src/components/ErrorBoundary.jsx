import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/sentry';
import { AlertTriangle } from 'lucide-react';

/**
 * Error boundary component to catch and handle React render errors.
 * Prevents the entire app from crashing when a component throws an error.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });

    // Send error to Sentry
    captureError(error, {
      errorBoundary: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-sm px-6 z-50">
          <div className="rr-surface-strong max-w-md rounded-[24px] p-8 text-center shadow-[0_28px_90px_rgba(0,0,0,0.62)] border border-primary/15">
            {/* Alert icon with glow */}
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-[0_0_24px_hsl(var(--primary)/0.18)]">
              <AlertTriangle className="h-8 w-8 text-primary drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" aria-hidden="true" />
            </div>

            <h1 className="font-display text-xl font-extrabold tracking-tight mb-2 text-foreground">
              System Error
            </h1>
            <p className="text-sm text-muted-foreground mb-1">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-5 mt-3 text-left text-xs bg-black/40 border border-border/50 p-3 rounded-xl overflow-auto max-h-40">
                <summary className="cursor-pointer font-semibold mb-2 text-muted-foreground hover:text-foreground transition-colors">
                  Error details
                </summary>
                <pre className="whitespace-pre-wrap text-muted-foreground/80">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.25)] font-bold tracking-wide"
              >
                Reload
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
                className="border-primary/20 text-primary hover:bg-primary/10 hover:text-primary font-bold tracking-wide"
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
