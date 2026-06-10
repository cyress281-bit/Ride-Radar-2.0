import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { timeAgo } from '@/lib/utils.js';

/**
 * Card displaying a pending connection request with accept/decline actions.
 *
 * @param {Object} props
 * @param {object} props.request
 * @param {object|null} props.fromProfile
 * @param {(req: object) => void} props.onAccept
 * @param {(req: object) => void} props.onDecline
 * @param {boolean} [props.isAccepting]
 */
export default function ConnectionRequestCard({ request, fromProfile, onAccept, onDecline, isAccepting, isDeclining }) {
  return (
    <div className="rounded-[20px] border border-primary/10 p-5 transition-colors hover:border-primary/25">
      <div className="mb-3 flex items-center gap-3">
        {fromProfile?.avatar_url ? (
          <div className="shrink-0 rounded-full" style={{ padding: '3px', background: 'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--brand-radar)) 100%)' }}>
            <img
              src={fromProfile.avatar_url}
              className="h-10 w-10 rounded-full border-2 border-surface object-cover"
              alt=""
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-bold text-primary">
            {fromProfile?.display_name?.[0] || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">{fromProfile?.display_name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo(request.created_at)}</div>
        </div>
      </div>

      {request.message && (
        <p className="mb-3 pl-[52px] text-sm text-muted-foreground">
          &ldquo;{request.message}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onAccept(request)}
          disabled={isAccepting || isDeclining}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95 min-h-[44px] animate-glow-pulse disabled:opacity-50"
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(request)}
          disabled={isDeclining || isAccepting}
          className="rounded-full border-brand-emergency/30 text-brand-emergency hover:bg-brand-emergency/10 active:scale-95 min-h-[44px] disabled:opacity-50"
        >
          <X className="mr-1 h-3.5 w-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}
