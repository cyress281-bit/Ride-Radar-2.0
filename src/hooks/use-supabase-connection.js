import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase.js';
import { logger } from '@/lib/logger.js';

const HEALTH_CHANNEL_NAME = 'ride-radar-health';
const HEALTH_CHECK_INTERVAL_MS = 30000;

/**
 * Monitor Supabase realtime connection health.
 *
 * @returns {{ status: string, isConnected: boolean, lastPingAt: number|null }}
 */
export function useSupabaseConnection() {
  const [status, setStatus] = useState('unknown');
  const [lastPingAt, setLastPingAt] = useState(null);
  const channelRef = useRef(null);
  const timerRef = useRef(null);

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
            logger.warn('[useSupabaseConnection] Health channel error:', err);
            setStatus('error');
            return;
          }
          setStatus(state.toLowerCase());
          if (state === 'SUBSCRIBED') {
            setLastPingAt(Date.now());
          }
        });

      channelRef.current = channel;
    }

    createHealthChannel();

    // Periodic health ping
    timerRef.current = window.setInterval(() => {
      if (channelRef.current) {
        channelRef.current
          .send({ type: 'broadcast', event: 'ping', payload: {} })
          .catch(() => {
            if (isMounted) setStatus('disconnected');
          });
      }
    }, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      isMounted = false;
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []);

  const isConnected = status === 'subscribed';

  return { status, isConnected, lastPingAt };
}
