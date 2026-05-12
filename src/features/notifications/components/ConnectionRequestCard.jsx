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
export default function ConnectionRequestCard({ request, fromProfile, onAccept, onDecline, isAccepting }) {
  return (
    <div className="rr-surface rounded-2xl border border-border/60 p-5 transition-colors hover:border-primary/30">
      <div className="mb-3 flex items-center gap-3">
        {fromProfile?.avatar_url ? (
          <div className="rr-avatar-ring shrink-0" style={{ padding: '3px' }}>
            <img
              src={fromProfile.avatar_url}
              className="h-10 w-10 rounded-full border border-primary/30 object-cover"
              alt=""
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary font-semibold">
            {fromProfile?.display_name?.[0] || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{fromProfile?.display_name}</div>
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
          disabled={isAccepting}
          className="glow-green-sm rounded-full min-h-[44px]"
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(request)}
          className="rounded-full border-primary/20"
        >
          <X className="mr-1 h-3.5 w-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}
