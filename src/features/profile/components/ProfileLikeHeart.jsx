import { memo } from 'react';
import { cn } from '@/lib/utils.js';

/**
 * Profile like heart with EKG pulse line through the interior.
 * - Interactive (canLike=true): tapping toggles like state
 * - Display-only (canLike=false): shows count only, no tap
 */
const ProfileLikeHeart = memo(function ProfileLikeHeart({ likeCount = 0, isLiked = false, onToggle, canLike = false, isPending = false }) {
  const Component = canLike ? 'button' : 'div';

  return (
    <Component
      type={canLike ? 'button' : undefined}
      onClick={canLike && !isPending ? onToggle : undefined}
      disabled={isPending}
      className={cn(
        'flex flex-col items-center gap-1 select-none',
        canLike && 'cursor-pointer active:scale-90 transition-transform duration-150',
        isPending && 'opacity-70'
      )}
      aria-label={canLike ? (isLiked ? 'Unlike profile' : 'Like profile') : undefined}
    >
      <div className="relative h-10 w-10">
        <svg
          viewBox="0 0 40 38"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full overflow-visible"
        >
          {/* Heart fill (only visible when liked) */}
          {isLiked && (
            <path
              d="M20 35 C20 35 3 24 3 13 C3 7.5 7.5 3 13 3 C16.2 3 19 4.8 20 7 C21 4.8 23.8 3 27 3 C32.5 3 37 7.5 37 13 C37 24 20 35 20 35Z"
              fill="hsl(var(--destructive))"
              className="transition-all duration-300"
            />
          )}

          {/* Heart outline */}
          <path
            d="M20 35 C20 35 3 24 3 13 C3 7.5 7.5 3 13 3 C16.2 3 19 4.8 20 7 C21 4.8 23.8 3 27 3 C32.5 3 37 7.5 37 13 C37 24 20 35 20 35Z"
            stroke="hsl(var(--destructive))"
            strokeWidth="2"
            strokeLinejoin="round"
            fill="none"
            className="transition-all duration-300"
          />

          {/* EKG pulse line through the heart interior */}
          <path
            d="M6 17 L11 17 L13 11 L15 22 L17 14 L19 20 L21 17 L23 17 L25 12 L27 22 L29 17 L34 17"
            stroke="hsl(var(--primary))"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            className="ekg-pulse"
          />
        </svg>
      </div>

      <span className={cn(
        'text-[11px] font-bold tabular-nums leading-none',
        isLiked ? 'text-destructive' : 'text-muted-foreground'
      )}>
        {likeCount}
      </span>
    </Component>
  );
});

export default ProfileLikeHeart;
