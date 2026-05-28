import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';

const HEALTH_CHANNEL_NAME = 'ride-radar-health';

/**
 * Monitor Supabase realtime connection health.
 *
 * @returns {{ status: string, isConnected: boolean, lastPingAt: number|null }}
 */
export function useSupabaseConnection() {
  const [status, setStatus] = useState('unknown');
  const [lastPingAt, setLastPingAt] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    function createHealthChannel() {
      const channel = supabase
        .channel(HEALTH_CHANNEL_NAME, {
          config: { broadcast: { self: false } },
        })
        .subscribe((state, err) => {
          if (!isMounted) return;
          if (err) {
            if (isExpectedRealtimeDisconnect(err, state)) {
              logger.debug('[useSupabaseConnection] Health channel disconnected (expected reconnect)', {
                state,
                name: err?.name,
                code: err?.code,
                message: err?.message,
              });
              setStatus('reconnecting');
            } else {
              logger.warn('[useSupabaseConnection] Health channel error:', err);
              setStatus('error');
            }
            return;
          }
          const nextStatus =
            state === 'SUBSCRIBED'
              ? 'subscribed'
              : state === 'CHANNEL_ERROR'
                ? 'error'
                : state === 'TIMED_OUT'
                  ? 'reconnecting'
                  : state === 'CLOSED'
                    ? 'reconnecting'
                    : state.toLowerCase();
          setStatus(nextStatus);
          if (state === 'SUBSCRIBED') {
            setLastPingAt(Date.now());
          }
        });

      channelRef.current = channel;
    }

    createHealthChannel();

    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const isConnected = status === 'subscribed';

  return { status, isConnected, lastPingAt };
}
