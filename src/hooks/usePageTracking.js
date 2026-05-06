import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/lib/analytics';
import { startRouteTransition, endRouteTransition } from '@/lib/performanceMonitoring';

/**
 * Hook to track page views on route changes
 *
 * Usage:
 *   usePageTracking();
 *
 * Call this once in your main App component.
 * It will automatically track page views whenever the route changes.
 */
export function usePageTracking() {
  const location = useLocation();

  useEffect(() => {
    // Track the page view
    trackPageView(location.pathname + location.search);

    // Measure route transition performance
    endRouteTransition(location.pathname);

    // Start timing for next transition
    return () => {
      startRouteTransition();
    };
  }, [location]);
}
