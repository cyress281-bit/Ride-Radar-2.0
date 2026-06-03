/**
 * Blocked Users management page for Ride Radar.
 *
 * Lists users the current rider has blocked and allows unblocking.
 */

import { Shield, UserX, AlertCircle } from 'lucide-react';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { useBlocks, useRemoveBlock } from '@/features/safety/hooks/use-blocks.js';
import { listProfilesByIds } from '@/features/profile/api/profile-api.js';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';


function getInitial(name) {
  return String(name || 'R').trim().charAt(0).toUpperCase();
}

function BlockedUserRow({ block, profile, onUnblock, isUnblocking }) {
  const displayName = profile?.display_name || 'Unknown Rider';
  const username = profile?.username;
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="surface-card p-4">
      <HStack align="center" justify="between" gap={3}>
        <HStack align="center" gap={3} className="min-w-0">
          <Avatar className="h-10 w-10 border border-white/[0.08]">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {getInitial(displayName)}
            </AvatarFallback>
          </Avatar>
          <VStack className="min-w-0">
            <Text variant="bodySm" className="font-semibold truncate">
              {displayName}
            </Text>
            {username && (
              <Text variant="caption" color="muted">
                @{username}
              </Text>
            )}
          </VStack>
        </HStack>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onUnblock(block.id)}
          disabled={isUnblocking}
          className="shrink-0 rounded-full border-border/60 bg-white/[0.03] text-muted-foreground hover:text-foreground hover:bg-white/[0.06] active:scale-[0.96] transition-all"
        >
          {isUnblocking ? 'Unblocking...' : 'Unblock'}
        </Button>
      </HStack>
    </div>
  );
}

function BlockedUsersSkeleton() {
  return (
    <VStack gap={3}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="surface-card p-4">
          <HStack align="center" gap={3}>
            <Skeleton className="h-10 w-10 rounded-full" />
            <VStack gap={1} className="flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </VStack>
          </HStack>
        </div>
      ))}
    </VStack>
  );
}

export default function BlockedUsersPage() {
  const { user } = useAuthState();
  const {
    data: blocks = [],
    isLoading: blocksLoading,
    isError: blocksError,
    error: blocksErrorObj,
  } = useBlocks();

  const blockedUserIds = blocks.map((b) => b.blocked_user_id).filter(Boolean);

  const {
    data: profiles = [],
    isLoading: profilesLoading,
  } = useQuery({
    queryKey: ['profiles', 'blocked', blockedUserIds],
    queryFn: async () => {
      const { data, error } = await listProfilesByIds(blockedUserIds);
      if (error) throw error;
      return data;
    },
    enabled: blockedUserIds.length > 0,
    staleTime: 60_000,
  });

  const removeBlock = useRemoveBlock();

  const profileMap = new Map(profiles.map((p) => [p.user_id, p]));

  const handleUnblock = (blockId) => {
    removeBlock.mutate(blockId);
  };

  const isLoading = blocksLoading || (blockedUserIds.length > 0 && profilesLoading);

  return (
    <div className="min-h-dvh bg-background px-4 py-6 pb-safe text-foreground">
      <VStack gap={5} className="mx-auto max-w-2xl animate-fade-up">
        {/* Header */}
        <div className="relative overflow-hidden surface-card">
          <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full border border-primary/15" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-primary/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute bottom-4 left-5 right-5 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <VStack gap={2} className="relative z-10 p-6">
            <Text variant="micro" className="text-primary font-bold uppercase tracking-wider">
              Privacy & Safety
            </Text>
            <HStack align="center" gap={3}>
              <Shield className="h-8 w-8 text-primary rr-neon-green" />
              <Text as="h1" variant="h2" color="default" className="rr-neon-green">
                Blocked Users
              </Text>
            </HStack>
            <Text variant="bodySm" color="muted">
              Manage riders you have blocked. Unblocking restores their ability to interact with you.
            </Text>
          </VStack>
        </div>

        {/* Error state */}
        {blocksError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-brand-emergency/25 bg-brand-emergency/5 p-4 text-sm text-brand-emergency"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <VStack>
              <Text variant="bodySm" className="font-semibold">
                Could not load blocked users
              </Text>
              <Text variant="caption">
                {blocksErrorObj?.message || 'Please try again later.'}
              </Text>
            </VStack>
          </div>
        )}

        {/* Loading */}
        {isLoading && <BlockedUsersSkeleton />}

        {/* Empty state */}
        {!isLoading && !blocksError && blocks.length === 0 && (
          <div className="surface-card p-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <UserX className="h-6 w-6 text-primary" />
            </div>
            <Text variant="bodySm" className="font-semibold mb-1">
              You haven&apos;t blocked anyone
            </Text>
            <Text variant="caption" color="muted">
              When you block a rider, they will appear here so you can manage them anytime.
            </Text>
          </div>
        )}

        {/* List */}
        {!isLoading && !blocksError && blocks.length > 0 && (
          <VStack gap={3} className="stagger-children">
            {blocks.map((block) => (
              <BlockedUserRow
                key={block.id}
                block={block}
                profile={profileMap.get(block.blocked_user_id)}
                onUnblock={handleUnblock}
                isUnblocking={removeBlock.isPending}
              />
            ))}
          </VStack>
        )}
      </VStack>
    </div>
  );
}
