import { memo, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useConnectionRequests,
  useSentRequests,
  useAcceptConnectionRequest,
  useDeclineConnectionRequest,
} from '@/features/connections/hooks/use-connection-requests.js';
import { useBlockedIds } from '@/hooks/use-blocked-ids.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { AvatarWithStatus } from '@/components/shared/AvatarWithStatus';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { cn } from '@/lib/utils.js';
import { Loader2, Clock, UserPlus } from 'lucide-react';

function SectionHeader({ title }) {
  return (
    <Text variant="micro" color="muted" className="uppercase tracking-widest text-[10px] font-bold px-1 mb-2">
      {title}
    </Text>
  );
}

const IncomingRequestRow = memo(function IncomingRequestRow({ request, senderProfile }) {
  const navigate = useNavigate();
  const { mutate: accept, isPending: isAccepting } = useAcceptConnectionRequest();
  const { mutate: decline, isPending: isDeclining } = useDeclineConnectionRequest();

  const handleAccept = useCallback(() => {
    accept(request.id, {
      onSuccess: (conversation) => {
        if (conversation?.id) navigate(`/messages/${conversation.id}`);
      },
    });
  }, [accept, request.id, navigate]);

  const handleDecline = useCallback(() => {
    decline(request.id);
  }, [decline, request.id]);

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md">
      <button
        type="button"
        onClick={() => navigate(`/profile/${request.from_user_id}`)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left"
      >
        <AvatarWithStatus
          url={senderProfile?.avatar_url}
          name={senderProfile?.display_name}
          status="offline"
          size="md"
        />
        <VStack className="min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">
            {senderProfile?.display_name || 'Rider'}
          </Text>
          {senderProfile?.username && (
            <Text variant="micro" color="muted">@{senderProfile.username}</Text>
          )}
          <Text variant="micro" color="muted">Sent you a friend request.</Text>
        </VStack>
      </button>

      <HStack gap={2} className="shrink-0">
        <button
          type="button"
          onClick={handleDecline}
          disabled={isDeclining || isAccepting}
          className="px-3 py-1.5 rounded-full border border-white/[0.08] text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated disabled:opacity-50 transition-colors"
        >
          Decline
        </button>
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAccepting || isDeclining}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold',
            'hover:bg-primary/90 disabled:opacity-50 transition-colors',
          )}
        >
          {isAccepting && <Loader2 className="w-3 h-3 animate-spin" />}
          Accept
        </button>
      </HStack>
    </div>
  );
});

const OutgoingRequestRow = memo(function OutgoingRequestRow({ request, recipientProfile }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-white/[0.04] bg-surface/60 backdrop-blur-md opacity-70">
      <button
        type="button"
        onClick={() => navigate(`/profile/${request.to_user_id}`)}
        className="flex flex-1 items-center gap-3 min-w-0 text-left"
      >
        <AvatarWithStatus
          url={recipientProfile?.avatar_url}
          name={recipientProfile?.display_name}
          status="offline"
          size="md"
        />
        <VStack className="min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">
            {recipientProfile?.display_name || 'Rider'}
          </Text>
          {recipientProfile?.username && (
            <Text variant="micro" color="muted">@{recipientProfile.username}</Text>
          )}
          <Text variant="micro" color="muted">You sent a friend request.</Text>
        </VStack>
      </button>

      <HStack align="center" gap={1.5} className="shrink-0">
        <Clock className="w-3.5 h-3.5 text-brand-amber" />
        <Text variant="micro" className="text-brand-amber font-medium">Sent</Text>
      </HStack>
    </div>
  );
});

function RequestsTab() {
  const { data: incoming = [] } = useConnectionRequests();
  const { data: sent = [] } = useSentRequests();
  const { blockedIds } = useBlockedIds();

  const allIds = useMemo(() => {
    const ids = new Set();
    incoming.forEach((r) => ids.add(r.from_user_id));
    sent.forEach((r) => ids.add(r.to_user_id));
    return Array.from(ids).filter(Boolean);
  }, [incoming, sent]);

  const { profiles } = useProfileBatch(allIds);

  const visibleIncoming = useMemo(
    () => incoming.filter((r) => !blockedIds.has(r.from_user_id)),
    [incoming, blockedIds],
  );

  const visibleSent = useMemo(
    () => sent.filter((r) => !blockedIds.has(r.to_user_id)),
    [sent, blockedIds],
  );

  const isEmpty = visibleIncoming.length === 0 && visibleSent.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.06] bg-surface/60 backdrop-blur-md mb-4">
          <UserPlus className="h-6 w-6 text-muted-foreground" />
        </div>
        <Text variant="bodySm" className="font-semibold text-foreground mb-1">No pending requests</Text>
        <Text variant="caption" color="muted">Riders who connect with you will appear here.</Text>
      </div>
    );
  }

  return (
    <VStack gap={5} className="pb-8">
      {visibleIncoming.length > 0 && (
        <div>
          <SectionHeader title="Requests" />
          <VStack gap={2}>
            {visibleIncoming.map((r) => (
              <IncomingRequestRow
                key={r.id}
                request={r}
                senderProfile={profiles.get(r.from_user_id)}
              />
            ))}
          </VStack>
        </div>
      )}

      {visibleSent.length > 0 && (
        <div>
          <SectionHeader title="Sent" />
          <VStack gap={2}>
            {visibleSent.map((r) => (
              <OutgoingRequestRow
                key={r.id}
                request={r}
                recipientProfile={profiles.get(r.to_user_id)}
              />
            ))}
          </VStack>
        </div>
      )}
    </VStack>
  );
}

export default memo(RequestsTab);
