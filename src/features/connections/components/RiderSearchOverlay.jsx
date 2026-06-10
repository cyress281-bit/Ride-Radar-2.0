import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Loader2, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack } from '@/components/ui/primitives/Stack';
import OptimizedImage from '@/components/shared/OptimizedImage';
import { useRiderSearch } from '@/features/connections/hooks/use-rider-search.js';
import { useFriendships } from '@/features/connections/hooks/use-friendships.js';
import { useSentRequests } from '@/features/connections/hooks/use-connection-requests.js';
import { useAuthState } from '@/features/auth/hooks/use-auth';

function RiderRow({ profile, onClose, isFriend, isPending }) {
  const initials = profile.display_name?.[0]?.toUpperCase() || '?';
  const bike = [profile.bike_make, profile.bike_model].filter(Boolean).join(' ');

  return (
    <Link
      to={`/profile/${profile.user_id}`}
      onClick={onClose}
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <div className="shrink-0 h-11 w-11 rounded-full overflow-hidden border border-primary/20 bg-primary/10">
        {profile.avatar_url ? (
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
        <div className="flex items-center gap-2 min-w-0">
          <Text variant="bodySm" className="font-semibold truncate">
            {profile.display_name || 'Rider'}
          </Text>
          {isFriend && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-primary/25 bg-primary/10 text-primary">
              Friend
            </span>
          )}
          {!isFriend && isPending && (
            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-brand-amber/25 bg-brand-amber/10 text-brand-amber">
              Pending
            </span>
          )}
        </div>
        {profile.username && (
          <Text variant="micro" color="muted" className="font-mono-data truncate">
            @{profile.username}
          </Text>
        )}
        {bike && (
          <Text variant="micro" color="muted" className="truncate">
            {bike}
          </Text>
        )}
      </VStack>
    </Link>
  );
}

const RiderSearchOverlay = memo(function RiderSearchOverlay({ open, onClose }) {
  const { user } = useAuthState();
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  const friendIdsArray = useMemo(() => Array.from(friendIds), [friendIds]);
  const { data: results = [], isFetching } = useRiderSearch(query, friendIdsArray);
  const { data: friendships = [] } = useFriendships();
  const { data: sentRequests = [] } = useSentRequests();

  // Build sets for O(1) status lookup
  const friendIds = useMemo(
    () => new Set(friendships.map((f) => f.user_a_id === user?.id ? f.user_b_id : f.user_a_id)),
    [friendships, user?.id]
  );
  const pendingIds = useMemo(
    () => new Set(sentRequests.filter((r) => r.status === 'pending').map((r) => r.to_user_id)),
    [sentRequests]
  );

  // Filter out current user from results
  const filtered = results.filter((p) => p.user_id !== user?.id);

  // Auto-focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  if (!open) return null;

  const showPrompt = query.trim().length < 2;
  const showEmpty = !showPrompt && !isFetching && filtered.length === 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-background/98 backdrop-blur-xl animate-fade-up overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label="Search riders"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-white/[0.06] px-4"
        style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))', paddingBottom: '0.75rem' }}
      >
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search riders by name or username…"
              className={cn(
                'w-full rounded-full border border-primary/20 bg-primary/[0.05]',
                'pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:border-primary/40 focus:bg-primary/[0.08]',
                'transition-all duration-150'
              )}
              style={{ fontSize: '16px' }}
              autoComplete="off"
              spellCheck={false}
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'shrink-0 flex h-9 w-9 items-center justify-center rounded-full',
              'border border-white/[0.08] bg-white/[0.04] text-muted-foreground',
              'hover:bg-white/[0.08] hover:text-foreground transition-colors'
            )}
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="px-2 py-3 max-w-lg mx-auto">
        {showPrompt ? (
          <VStack align="center" gap={3} className="py-16 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <Text variant="bodySm" color="muted">Type at least 2 characters to find riders.</Text>
          </VStack>
        ) : showEmpty ? (
          <VStack align="center" gap={2} className="py-16 px-4 text-center">
            <Text variant="bodySm" color="muted">No riders found for &ldquo;{query}&rdquo;.</Text>
          </VStack>
        ) : (
          <VStack gap={0}>
            {filtered.map((profile) => (
              <RiderRow
                key={profile.user_id}
                profile={profile}
                onClose={onClose}
                isFriend={friendIds.has(profile.user_id)}
                isPending={pendingIds.has(profile.user_id)}
              />
            ))}
          </VStack>
        )}
      </div>
    </div>,
    document.body
  );
});

export default RiderSearchOverlay;
