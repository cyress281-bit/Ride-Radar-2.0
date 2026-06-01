import { memo, useState, useCallback } from 'react';
import { Flag, X } from 'lucide-react';
import { cn } from '@/lib/utils.js';
import { Text } from '@/components/ui/primitives/Text';
import { VStack, HStack } from '@/components/ui/primitives/Stack';
import { useCreateReport } from '@/features/safety/hooks/use-reports.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

/**
 * ReportButton — UGC report trigger + modal for App Store compliance.
 *
 * Props:
 * - targetType: 'broadcast' | 'message'
 * - targetId: string
 * - targetUserId: string
 * - size?: 'sm' | 'md'
 * - className?: string
 */
const ReportButton = memo(function ReportButton({
  targetType,
  targetId,
  targetUserId,
  size = 'sm',
  className,
}) {
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { user } = useAuthState();
  const createReport = useCreateReport();

  const handleOpen = useCallback(() => {
    setShowModal(true);
    setSubmitted(false);
  }, []);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setSubmitted(false);
  }, []);

  const handleSubmit = useCallback(
    (reason) => {
      if (!user?.id || !targetUserId) return;
      createReport.mutate({
        reporter_user_id: user.id,
        target_type: targetType,
        target_id: targetId,
        target_user_id: targetUserId,
        reason,
      });
      setSubmitted(true);
      setTimeout(() => setShowModal(false), 1500);
    },
    [createReport, targetType, targetId, targetUserId, user?.id]
  );

  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'inline-flex items-center gap-1 text-muted-foreground hover:text-brand-emergency transition-colors',
          'min-h-[32px] px-1',
          className
        )}
        aria-label="Report"
      >
        <Flag className={iconSize} />
        <span className="text-xs font-medium">Report</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 px-4 pb-[calc(var(--rr-nav-h)+var(--rr-safe-area-bottom,env(safe-area-inset-bottom,0px))+1rem)] pt-20 backdrop-blur-sm sm:items-center sm:pb-4"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-white/[0.08] bg-surface/95 p-5 shadow-[0_20px_60px_hsl(0_0%_0%/0.45)] backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <HStack justify="between" align="center" className="mb-4" role="status" aria-live="polite">
              <Text variant="h3" className="text-base font-bold">
                {submitted ? 'Report submitted' : 'Report content'}
              </Text>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </HStack>

            {submitted ? (
              <VStack align="center" gap={2} className="py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Flag className="w-5 h-5" />
                </div>
                <Text variant="body" className="text-center">
                  Thanks for reporting. We&apos;ll review it shortly.
                </Text>
              </VStack>
            ) : (
              <VStack gap={2}>
                {REPORT_REASONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleSubmit(r.value)}
                    className={cn(
                      'w-full rounded-xl px-4 py-3 text-left text-sm font-medium',
                      'bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.10]',
                      'transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </VStack>
            )}
          </div>
        </div>
      )}
    </>
  );
});

export default ReportButton;
