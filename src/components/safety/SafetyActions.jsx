import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthState } from '@/features/auth/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, ShieldOff, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsBlocked, useCreateBlock } from '@/features/safety/hooks/use-blocks.js';
import { useCreateReport } from '@/features/safety/hooks/use-reports.js';

const reasons = [
  { value: 'safety', label: 'Safety concern' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'illegal', label: 'Illegal activity' },
  { value: 'privacy', label: 'Privacy issue' },
  { value: 'other', label: 'Other' },
];

const DETAILS_MAX_LENGTH = 500;

/**
 * SafetyActions - Report and block UI for community safety.
 *
 * Uses safety API hooks instead of direct Supabase queries.
 */
export default function SafetyActions({
  targetType,
  targetId,
  targetProfileId,
  targetParentId,
  targetContext,
  compact = false,
  className,
}) {
  const { user } = useAuthState();
  const [mode, setMode] = useState(null);
  const [reason, setReason] = useState('safety');
  const [details, setDetails] = useState('');
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);

  const canBlock = targetProfileId && targetProfileId !== user?.id;

  const { data: isBlocked = false, isLoading: blocksLoading } = useIsBlocked(targetProfileId);
  const createBlock = useCreateBlock();
  const createReport = useCreateReport();

  // Focus management - focus panel when opened
  useEffect(() => {
    if (mode === 'report' || mode === 'block') {
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  // Escape key to close panel
  useEffect(() => {
    if (!mode || mode === 'reported' || mode === 'blocked') return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setMode(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  const handleSubmit = useCallback(() => {
    if (mode === 'report') {
      createReport.mutate(
        {
          reporter_user_id: user.id,
          target_type: targetType,
          target_id: targetId,
          target_user_id: targetProfileId,
          target_parent_id: targetParentId,
          target_context: targetContext,
          reason,
          details: details.trim() || null,
        },
        { onSuccess: () => setMode('reported') }
      );
    } else if (mode === 'block') {
      createBlock.mutate(
        {
          blocker_user_id: user.id,
          blocked_user_id: targetProfileId,
          reason: details.trim() || null,
        },
        { onSuccess: () => setMode('blocked') }
      );
    }
  }, [
    mode,
    createReport,
    createBlock,
    user,
    targetType,
    targetId,
    targetProfileId,
    targetParentId,
    targetContext,
    reason,
    details,
  ]);

  const handleClose = useCallback(() => {
    setMode(null);
    setDetails('');
    createReport.reset?.();
    createBlock.reset?.();
  }, [createReport, createBlock]);

  // Don't render if not authenticated or targeting self
  if (!user || targetProfileId === user.id) return null;

  const isSubmitting = createReport.isPending || createBlock.isPending;
  const mutationError = createReport.error || createBlock.error;

  // Success confirmation states
  if (mode === 'reported' || mode === 'blocked') {
    return (
      <div
        className={cn('rounded-xl border border-border/70 bg-black/35 p-3 flex items-start gap-2.5', className)}
        role="status"
        aria-live="polite"
      >
        <CheckCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          {mode === 'reported'
            ? 'Report submitted for review. Thank you for helping keep the community safe.'
            : 'User blocked. Their content and messages will be hidden from your feed.'}
        </div>
      </div>
    );
  }

  // Report/Block form panel
  if (mode === 'report' || mode === 'block') {
    return (
      <div
        ref={panelRef}
        className={cn('rounded-xl border border-border/70 bg-black/35 p-3 space-y-3', className)}
        role="dialog"
        aria-label={mode === 'report' ? 'Report content' : 'Block user'}
        aria-busy={isSubmitting}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-bold" id="safety-panel-title">
            {mode === 'report' ? 'Report content' : 'Block user'}
          </h4>
          <button
            ref={closeButtonRef}
            onClick={handleClose}
            className={cn(
              'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-muted-foreground transition',
              'hover:text-foreground hover:bg-secondary/30',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Reason selector (report only) */}
        {mode === 'report' && (
          <div>
            <label className="sr-only" id="reason-label">Reason for report</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-11 min-h-[44px]" aria-labelledby="reason-label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Details textarea */}
        <div>
          <label htmlFor="safety-details" className="sr-only">
            {mode === 'report' ? 'Additional details for moderators' : 'Reason for blocking'}
          </label>
          <Textarea
            id="safety-details"
            value={details}
            onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX_LENGTH))}
            placeholder={mode === 'report' ? 'Optional details for moderation review' : 'Optional reason for blocking'}
            rows={3}
            maxLength={DETAILS_MAX_LENGTH}
            aria-describedby="details-char-count"
            disabled={isSubmitting}
            className="min-h-[80px]"
          />
          <div
            id="details-char-count"
            className={cn(
              'mt-1 text-right text-[10px]',
              details.length > DETAILS_MAX_LENGTH * 0.9 ? 'text-alert' : 'text-muted-foreground'
            )}
            aria-live="polite"
            aria-atomic="true"
          >
            {details.length}/{DETAILS_MAX_LENGTH}
          </div>
        </div>

        {/* Error message */}
        {mutationError && (
          <div
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
            <p className="text-sm text-destructive">
              {mutationError?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        )}

        {/* Submit button */}
        <Button
          variant={mode === 'block' ? 'destructive' : 'default'}
          onClick={handleSubmit}
          disabled={isSubmitting || (mode === 'block' && isBlocked)}
          className="w-full rounded-lg min-h-[44px]"
          aria-label={
            isSubmitting
              ? 'Submitting...'
              : mode === 'block' && isBlocked
                ? 'User already blocked'
                : mode === 'report'
                  ? 'Submit report'
                  : 'Confirm block'
          }
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {mode === 'report' ? 'Submitting report...' : 'Blocking...'}
            </span>
          ) : mode === 'block' && isBlocked ? (
            'Already blocked'
          ) : mode === 'report' ? (
            'Submit report'
          ) : (
            'Block user'
          )}
        </Button>

        {/* Contextual help */}
        <p className="text-[11px] text-muted-foreground text-center">
          {mode === 'report'
            ? 'Reports are reviewed by moderators within 24 hours.'
            : 'Blocked users cannot see your broadcasts or message you.'}
        </p>
      </div>
    );
  }

  // Default state - action buttons
  return (
    <div className={cn('flex gap-2', compact && 'justify-end', className)} role="group" aria-label="Safety actions">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMode('report')}
        className={cn(
          'rounded-lg text-muted-foreground min-h-[44px] px-3',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
        )}
        aria-label="Report this content"
      >
        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
        <span className={compact ? 'sr-only sm:not-sr-only sm:ml-1.5' : 'ml-1.5'}>Report</span>
      </Button>
      {canBlock && !isBlocked && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMode('block')}
          disabled={blocksLoading}
          className={cn(
            'rounded-lg text-muted-foreground min-h-[44px] px-3',
            'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          )}
          aria-label="Block this user"
        >
          <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
          <span className={compact ? 'sr-only sm:not-sr-only sm:ml-1.5' : 'ml-1.5'}>Block</span>
        </Button>
      )}
      {canBlock && isBlocked && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground italic px-2">
          <ShieldOff className="h-3 w-3" aria-hidden="true" />
          Blocked
        </span>
      )}
    </div>
  );
}
