import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { sendMessage as apiSendMessage } from '@/features/chat/api/chat-api.js';
import { PRIVATE_MESSAGE_IMAGE_BUCKET, uploadPrivateImage } from '@/lib/image-utils.js';
import { toast } from 'sonner';
import { logger } from '@/lib/logger.js';
import { trackMessageSent } from '@/lib/analytics.js';

/**
 * Hook to send a message in a conversation.
 *
 * Accepts { body, imageFile, _tempId }:
 *   body      — optional text string
 *   imageFile — optional File object; uploaded before insert
 *   _tempId   — stable client ID; used for optimistic dedup
 *
 * Uses React Query's built-in offline-first mutation queuing.
 */
export function useSendMessage(conversationId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ body, imageFile, _tempId } = {}) => {
      if (!user) throw new Error('Must be authenticated to send message');

      const trimmedBody = body?.trim() || null;
      if (!trimmedBody && !imageFile) throw new Error('Message cannot be empty');

      let image_url = null;
      if (imageFile) {
        const path = `messages/${user.id}/${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}`;
        image_url = await uploadPrivateImage(imageFile, PRIVATE_MESSAGE_IMAGE_BUCKET, path, 'message');
      }

      const { data: message, error: messageError } = await apiSendMessage({
        conversation_id: conversationId,
        from_user_id: user.id,
        body: trimmedBody,
        image_url,
      });

      if (messageError) {
        logger.error('[useSendMessage] Error creating message:', messageError);
        throw messageError;
      }

      return message;
    },

    onMutate: async ({ body, imageFile, _tempId } = {}) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId, user?.id] });

      const previousMessages = queryClient.getQueryData(['messages', conversationId, user?.id]);

      const trimmedBody = body?.trim() || null;
      const optimisticImageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

      // Use caller-supplied _tempId so retries replace the same bubble
      const optimisticId = _tempId || `optimistic-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        conversation_id: conversationId,
        from_user_id: user.id,
        body: trimmedBody,
        image_url: optimisticImageUrl,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _pending: true,
        _localImageUrl: optimisticImageUrl,
      };

      queryClient.setQueryData(['messages', conversationId, user?.id], (old = []) => {
        const hasExisting = old.some((m) => m.id === optimisticId);
        if (hasExisting) return old.map((m) => m.id === optimisticId ? { ...optimisticMessage } : m);
        return [...old, optimisticMessage];
      });

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

    onSuccess: (serverMessage, variables, context) => {
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      trackMessageSent();

      queryClient.setQueryData(['messages', conversationId, user?.id], (old = []) =>
        old.map((msg) =>
          msg.id === context.optimisticMessage.id ? serverMessage : msg
        )
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

    onError: (error, variables, context) => {
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      // Mark as failed so the UI can show a retry tap target (not rolled back)
      queryClient.setQueryData(['messages', conversationId, user?.id], (old = []) =>
        old.map((msg) =>
          msg.id === context?.optimisticMessage?.id
            ? { ...msg, _pending: false, _failed: true }
            : msg
        )
      );
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });

      toast.error('Failed to send message', {
        description: error?.message || 'Please try again.',
      });
    },
  });

  return mutation;
}
