import { memo, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import {
  useConnectionRequests,
  useSentRequests,
  useAcceptConnectionRequest,
  useDeclineConnectionRequest,
} from '@/features/connections/hooks/use-connection-requests.js';
import { useFriendships } from '@/features/connections/hooks/use-friendships.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { toast } from '@/components/ui/use-toast';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { MessageCircle, Clock, Loader2 } from 'lucide-react';

function SectionHeader({ title }) {
  return (
    <Text variant="micro" color="muted" className="uppercase tracking-widest text-[10px] font-bold px-1 mb-2">
      {title}
    </Text>
  );
}

function SectionEmpty({ message }) {
  return (
    <div className="py-3 px-1">
      <Text variant="caption" color="muted">{message}</Text>
    </div>
  );
}

const RequestCard = memo(function RequestCard({
  request, senderProfile, onAccept, onDecline, isAccepting, isDeclining,
}) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md">
      <AvatarWithStatus
        url={senderProfile?.avatar_url}
        name={senderProfile?.display_name}
        status="offline"
        size="md"
      />
      <VStack flex className="min-w-0">
        <Text variant="bodySm" className="font-semibold truncate">
          {senderProfile?.display_name || 'Rider'}
        </Text>
        {senderProfile?.username && (
          <Text variant="micro" color="muted">@{senderProfile.username}</Text>
        )}
      </VStack>
      <HStack gap={2} className="shrink-0">
        <button
          onClick={() => onDecline(request.id)}
          disabled={isDeclining || isAccepting}
          className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-50 transition-colors"
        >
          Decline
        </button>
        <button
          onClick={() => onAccept(request.id)}
          disabled={isAccepting || isDeclining}
          className={cn(
            'px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold',
            'hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1',
          )}
        >
          {isAccepting && <Loader2 className="w-3 h-3 animate-spin" />}
          Accept
        </button>
      </HStack>
    </div>
  );
});

const SentRequestRow = memo(function SentRequestRow({ request, recipientProfile }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md opacity-70">
      <AvatarWithStatus
        url={recipientProfile?.avatar_url}
        name={recipientProfile?.display_name}
        status="offline"
        size="md"
      />
      <VStack flex className="min-w-0">
        <Text variant="bodySm" className="font-semibold truncate">
          {recipientProfile?.display_name || 'Rider'}
        </Text>
        {recipientProfile?.username && (
          <Text variant="micro" color="muted">@{recipientProfile.username}</Text>
        )}
      </VStack>
      <HStack align="center" gap={1.5} className="shrink-0">
        <Clock className="w-3.5 h-3.5 text-brand-amber" />
        <Text variant="micro" className="text-brand-amber font-medium">Waiting</Text>
      </HStack>
    </div>
  );
});

const FriendRow = memo(function FriendRow({ friendship, friendProfile, currentUserId }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const friendId = friendship.user_a_id === currentUserId ? friendship.user_b_id : friendship.user_a_id;

  const openChat = useMutation({
    mutationFn: async () => {
      const conversation = await getOrCreateConversation({
        participantIds: [currentUserId, friendId],
        type: 'friend',
      });
      return conversation.id;
    },
    onSuccess: (convoId) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
    onError: () => {
      toast({ title: 'Could not open conversation', description: 'Please try again.', variant: 'destructive' });
    },
  });

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md">
      <AvatarWithStatus
        url={friendProfile?.avatar_url}
        name={friendProfile?.display_name}
        status="offline"
        size="md"
      />
      <VStack flex className="min-w-0">
        <Text variant="bodySm" className="font-semibold truncate">
          {friendProfile?.display_name || 'Rider'}
        </Text>
        {friendProfile?.username && (
          <Text variant="micro" color="muted">@{friendProfile.username}</Text>
        )}
      </VStack>
      <button
        onClick={() => openChat.mutate()}
        disabled={openChat.isPending}
        className={cn(
          'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
          'bg-brand-radar/10 border border-brand-radar/20 text-brand-radar',
          'hover:bg-brand-radar/20 disabled:opacity-50',
        )}
      >
        {openChat.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <MessageCircle className="w-3.5 h-3.5" />}
        Message
      </button>
    </div>
  );
});

function CrewTab() {
  const { user } = useAuthState();
  const navigate = useNavigate();

  const { data: pendingRequests = [] } = useConnectionRequests();
  const { data: sentRequests = [] } = useSentRequests();
  const { data: friendships = [] } = useFriendships();
  const { mutate: acceptConn, isPending: isAccepting } = useAcceptConnectionRequest();
  const { mutate: declineConn, isPending: isDeclining } = useDeclineConnectionRequest();

  const allUserIds = useMemo(() => {
    const ids = new Set();
    pendingRequests.forEach((r) => ids.add(r.from_user_id));
    sentRequests.forEach((r) => ids.add(r.to_user_id));
    friendships.forEach((f) => {
      ids.add(f.user_a_id === user?.id ? f.user_b_id : f.user_a_id);
    });
    return Array.from(ids).filter(Boolean);
  }, [pendingRequests, sentRequests, friendships, user?.id]);

  const { profiles } = useProfileBatch(allUserIds);

  const handleAccept = useCallback(
    (requestId) => {
      acceptConn(requestId, {
        onSuccess: (conversation) => {
          if (conversation?.id) navigate(`/messages/${conversation.id}`);
        },
      });
    },
    [acceptConn, navigate],
  );

  const handleDecline = useCallback(
    (requestId) => declineConn(requestId),
    [declineConn],
  );

  return (
    <VStack gap={5} className="pb-8">
      <div>
        <SectionHeader title="Requests" />
        {pendingRequests.length === 0 ? (
          <SectionEmpty message="No requests right now" />
        ) : (
          <VStack gap={2}>
            {pendingRequests.map((req) => (
              <RequestCard
                key={req.id}
                request={req}
                senderProfile={profiles.get(req.from_user_id)}
                onAccept={handleAccept}
                onDecline={handleDecline}
                isAccepting={isAccepting}
                isDeclining={isDeclining}
              />
            ))}
          </VStack>
        )}
      </div>

      <div>
        <SectionHeader title="Waiting" />
        {sentRequests.length === 0 ? (
          <SectionEmpty message="No sent requests" />
        ) : (
          <VStack gap={2}>
            {sentRequests.map((req) => (
              <SentRequestRow
                key={req.id}
                request={req}
                recipientProfile={profiles.get(req.to_user_id)}
              />
            ))}
          </VStack>
        )}
      </div>

      <div>
        <SectionHeader title="Friends" />
        {friendships.length === 0 ? (
          <SectionEmpty message="No crew yet. Find riders on the Radar." />
        ) : (
          <VStack gap={2}>
            {friendships.map((f) => {
              const friendId = f.user_a_id === user?.id ? f.user_b_id : f.user_a_id;
              return (
                <FriendRow
                  key={f.id}
                  friendship={f}
                  friendProfile={profiles.get(friendId)}
                  currentUserId={user.id}
                />
              );
            })}
          </VStack>
        )}
      </div>
    </VStack>
  );
}

export default memo(CrewTab);
