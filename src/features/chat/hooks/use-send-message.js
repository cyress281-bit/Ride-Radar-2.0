import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { sendMessage as apiSendMessage } from '@/features/chat/api/chat-api.js';
import { PRIVATE_MESSAGE_IMAGE_BUCKET, uploadPrivateImage } from '@/lib/image-utils.js';
import { toast } from '@/components/ui/use-toast';
import { logger } from '@/lib/logger.js';
import { trackMessageSent } from '@/lib/analytics.js';

/**
 * Hook to send a message in a conversation.
 *
 * Accepts { body, imageFile }:
 *   body      — optional text string
 *   imageFile — optional File object; uploaded before insert
 *
 * Uses optimistic updates to show the message instantly. Images use a local
 * object URL for the optimistic bubble, replaced by a signed URL on success.
 */
export function useSendMessage(conversationId) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ body, imageFile } = {}) => {
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

    onMutate: async ({ body, imageFile } = {}) => {
      await queryClient.cancelQueries({ queryKey: ['messages', conversationId] });

      const previousMessages = queryClient.getQueryData(['messages', conversationId]);

      const trimmedBody = body?.trim() || null;
      // Create a local object URL so the optimistic bubble shows the image immediately
      const optimisticImageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

      const optimisticMessage = {
        id: `optimistic-${Date.now()}`,
        conversation_id: conversationId,
        from_user_id: user.id,
        body: trimmedBody,
        image_url: optimisticImageUrl,
        created_at: new Date().toISOString(),
        _optimistic: true,
        _localImageUrl: optimisticImageUrl,
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

    onSuccess: (serverMessage, _variables, context) => {
      // Revoke local object URL now that we have the real signed URL
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      trackMessageSent();

      queryClient.setQueryData(['messages', conversationId], (old = []) =>
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

    onError: (error, _variables, context) => {
      // Revoke local object URL on failure
      if (context?.optimisticMessage?._localImageUrl) {
        URL.revokeObjectURL(context.optimisticMessage._localImageUrl);
      }

      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', conversationId], context.previousMessages);
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });

      toast({
        title: 'Failed to send message',
        description: error?.message || 'Please try again.',
        variant: 'destructive',
      });
    },
  });
}
