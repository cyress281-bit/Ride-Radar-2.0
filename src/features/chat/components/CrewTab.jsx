import { memo, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useFriendships } from '@/features/connections/hooks/use-friendships.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { toast } from 'sonner';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { MessageCircle, Loader2, Users } from 'lucide-react';

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
      toast.error('Could not open conversation', { description: 'Please try again.' });
    },
  });

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md">
      <button
        type="button"
        onClick={() => navigate(`/profile/${friendId}`)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left"
      >
        <AvatarWithStatus
          url={friendProfile?.avatar_url}
          name={friendProfile?.display_name}
          status="offline"
          size="md"
        />
        <VStack className="min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">
            {friendProfile?.display_name || 'Rider'}
          </Text>
          {friendProfile?.username && (
            <Text variant="micro" color="muted">@{friendProfile.username}</Text>
          )}
        </VStack>
      </button>
      <button
        type="button"
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
  const { data: friendships = [] } = useFriendships();
  const { blockedIds } = useBlockedIds();

  const visibleFriendships = useMemo(() => friendships.filter((f) => {
    const friendId = f.user_a_id === user?.id ? f.user_b_id : f.user_a_id;
    return !blockedIds.has(friendId);
  }), [friendships, blockedIds, user?.id]);

  const friendIds = useMemo(
    () => visibleFriendships.map((f) => (f.user_a_id === user?.id ? f.user_b_id : f.user_a_id)),
    [visibleFriendships, user?.id],
  );

  const { profiles } = useProfileBatch(friendIds);

  return (
    <VStack gap={2} className="pb-8">
      {visibleFriendships.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-surface/60 backdrop-blur-md mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <Text variant="bodySm" className="font-semibold text-foreground mb-1">No friends yet</Text>
          <Text variant="caption" color="muted">Connect with riders to start building your crew.</Text>
        </div>
      ) : (
        <VStack gap={2}>
          {visibleFriendships.map((f) => {
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
    </VStack>
  );
}

export default memo(CrewTab);
