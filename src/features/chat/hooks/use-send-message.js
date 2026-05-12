import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { sendMessage as apiSendMessage } from '@/features/chat/api/chat-api.js';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger.js';

/**
 * Hook to send a message in a conversation.
 *
 * Uses optimistic updates to show the message instantly in the UI.
 * The real-time subscription handles messages from OTHER users only,
 * so we do NOT invalidate the messages query on success.
 */
export function useSendMessage(conversationId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageBody) => {
      if (!user) throw new Error('Must be authenticated to send message');
      if (!messageBody?.trim()) throw new Error('Message cannot be empty');

      const { data: message, error: messageError } = await apiSendMessage({
        conversation_id: conversationId,
        from_user_id: user.id,
        body: messageBody.trim(),
      });

      if (messageError) {
        logger.error('[useSendMessage] Error creating message:', messageError);
        throw messageError;
      }

      return message;
    },

    onMutate: async (messageBody) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId,
        from_user_id: user.id,
        body: messageBody.trim(),
        created_at: new Date().toISOString(),
        _optimistic: true,
      };

      queryClient.setQueryData(['messages', conversationId], (old = []) => [
        ...old,
        optimisticMessage,
      ]);

      queryClient.setQueryData(['conversations', user?.id], (old = []) => {
        const updated = old.map((conv) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: new Date().toISOString() }
            : conv
        );
        return updated.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        );
      });

      return { previousMessages, optimisticMessage };
    },

    onSuccess: (serverMessage, _messageBody, context) => {
      queryClient.setQueryData(['messages', conversationId], (old = []) =>
        old.map((msg) =>
          msg.id === context.optimisticMessage.id ? serverMessage : msg
        )
      );

      queryClient.setQueryData(['conversation', conversationId], (old) =>
        old ? { ...old, last_message_at: serverMessage.created_at } : old
      );

      queryClient.setQueryData(['conversations', user?.id], (old = []) => {
        const updated = old.map((conv) =>
          conv.id === conversationId
            ? { ...conv, last_message_at: serverMessage.created_at }
            : conv
        );
        return updated.sort(
          (a, b) =>
            new Date(b.last_message_at || 0).getTime() -
            new Date(a.last_message_at || 0).getTime()
        );
      });
    },

    onError: (error, _messageBody, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });

      toast({
        title: 'Failed to send message',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
