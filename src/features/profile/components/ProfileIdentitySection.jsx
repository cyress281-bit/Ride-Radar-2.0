import { memo } from 'react';
import { Bike, Users, Heart } from 'lucide-react';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import StatPill from '@/features/profile/components/StatPill.jsx';

/**
 * Shared identity block used by both ProfilePage (own) and RiderProfilePage (other user).
 *
 * Slots:
 *   nameBadges   — ReactNode rendered after the display name (Friend/Pending badges on rider view)
 *   statusBanner — ReactNode rendered after the bio (Blocked status on rider view)
 *
 * Ownership-specific content (settings gear, edit button, action buttons) stays in the
 * parent page — this component is purely presentational.
 */
const ProfileIdentitySection = memo(function ProfileIdentitySection({
  profile,
  displayName,
  avatarError,
  onAvatarError,
  canSeeDetails = true,
  // Like system
  likeCount = 0,
  isLiked = false,
  onToggleLike,
  onLikesPress,
  likePending = false,
  // Stats
  connectionsCount = 0,
  connectionsLoading = false,
  onCrewPress,
  bikePillLabel,
  // Page-specific slots
  nameBadges,
  statusBanner,
}) {
  return (
    <VStack align="center" gap={3}>
      {/* Avatar */}
      <div className="relative">
        <div className="rr-avatar-ring shadow-[0_0_28px_hsl(var(--primary)/0.18)]">
          {canSeeDetails && profile?.avatar_url && !avatarError ? (
            <OptimizedImage
              src={profile.avatar_url}
              alt=""
              containerClassName="h-28 w-28 shrink-0 rounded-full"
              className="rounded-full"
              objectFit="cover"
              loading="eager"
              fetchPriority="high"
              fadeInDuration={200}
              showSkeleton
              onError={onAvatarError}
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 via-brand-radar/20 to-brand-amber/20 font-display text-4xl font-bold text-primary">
              {canSeeDetails ? (profile?.display_name?.[0]?.toUpperCase() || '?') : '?'}
            </div>
          )}
        </div>
      </div>

      {/* Name & Username */}
      <VStack align="center" gap={0.5}>
        <HStack align="center" gap={2}>
          <Text as="h1" variant="h2" color="default" align="center" className="font-bold tracking-[-0.03em]">
            {canSeeDetails ? (displayName || profile?.display_name) : 'Private Rider'}
          </Text>
          {nameBadges}
        </HStack>
        {canSeeDetails && profile?.username && (
          <Text variant="bodySm" color="muted" className="font-mono-data">
            @{profile.username}
          </Text>
        )}
      </VStack>

      {/* Bio */}
      {canSeeDetails && profile?.bio && (
        <Text variant="body" color="default" align="center" className="max-w-sm text-pretty leading-relaxed text-white/88">
          {profile.bio}
        </Text>
      )}

      {/* Page-specific status banner (e.g. Blocked notice) */}
      {statusBanner}

      {/* Stats Row */}
      {canSeeDetails && (
        <HStack gap={2} className="w-full mt-1">
          <StatPill
            icon={Heart}
            label="Likes"
            value={likeCount}
            brand="red"
            filled={isLiked}
            onClick={onToggleLike && !likePending ? onToggleLike : onLikesPress}
          />
          <StatPill
            icon={Users}
            label="Crew"
            value={connectionsCount}
            isLoading={connectionsLoading}
            brand="green"
            onClick={onCrewPress}
          />
          <StatPill
            icon={Bike}
            label="Bike"
            value={bikePillLabel || 'Not set'}
            brand="blue"
          />
        </HStack>
      )}
    </VStack>
  );
});

export default ProfileIdentitySection;
