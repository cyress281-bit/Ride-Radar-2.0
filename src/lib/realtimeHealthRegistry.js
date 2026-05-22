import { useSyncExternalStore } from 'react';

const DEFAULT_SURFACE_STATE = {
  status: 'unknown',
  lastSuccessAt: null,
  lastErrorAt: null,
  lastResumeRefreshAt: null,
};

export const REALTIME_SURFACES = [
  'supabase-connection',
  'broadcasts',
  'notifications',
  'messages',
  'conversations',
  'live-presence',
  'connection-requests',
  'friendships',
];

let snapshot = {
  lastResumeRefreshAt: null,
  surfaces: Object.fromEntries(REALTIME_SURFACES.map((surface) => [surface, { ...DEFAULT_SURFACE_STATE }])),
};

const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function ensureSurface(surface) {
  if (!surface) return null;
  if (!snapshot.surfaces[surface]) {
    snapshot = {
      ...snapshot,
      surfaces: {
        ...snapshot.surfaces,
        [surface]: { ...DEFAULT_SURFACE_STATE },
      },
    };
  }
  return snapshot.surfaces[surface];
}

function updateSurface(surface, patch = {}) {
  const current = ensureSurface(surface);
  if (!current) return;

  snapshot = {
    ...snapshot,
    surfaces: {
      ...snapshot.surfaces,
      [surface]: { ...current, ...patch },
    },
  };
  emit();
}

export function markRealtimeSurfaceSubscribed(surface, extra = {}) {
  updateSurface(surface, {
    status: 'subscribed',
    lastSuccessAt: Date.now(),
    ...extra,
  });
}

export function markRealtimeSurfaceReconnecting(surface, extra = {}) {
  updateSurface(surface, {
    status: 'reconnecting',
    ...extra,
  });
}

export function markRealtimeSurfaceStale(surface, extra = {}) {
  updateSurface(surface, {
    status: 'stale',
    lastResumeRefreshAt: snapshot.lastResumeRefreshAt || Date.now(),
    ...extra,
  });
}

export function markRealtimeSurfaceError(surface, extra = {}) {
  updateSurface(surface, {
    status: 'error',
    lastErrorAt: Date.now(),
    ...extra,
  });
}

export function markRealtimeResumeRefresh(reason = 'foreground-resume') {
  const at = Date.now();
  const nextSurfaces = {};

  for (const [surface, current] of Object.entries(snapshot.surfaces)) {
    if (current.status === 'error') {
      nextSurfaces[surface] = current;
      continue;
    }
    if (current.status === 'unknown' && !current.lastSuccessAt) {
      nextSurfaces[surface] = current;
      continue;
    }

    nextSurfaces[surface] = {
      ...current,
      status: 'stale',
      lastResumeRefreshAt: at,
    };
  }

  snapshot = {
    lastResumeRefreshAt: at,
    surfaces: nextSurfaces,
  };

  emit();
  return { at, reason };
}

export function getRealtimeHealthSnapshot() {
  return snapshot;
}

export function subscribeRealtimeHealth(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRealtimeHealthSnapshot() {
  return useSyncExternalStore(subscribeRealtimeHealth, getRealtimeHealthSnapshot, getRealtimeHealthSnapshot);
}
