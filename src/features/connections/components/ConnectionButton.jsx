import { useMemo, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import {
  useConnectionRequests,
  useSentRequests,
  useSendConnectionRequest,
  useAcceptConnectionRequest,
  useDeclineConnectionRequest,
} from '@/features/connections/hooks/use-connection-requests.js';
import { useIsFriend } from '@/features/connections/hooks/use-friendships.js';
import { useIsBlocked } from '@/features/safety/hooks/use-blocks.js';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils.js';
import { UserPlus, Clock, MessageCircle, Check, X, Loader2, Shield } from 'lucide-react';

/**
 * Smart connection button that shows the current relationship state
 * and handles all connection actions.
 *
 * @param {object} props
 * @param {string} props.targetUserId
 * @param {object} [props.profile]
 * @param {string} [props.className]
 */
export default function ConnectionButton({ targetUserId, profile: _profile, className }) {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isMe = user?.id === targetUserId;

  const { data: incomingRequests = [], isLoading: incomingLoading } = useConnectionRequests();
  const { data: sentRequests = [], isLoading: sentLoading } = useSentRequests();
  const { isFriend, isLoading: friendLoading } = useIsFriend(targetUserId);
  const { data: isBlocked = false, isLoading: blockedLoading } = useIsBlocked(targetUserId);

  const incomingRequest = useMemo(
    () => incomingRequests.find((r) => r.from_user_id === targetUserId),
    [incomingRequests, targetUserId]
  );

  const outgoingRequest = useMemo(
    () => sentRequests.find((r) => r.to_user_id === targetUserId),
    [sentRequests, targetUserId]
  );

  const sendRequest = useSendConnectionRequest();
  const acceptRequest = useAcceptConnectionRequest();
  const declineRequest = useDeclineConnectionRequest();

  const openMessage = useMutation({
    mutationFn: async () => {
      const conversation = await getOrCreateConversation({
        participantIds: [user.id, targetUserId],
        type: 'friend',
      });
      return conversation.id;
    },
    onSuccess: (convoId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
  });

  const handleConnect = useCallback(() => {
    if (!user?.id || !targetUserId) return;
    sendRequest.mutate({ from_user_id: user.id, to_user_id: targetUserId });
  }, [user, targetUserId, sendRequest]);

  const handleAccept = useCallback(() => {
    if (!incomingRequest) return;
    acceptRequest.mutate(incomingRequest.id, {
      onSuccess: (conversation) => {
        if (conversation?.id) {
          navigate(`/messages/${conversation.id}`);
        }
      },
    });
  }, [incomingRequest, acceptRequest, navigate]);

  const handleDecline = useCallback(() => {
    if (!incomingRequest) return;
    declineRequest.mutate(incomingRequest.id);
  }, [incomingRequest, declineRequest]);

  const handleMessage = useCallback(() => {
    openMessage.mutate();
  }, [openMessage]);

  const isLoading =
    incomingLoading ||
    sentLoading ||
    friendLoading ||
    blockedLoading ||
    sendRequest.isPending ||
    acceptRequest.isPending ||
    declineRequest.isPending ||
    openMessage.isPending;

  if (!user || isMe) return null;

  if (isBlocked) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled
        className={cn('rounded-full', className)}
      >
        <Shield className="w-3.5 h-3.5 mr-1" />
        Blocked
      </Button>
    );
  }

  // Request received — show accept/decline
  if (incomingRequest) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isLoading}
          className="rounded-full"
        >
          {acceptRequest.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5 mr-1" />
          )}
          Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isLoading}
          className="rounded-full"
        >
          {declineRequest.isPending ? (
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
          ) : (
            <X className="w-3.5 h-3.5 mr-1" />
          )}
          Decline
        </Button>
      </div>
    );
  }

  // Request sent — show pending
  if (outgoingRequest) {
    return (
      <Button size="sm" variant="outline" disabled className={cn('rounded-full', className)}>
        <Clock className="w-3.5 h-3.5 mr-1" />
        Pending
      </Button>
    );
  }

  // Friends — show message
  if (isFriend) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={handleMessage}
        disabled={isLoading}
        className={cn('rounded-full', className)}
      >
        {openMessage.isPending ? (
          <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
        ) : (
          <MessageCircle className="w-3.5 h-3.5 mr-1" />
        )}
        Message
      </Button>
    );
  }

  // Not connected — show connect
  return (
    <Button
      size="sm"
      onClick={handleConnect}
      disabled={isLoading}
      className={cn('rounded-full', className)}
    >
      {sendRequest.isPending ? (
        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
      ) : (
        <UserPlus className="w-3.5 h-3.5 mr-1" />
      )}
      Connect
    </Button>
  );
}
