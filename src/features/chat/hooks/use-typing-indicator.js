import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase.js';

// Local: stop broadcasting "typing" after this much keystroke idle time.
const TYPING_STOP_DELAY = 2500;
// Receiver: auto-clear the indicator if no further update arrives (covers a
// missed "stop" event, e.g. the other rider backgrounds the app mid-type).
const TYPING_CLEAR_DELAY = 4000;

/**
 * Ephemeral typing indicator over Supabase Realtime broadcast (no DB writes).
 *
 * Both riders join the same `typing:<conversationId>` channel. Typing state is
 * pure pub/sub — nothing is persisted. The conversation id is an unguessable
 * UUID and the payload carries only { userId, typing }, no message content.
 *
 * @param {string|null} conversationId
 * @param {string|null} currentUserId
 * @returns {{ isOtherTyping: boolean, notifyTyping: () => void }}
 */
export function useTypingIndicator(conversationId, currentUserId) {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const channelRef = useRef(null);
  const isTypingRef = useRef(false);
  const stopTimerRef = useRef(null);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    if (!conversationId || !currentUserId) return undefined;

    // Shared channel name (NOT per-instance) so both riders are on the same
    // channel — this is broadcast pub/sub, not a postgres_changes subscription.
    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (!payload || payload.userId === currentUserId) return;
        if (payload.typing) {
          setIsOtherTyping(true);
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
          clearTimerRef.current = setTimeout(() => setIsOtherTyping(false), TYPING_CLEAR_DELAY);
        } else {
          setIsOtherTyping(false);
          if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      supabase.removeChannel(channel);
      channelRef.current = null;
      isTypingRef.current = false;
      setIsOtherTyping(false);
    };
  }, [conversationId, currentUserId]);

  const sendTyping = useCallback((typing) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserId, typing } });
  }, [currentUserId]);

  // Call on each keystroke. Emits a single "typing: true" on the leading edge,
  // then a "typing: false" once keystrokes stop for TYPING_STOP_DELAY.
  const notifyTyping = useCallback(() => {
    if (!channelRef.current) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      sendTyping(true);
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      sendTyping(false);
    }, TYPING_STOP_DELAY);
  }, [sendTyping]);

  return { isOtherTyping, notifyTyping };
}
