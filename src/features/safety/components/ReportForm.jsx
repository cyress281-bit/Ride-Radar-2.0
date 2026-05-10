import { useState } from 'react';
import { useSupabaseAuth } from '@/features/auth/hooks/use-auth.js';
import { useCreateReport } from '@/features/safety/hooks/use-reports.js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils.js';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or scam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'other', label: 'Other' },
];

const DETAILS_MAX_LENGTH = 500;

/**
 * Standalone report form.
 *
 * @param {object} props
 * @param {string} props.targetType
 * @param {string} props.targetId
 * @param {string} props.targetUserId
 * @param {() => void} [props.onSuccess]
 */
export default function ReportForm({ targetType, targetId, targetUserId, onSuccess }) {
  const { user } = useSupabaseAuth();
  const [reason, setReason] = useState('spam');
  const [details, setDetails] = useState('');
  const createReport = useCreateReport();

  const isSelf = user?.id === targetUserId;
  const isSubmitting = createReport.isPending;

  const handleSubmit = () => {
    if (isSelf || !user) return;
    createReport.mutate(
      {
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        target_user_id: targetUserId,
        reason,
        details: details.trim() || null,
      },
      {
        onSuccess: () => {
          setDetails('');
          onSuccess?.();
        },
      }
    );
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        Sign in to submit a report.
      </div>
    );
  }

  if (isSelf) {
    return (
      <div className="rounded-lg border border-border/60 bg-card/40 p-4 text-sm text-muted-foreground">
        You cannot report yourself.
      </div>
    );
  }

  if (createReport.isSuccess) {
    return (
      <div
        className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-2.5"
        role="status"
        aria-live="polite"
      >
        <CheckCircle className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden="true" />
        <div className="text-sm text-muted-foreground">
          Report submitted for review. Thank you for helping keep the community safe.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="sr-only" id="report-reason-label">
          Reason for report
        </label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger className="h-11 min-h-[44px]" aria-labelledby="report-reason-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REPORT_REASONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label htmlFor="report-details" className="sr-only">
          Additional details
        </label>
        <Textarea
          id="report-details"
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, DETAILS_MAX_LENGTH))}
          placeholder="Optional details for moderation review"
          rows={4}
          maxLength={DETAILS_MAX_LENGTH}
          aria-describedby="report-details-count"
          disabled={isSubmitting}
          className="min-h-[100px]"
        />
        <div
          id="report-details-count"
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

      {createReport.error && (
        <div
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-2"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
          <p className="text-sm text-destructive">
            {createReport.error?.message || 'Something went wrong. Please try again.'}
          </p>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full rounded-lg min-h-[44px]">
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting...
          </span>
        ) : (
          'Submit report'
        )}
      </Button>
    </div>
  );
}
