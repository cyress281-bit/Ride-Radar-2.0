import { Component } from 'react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import { captureError } from '@/lib/sentry';

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
        <div className="fixed inset-0 flex items-center justify-center bg-background px-6">
          <div className="max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="font-display text-xl font-bold mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mb-4 text-left text-xs bg-muted p-3 rounded-lg overflow-auto max-h-40">
                <summary className="cursor-pointer font-semibold mb-2">
                  Error details
                </summary>
                <pre className="whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={this.handleReload} variant="default">
                Reload page
              </Button>
              <Button
                onClick={() => (window.location.href = '/')}
                variant="outline"
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
