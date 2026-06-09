import { memo, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, MessageCircle, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { useFriendships } from '@/features/connections/hooks/use-friendships.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { useAuthState } from '@/features/auth/hooks/use-auth';

function CrewRow({ profile, onClose }) {
  const initials = profile?.display_name?.[0]?.toUpperCase() || '?';
  return (
    <Link
      to={`/profile/${profile?.user_id}`}
      onClick={onClose}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <div className="shrink-0 h-11 w-11 rounded-full overflow-hidden border border-primary/20 bg-primary/10">
        {profile?.avatar_url ? (
          <OptimizedImage
            src={profile.avatar_url}
            alt=""
            containerClassName="h-11 w-11"
            className="rounded-full"
            objectFit="cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary">
            {initials}
          </div>
        )}
      </div>
      <VStack gap={0} className="min-w-0 flex-1">
        <Text variant="bodySm" className="font-semibold truncate">
          {profile?.display_name || 'Rider'}
        </Text>
        {profile?.username && (
          <Text variant="micro" color="muted" className="font-mono-data truncate">
            @{profile.username}
          </Text>
        )}
        {(profile?.bike_make || profile?.bike_model) && (
          <Text variant="micro" color="muted" className="truncate">
            {[profile.bike_make, profile.bike_model].filter(Boolean).join(' ')}
          </Text>
        )}
      </VStack>
    </Link>
  );
}

const ProfileCrewSheet = memo(function ProfileCrewSheet({ connectionsCount, open, onClose }) {
  const { user } = useAuthState();
  const navigate = useNavigate();
  const { data: friendships = [], isLoading: friendshipsLoading } = useFriendships();

  const friendIds = useMemo(
    () => friendships.map((f) => f.user_a_id === user?.id ? f.user_b_id : f.user_a_id),
    [friendships, user?.id]
  );

  const { profiles, isLoading: profilesLoading } = useProfileBatch(open ? friendIds : []);
  const isLoading = friendshipsLoading || profilesLoading;

  const crewList = useMemo(
    () => friendIds.map((id) => profiles.get(id)).filter(Boolean),
    [friendIds, profiles]
  );

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl overflow-y-auto animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Your crew"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 bg-background/90 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
      >
        <HStack align="center" gap={2}>
          <Users className="h-4 w-4 text-primary" />
          <Text variant="h3" className="font-bold">
            {connectionsCount === 1 ? '1 Crew member' : `${connectionsCount} Crew`}
          </Text>
        </HStack>
        <HStack gap={2}>
          <button
            type="button"
            onClick={() => { onClose(); navigate('/messages', { state: { tab: 'crew' } }); }}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold',
              'border border-primary/25 bg-primary/[0.08] text-primary',
              'hover:bg-primary/[0.14] transition-colors'
            )}
            aria-label="Open in Comm"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Comm
          </button>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full',
              'border border-white/[0.08] bg-white/[0.04] text-muted-foreground',
              'hover:bg-white/[0.08] hover:text-foreground transition-colors'
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </HStack>
      </div>

      {/* Content */}
      <div className="px-2 py-3 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : crewList.length === 0 ? (
          <VStack align="center" gap={3} className="py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <Text variant="bodySm" color="muted">No crew yet — connect with riders to build your crew.</Text>
          </VStack>
        ) : (
          <VStack gap={0}>
            {crewList.map((profile) => (
              <CrewRow key={profile.user_id} profile={profile} onClose={onClose} />
            ))}
          </VStack>
        )}
      </div>
    </div>,
    document.body
  );
});

export default ProfileCrewSheet;
