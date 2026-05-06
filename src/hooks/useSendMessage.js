import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { logger } from '@/lib/logger';

/**
 * Hook to send a message in a conversation
 *
 * Uses optimistic updates to show the message instantly in the UI.
 * The real-time subscription handles messages from OTHER users only.
 * This eliminates the double-refetch problem where both onSuccess invalidation
 * and real-time subscription would trigger separate refetches.
 */
export function useSendMessage(conversationId) {
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageBody) => {
      if (!user) throw new Error('Must be authenticated to send message');
      if (!messageBody?.trim()) throw new Error('Message cannot be empty');

      // Insert message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          from_user_id: user.id,
          body: messageBody.trim(),
        })
        .select()
        .single();

      if (messageError) {
        logger.error('[useSendMessage] Error creating message:', messageError);
        throw messageError;
      }

      // Update conversation's last_message_at
      const { error: conversationError } = await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (conversationError) {
        logger.error('[useSendMessage] Error updating conversation:', conversationError);
        // Don't throw - message was sent successfully
      }

      return message;
    },

    // Optimistic update: show message immediately before server confirms
    onMutate: async (messageBody) => {
      // Cancel any in-flight refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      // Snapshot the previous messages for rollback
      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      // Optimistically add the new message to the cache
      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId,
        from_user_id: user.id,
        body: messageBody.trim(),
        created_at: new Date().toISOString(),
        _optimistic: true, // Flag to identify optimistic messages
      };

      queryClient.setQueryData(['messages', conversationId], (old = []) => [
        ...old,
        optimisticMessage,
      ]);

      // Also optimistically update conversations list (last_message_at)
      queryClient.setQueryData(['conversations', user.id], (old = []) =>
        old.map((conv) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        )
      );

      return { previousMessages, optimisticMessage };
    },

    // On success: replace optimistic message with the real server response
    onSuccess: (serverMessage, _messageBody, context) => {
      queryClient.setQueryData(['messages', conversationId], (old = []) =>
        old.map((msg) =>
          msg.id === context.optimisticMessage.id ? serverMessage : msg
        )
      );

      // No invalidation needed - real-time handles other users' messages,
      // and we just replaced our optimistic message with the real one.
      // Only softly update conversation metadata (no full refetch)
      queryClient.setQueryData(['conversation', conversationId], (old) =>
        old ? { ...old, last_message_at: serverMessage.created_at } : old
      );
    },

    // On error: roll back the optimistic update
    onError: (_error, _messageBody, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
      // Roll back conversation list update
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
  });
}
