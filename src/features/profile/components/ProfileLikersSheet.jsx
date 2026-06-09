import { memo } from 'react';
import { createPortal } from 'react-dom';
import { X, Heart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { useProfileLikers } from '@/features/profile/hooks/use-profile-like.js';

function LikerRow({ liker, onClose }) {
  const initials = liker.display_name?.[0]?.toUpperCase() || '?';
  return (
    <Link
      to={`/profile/${liker.user_id}`}
      onClick={onClose}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <div className="shrink-0 h-11 w-11 rounded-full overflow-hidden border border-primary/20 bg-primary/10">
        {liker.avatar_url ? (
          <OptimizedImage
            src={liker.avatar_url}
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
          {liker.display_name || 'Rider'}
        </Text>
        {liker.username && (
          <Text variant="micro" color="muted" className="font-mono-data truncate">
            @{liker.username}
          </Text>
        )}
        {(liker.bike_make || liker.bike_model) && (
          <Text variant="micro" color="muted" className="truncate">
            {[liker.bike_make, liker.bike_model].filter(Boolean).join(' ')}
          </Text>
        )}
      </VStack>
    </Link>
  );
}

const ProfileLikersSheet = memo(function ProfileLikersSheet({ userId, likeCount, open, onClose }) {
  const { data: likers = [], isLoading } = useProfileLikers(userId, { enabled: open });

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl overflow-y-auto animate-fade-up"
      role="dialog"
      aria-modal="true"
      aria-label="Riders who liked your profile"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 bg-background/90 backdrop-blur-xl border-b border-white/[0.06]"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
      >
        <HStack align="center" gap={2}>
          <Heart className="h-4 w-4 text-destructive" fill="currentColor" />
          <Text variant="h3" className="font-bold">
            {likeCount === 1 ? '1 Like' : `${likeCount} Likes`}
          </Text>
        </HStack>
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
      </div>

      {/* Content */}
      <div className="px-2 py-3 max-w-lg mx-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : likers.length === 0 ? (
          <VStack align="center" gap={3} className="py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20">
              <Heart className="h-6 w-6 text-destructive" />
            </div>
            <Text variant="bodySm" color="muted">No likes yet — share your profile to get noticed.</Text>
          </VStack>
        ) : (
          <VStack gap={0}>
            {likers.map((liker) => (
              <LikerRow key={liker.user_id} liker={liker} onClose={onClose} />
            ))}
          </VStack>
        )}
      </div>
    </div>,
    document.body
  );
});

export default ProfileLikersSheet;
