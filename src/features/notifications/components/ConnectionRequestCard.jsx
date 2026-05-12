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
    <div className="rounded-[20px] border border-[hsl(220_12%_16%)] bg-[hsl(220_20%_7%)] p-5 transition-colors hover:border-[#6BBF00]/20">
      <div className="mb-3 flex items-center gap-3">
        {fromProfile?.avatar_url ? (
          <div className="shrink-0 rounded-full" style={{ padding: '3px', background: 'linear-gradient(135deg, #6BBF00 0%, #00AEEF 100%)' }}>
            <img
              src={fromProfile.avatar_url}
              className="h-10 w-10 rounded-full border-2 border-[hsl(220_20%_7%)] object-cover"
              alt=""
            />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[hsl(220_12%_16%)] bg-[hsl(220_25%_4%)] text-sm font-semibold text-[hsl(0_0%_96%)]">
            {fromProfile?.display_name?.[0] || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-[hsl(0_0%_96%)]">{fromProfile?.display_name}</div>
          <div className="text-xs text-[hsl(220_8%_52%)]">{timeAgo(request.created_at)}</div>
        </div>
      </div>

      {request.message && (
        <p className="mb-3 pl-[52px] text-sm text-[hsl(220_8%_52%)]">
          &ldquo;{request.message}&rdquo;
        </p>
      )}

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onAccept(request)}
          disabled={isAccepting}
          className="rounded-full bg-[#6BBF00] text-white hover:bg-[#5aa800] active:scale-95 min-h-[44px]"
        >
          <Check className="mr-1 h-3.5 w-3.5" /> Accept
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onDecline(request)}
          className="rounded-full border-[#E30613]/40 text-[#E30613] hover:bg-[#E30613]/10 active:scale-95"
        >
          <X className="mr-1 h-3.5 w-3.5" /> Decline
        </Button>
      </div>
    </div>
  );
}
