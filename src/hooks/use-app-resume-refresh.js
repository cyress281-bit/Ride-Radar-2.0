import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const RESUME_REFRESH_DEBOUNCE_MS = 180;
const RESUME_REFRESH_COOLDOWN_MS = 10_000;

// Query-key roots are inlined (not imported from hook modules) so this eagerly
// loaded module never pulls hook files into the boot chunk. Importing hook modules
// here risks a TDZ when lazy page chunks re-evaluate the same modules — see the
// query-client.js fix (commit 57818ea) for the same pattern. Keep in sync with:
// broadcastKeys.all, notificationKeys.all, connectionRequestKeys.all, friendshipKeys.all.
const RESUME_QUERY_KEYS = [
  ['broadcasts'],
  ['broadcast-comments'],
  ['post-comments'],
  ['myRSVP'],
  ['rsvpCounts'],
  ['live-map-presence'],
  ['settings'],
  ['notifications'],
  ['messages'],
  ['conversation'],
  ['conversations'],
  ['conversation-notifications'],
  ['connection-requests'],
  ['friendships'],
  ['profile'],
  ['user-posts'],
  ['connections-count'],
  ['myBroadcasts'],
];

function isBrowserVisible() {
  return typeof document !== 'undefined' && document.visibilityState === 'visible';
}

function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/**
 * App-wide lifecycle refresh hook.
 *
 * Invalidation is intentionally prefix-based so active queries can
 * refetch once when the app returns from background/suspend/resume.
 */
export function useAppResumeRefresh() {
  const queryClient = useQueryClient();
  const pendingTimerRef = useRef(null);
  const inFlightRef = useRef(false);
  const lastRefreshAtRef = useRef(0);
  const wasHiddenRef = useRef(
    typeof document !== 'undefined' ? document.visibilityState === 'hidden' : false
  );

  const invalidateCoreQueries = useCallback(async () => {
    await Promise.all(
      RESUME_QUERY_KEYS.map((queryKey) =>
        queryClient.invalidateQueries({ queryKey })
      )
    );
  }, [queryClient]);

  const runRefresh = useCallback(async () => {
    if (!isBrowserVisible() || !isBrowserOnline()) return;
    if (inFlightRef.current) return;

    const now = Date.now();
    if (now - lastRefreshAtRef.current < RESUME_REFRESH_COOLDOWN_MS) return;

    inFlightRef.current = true;
    lastRefreshAtRef.current = now;

    try {
      await invalidateCoreQueries();
    } finally {
      inFlightRef.current = false;
      window.dispatchEvent(
        new CustomEvent('rr-app-resume-refresh', {
          detail: { at: now, reason: 'foreground-resume' },
        })
      );
    }
  }, [invalidateCoreQueries]);

  const scheduleRefresh = useCallback(() => {
    if (!isBrowserVisible() || !isBrowserOnline()) return;

    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
    }

    pendingTimerRef.current = window.setTimeout(() => {
      pendingTimerRef.current = null;
      void runRefresh();
    }, RESUME_REFRESH_DEBOUNCE_MS);
  }, [runRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
        return;
      }

      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        scheduleRefresh();
      }
    };

    const handleFocus = () => {
      if (!isBrowserVisible()) return;
      if (!wasHiddenRef.current) return;
      wasHiddenRef.current = false;
      scheduleRefresh();
    };

    const handleOnline = () => {
      if (!isBrowserVisible()) return;
      scheduleRefresh();
    };

    const handlePageShow = (event) => {
      if (!event.persisted && !wasHiddenRef.current) return;
      wasHiddenRef.current = false;
      scheduleRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pageshow', handlePageShow);

      if (pendingTimerRef.current) {
        clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, [scheduleRefresh]);
}
