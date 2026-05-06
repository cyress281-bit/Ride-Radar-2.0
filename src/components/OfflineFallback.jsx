/**
 * Offline Fallback Component
 *
 * Shown when a page fails to load due to being offline
 * Provides helpful information about offline functionality
 */

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function OfflineFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-background">
      <div className="max-w-md w-full text-center">
        <div className="mb-6 inline-flex items-center justify-center w-20 h-20 rounded-full bg-destructive/10 border border-destructive/30">
          <WifiOff className="w-10 h-10 text-destructive" />
        </div>

        <h1 className="rr-heading text-3xl mb-3 text-foreground">
          You&apos;re Offline
        </h1>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          No internet connection detected. Some features may be unavailable, but you can still view cached content.
        </p>

        <div className="rr-surface rounded-2xl p-5 mb-6 text-left">
          <h2 className="font-bold text-sm mb-3 text-foreground">What you can do offline:</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>View previously loaded broadcasts and messages</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Browse your profile and saved data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              <span>Draft messages (they&apos;ll send when back online)</span>
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-2xl font-bold"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full h-12 rounded-2xl"
          >
            <Link to="/home">
              <Home className="w-4 h-4 mr-2" />
              Go to Home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
