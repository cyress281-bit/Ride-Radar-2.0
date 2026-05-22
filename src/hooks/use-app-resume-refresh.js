import { useCallback, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';
import { notificationKeys } from '@/features/notifications/hooks/use-notifications.js';
import { connectionRequestKeys } from '@/features/connections/hooks/use-connection-requests.js';
import { friendshipKeys } from '@/features/connections/hooks/use-friendships.js';
import { markRealtimeResumeRefresh } from '@/lib/realtimeHealthRegistry.js';

const RESUME_REFRESH_DEBOUNCE_MS = 180;
const RESUME_REFRESH_COOLDOWN_MS = 10_000;

const RESUME_QUERY_KEYS = [
  broadcastKeys.all,
  ['broadcast-comments'],
  ['post-comments'],
  ['myRSVP'],
  ['rsvpCounts'],
  ['live-map-presence'],
  ['settings'],
  notificationKeys.all,
  ['messages'],
  ['conversation'],
  ['conversations'],
  ['conversation-notifications'],
  connectionRequestKeys.all,
  friendshipKeys.all,
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
 * Invalidation is intentionally prefix-based so active realtime surfaces can
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
    markRealtimeResumeRefresh('foreground-resume');

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
