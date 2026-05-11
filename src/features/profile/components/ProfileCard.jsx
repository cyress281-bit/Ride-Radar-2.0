/**
 * Compact profile card for lists and detail views.
 *
 * Props:
 * - profile: user_profiles row
 * - showActions: boolean — render Connect / Message buttons
 * - onMessage: () => void
 * - onConnect: () => void
 */

import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { Bike, MessageCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OptimizedAvatar } from '@/components/shared/OptimizedImage';

const ProfileCard = memo(function ProfileCard({
  profile,
  showActions = false,
  onMessage,
  onConnect,
}) {
  if (!profile) return null;

  const bikeLabel = [profile.bike_year, profile.bike_make, profile.bike_model]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-border/60 bg-black/30 p-3 backdrop-blur-sm',
        'transition-colors hover:border-border/80'
      )}
    >
      <Link to={`/rider/${profile.user_id}`} className="shrink-0">
        <OptimizedAvatar
          src={profile.avatar_url}
          fallbackInitial={profile.display_name?.[0]?.toUpperCase()}
          size={48}
          className="border border-primary/20"
        />
      </Link>

      <div className="min-w-0 flex-1">
        <Link to={`/rider/${profile.user_id}`} className="block min-w-0">
          <h3 className="truncate text-sm font-bold text-foreground">
            {profile.display_name || 'Rider'}
          </h3>
          {profile.username && (
            <p className="truncate text-xs text-muted-foreground">@{profile.username}</p>
          )}
        </Link>
        {bikeLabel && (
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <Bike className="h-3 w-3" />
            <span className="truncate">{bikeLabel}</span>
          </div>
        )}
      </div>

      {showActions && (
        <div className="flex shrink-0 gap-2">
          {onMessage && (
            <button
              onClick={onMessage}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-secondary/20',
                'text-muted-foreground transition hover:border-primary/40 hover:text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label="Message"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          )}
          {onConnect && (
            <button
              onClick={onConnect}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border border-primary/25 bg-primary/10',
                'text-primary transition hover:bg-primary/15',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label="Connect"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default ProfileCard;
