import { memo, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRiderSearch } from '@/features/connections/hooks/use-rider-search.js';
import {
  useSendConnectionRequest,
  useAcceptConnectionRequest,
} from '@/features/connections/hooks/use-connection-requests.js';
import { getOrCreateConversation } from '@/lib/conversationUtils.js';
import { toast } from 'sonner';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { Loader2, UserPlus, MessageCircle, Clock } from 'lucide-react';

const ResultCard = memo(function ResultCard({
  result,
  currentUserId,
  friendSet,
  sentSet,
  incomingRequests,
  showActions,
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const uid = result.user_id;
  const displayName = result.display_name || result.username || 'Rider';

  const isFriend = friendSet.has(uid);
  const isPendingSent = sentSet.has(uid);
  const incomingReq = incomingRequests.find((r) => r.from_user_id === uid);
  const isPendingIncoming = !!incomingReq;

  const { mutate: sendRequest, isPending: isSending } = useSendConnectionRequest();
  const { mutate: acceptConn, isPending: isAccepting } = useAcceptConnectionRequest();

  const openChat = useMutation({
    mutationFn: async () => {
      const conv = await getOrCreateConversation({
        participantIds: [currentUserId, uid],
        type: 'friend',
      });
      return conv.id;
    },
    onSuccess: (convoId) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      navigate(`/messages/${convoId}`);
    },
    onError: () => toast.error('Could not open conversation', { description: 'Please try again.' }),
  });

  const handleConnect = () => {
    sendRequest(
      { from_user_id: currentUserId, to_user_id: uid },
      {
        onSuccess: () => toast.success('Request sent'),
        onError: (err) => toast.error('Request failed', { description: err?.message }),
      }
    );
  };

  const handleAccept = () => {
    if (!incomingReq) return;
    acceptConn(incomingReq.id, {
      onSuccess: (conv) => {
        toast.success('Connection accepted');
        if (conv?.id) navigate(`/messages/${conv.id}`);
      },
      onError: (err) => toast.error('Failed to accept', { description: err?.message }),
    });
  };

  if (!showActions) {
    return (
      <button
        type="button"
        onClick={() => navigate(`/profile/${uid}`)}
        className="flex items-center gap-3 p-3.5 w-full rounded-2xl border border-white/[0.06] text-left hover:bg-white/[0.02] active:scale-[0.99] transition-colors"
      >
        <AvatarWithStatus
          url={result.avatar_url}
          name={displayName}
          size="md"
        />
        <VStack className="min-w-0 flex-1">
          <Text variant="bodySm" className="font-semibold truncate">{displayName}</Text>
          {result.username && (
            <Text variant="micro" color="muted">@{result.username}</Text>
          )}
        </VStack>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.06]">
      <button
        type="button"
        onClick={() => navigate(`/profile/${uid}`)}
        className="shrink-0"
        aria-label={`View ${displayName}'s profile`}
      >
        <AvatarWithStatus
          url={result.avatar_url}
          name={displayName}
          size="md"
        />
      </button>
      <button
        type="button"
        onClick={() => navigate(`/profile/${uid}`)}
        className="flex-1 min-w-0 text-left"
      >
        <VStack className="min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">{displayName}</Text>
          {result.username && (
            <Text variant="micro" color="muted">@{result.username}</Text>
          )}
        </VStack>
      </button>
      <div className="shrink-0">
        {isFriend ? (
          <button
            type="button"
            onClick={() => openChat.mutate()}
            disabled={openChat.isPending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              'bg-transparent border border-brand-radar text-brand-radar',
              'hover:bg-brand-radar/10 disabled:opacity-50',
            )}
          >
            {openChat.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <MessageCircle className="w-3.5 h-3.5" />}
            Message
          </button>
        ) : isPendingSent ? (
          <HStack align="center" gap={1.5} className="px-1">
            <Clock className="w-3.5 h-3.5 text-brand-amber" />
            <Text variant="micro" className="text-brand-amber font-medium">Sent</Text>
          </HStack>
        ) : isPendingIncoming ? (
          <button
            type="button"
            onClick={handleAccept}
            disabled={isAccepting}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold',
              'hover:bg-primary/90 disabled:opacity-50 transition-colors',
            )}
          >
            {isAccepting && <Loader2 className="w-3 h-3 animate-spin" />}
            Accept
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={isSending}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors',
              'border border-white/[0.08] text-muted-foreground',
              'hover:text-foreground hover:border-primary/20 hover:bg-surface-elevated disabled:opacity-50',
            )}
          >
            {isSending
              ? <Loader2 className="w-3 h-3 animate-spin" />
              : <UserPlus className="w-3.5 h-3.5" />}
            Connect
          </button>
        )}
      </div>
    </div>
  );
});

function RiderSearch({
  currentUserId,
  friendships = [],
  sentRequests = [],
  pendingRequests = [],
  blockedIds,
  showActions = false,
}) {
  const [query, setQuery] = useState('');
  const { data: results = [], isLoading } = useRiderSearch(query);

  const friendSet = useMemo(() => {
    const set = new Set();
    friendships.forEach((f) => {
      if (f.user_a_id === currentUserId) set.add(f.user_b_id);
      else if (f.user_b_id === currentUserId) set.add(f.user_a_id);
    });
    return set;
  }, [friendships, currentUserId]);

  const sentSet = useMemo(
    () => new Set(sentRequests.map((r) => r.to_user_id)),
    [sentRequests]
  );

  const visibleResults = useMemo(
    () => results.filter((r) => r.user_id !== currentUserId && !blockedIds.has(r.user_id)),
    [results, currentUserId, blockedIds]
  );

  const trimmedQuery = query.trim();

  return (
    <VStack gap={2}>
      <div className="relative">
        <input
          id="rider-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search riders"
          className={cn(
            'w-full rounded-full border border-primary/20 bg-transparent backdrop-blur-xl pl-4 pr-10 py-3 text-base text-foreground',
            'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:border-primary/30',
            'transition-all duration-200 shadow-[0_12px_28px_hsl(0_0%_0%/0.18)] hover:border-primary/35',
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-primary/[0.06] transition-colors"
          >
            <span className="sr-only">Clear search</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" />
            </svg>
          </button>
        )}
      </div>

      {trimmedQuery.length >= 2 && (
        <VStack gap={2}>
          {isLoading ? (
            <HStack align="center" gap={2} className="py-3 px-1">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              <Text variant="caption" color="muted">Searching...</Text>
            </HStack>
          ) : visibleResults.length === 0 ? (
            <div className="py-3 px-1">
              <Text variant="caption" color="muted">No riders found</Text>
            </div>
          ) : (
            visibleResults.map((result) => (
              <ResultCard
                key={result.user_id}
                result={result}
                currentUserId={currentUserId}
                friendSet={friendSet}
                sentSet={sentSet}
                incomingRequests={pendingRequests}
                showActions={showActions}
              />
            ))
          )}
        </VStack>
      )}
    </VStack>
  );
}

export default memo(RiderSearch);
