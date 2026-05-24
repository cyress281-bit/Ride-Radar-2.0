import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CalendarClock,
  ChevronDown,
  Clock3,
  Loader2,
  MapPin,
  ShieldCheck,
  MessageSquareText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Text } from '@/components/ui/primitives/Text';
import { cn } from '@/lib/utils.js';
import {
  approveOfficialEventRequest,
  declineOfficialEventRequest,
  getOfficialEventRequests,
  repairOfficialEventRequest,
} from '@/features/admin/api/admin-api.js';
import { toast } from 'sonner';
import { broadcastKeys } from '@/features/broadcast/hooks/use-broadcasts.js';

function formatDateTime(value) {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '---';
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getStatusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'approved':
      return 'Approved';
    case 'declined':
      return 'Declined';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status || 'Unknown';
  }
}

function getStatusClass(status) {
  switch (status) {
    case 'pending':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-300';
    case 'approved':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300';
    case 'declined':
      return 'border-destructive/20 bg-destructive/10 text-destructive';
    case 'cancelled':
      return 'border-white/10 bg-white/5 text-muted-foreground';
    default:
      return 'border-white/10 bg-white/5 text-muted-foreground';
  }
}

function getNameFromUser(userRow, profileRow) {
  return (
    profileRow?.display_name ||
    profileRow?.username ||
    userRow?.full_name ||
    userRow?.email ||
    userRow?.id ||
    'Unknown user'
  );
}

function safeTrim(value) {
  return String(value || '').trim();
}

function RequestField({ label, value }) {
  return (
    <div className="min-w-0">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm text-foreground/90">{value || '---'}</div>
    </div>
  );
}

function PendingRequestCard({
  request,
  broadcast,
  requesterLabel,
  requesterEmail,
  adminNote,
  onAdminNoteChange,
  onApprove,
  onDecline,
  approveDisabled,
  declineDisabled,
}) {
  const broadcastTitle = broadcast?.title || '(untitled event)';
  const broadcastLocation = broadcast?.location_name || '---';
  const broadcastDate = formatDateTime(broadcast?.event_date);
  const canReview = request.status === 'pending' && broadcast?.type === 'event';

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', getStatusClass(request.status))}>
              {getStatusLabel(request.status)}
            </span>
            {broadcast?.is_official && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <ShieldCheck className="h-3 w-3" />
                Official
              </span>
            )}
          </div>

          <div className="text-base font-semibold leading-snug text-foreground/95">{broadcastTitle}</div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-3.5 w-3.5 shrink-0" />
              {broadcastDate}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {broadcastLocation}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5 shrink-0" />
              Requested {formatDateTime(request.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RequestField label="Requester" value={requesterLabel} />
        <RequestField label="Requester email" value={requesterEmail} />
        <RequestField label="Organizer name" value={request.organizer_name} />
        <RequestField label="Website or social" value={request.website_or_social || '---'} />
        <RequestField label="Contact info" value={request.contact_info} />
        <RequestField label="Created at" value={formatDateTime(request.created_at)} />
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Reason
        </div>
        <div className="whitespace-pre-wrap rounded-[16px] border border-white/[0.06] bg-black/20 p-3 text-sm leading-relaxed text-foreground/90">
          {request.reason}
        </div>
      </div>

      {request.reviewed_at && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RequestField label="Reviewed at" value={formatDateTime(request.reviewed_at)} />
          <RequestField label="Reviewed by" value={request.reviewed_by || '---'} />
        </div>
      )}

      {request.admin_note && (
        <div className="mt-4">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Admin note
          </div>
          <div className="whitespace-pre-wrap rounded-[16px] border border-white/[0.06] bg-black/20 p-3 text-sm leading-relaxed text-foreground/90">
            {request.admin_note}
          </div>
        </div>
      )}

      {canReview && (
        <>
          <div className="mt-4 rounded-[18px] border border-event/20 bg-event/5 px-4 py-3">
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <RequestField label="Requester / organizer" value={requesterLabel} />
              <RequestField label="Contact" value={request.contact_info} />
            </div>

            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Admin note (optional)
              </div>
              <Textarea
                value={adminNote}
                onChange={(e) => onAdminNoteChange(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Optional internal note for this review..."
                className="rr-premium-input rounded-xl"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={onDecline}
              disabled={declineDisabled}
              className="rounded-full border-destructive/25 text-destructive hover:bg-destructive/10 sm:flex-1"
            >
              {declineDisabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Declining...
                </>
              ) : (
                'Decline'
              )}
            </Button>
            <Button
              type="button"
              onClick={onApprove}
              disabled={approveDisabled}
              className="rounded-full bg-primary text-primary-foreground sm:flex-1"
            >
              {approveDisabled ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve + mark official'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function ReviewedRequestCard({
  request,
  broadcast,
  requesterLabel,
  requesterEmail,
  expanded,
  onToggle,
  onRepair,
  repairing = false,
}) {
  const currentStatus = getStatusLabel(request.status);

  return (
    <div className="rounded-[20px] border border-white/[0.06] bg-surface/70 p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest', getStatusClass(request.status))}>
              {currentStatus}
            </span>
            {broadcast?.is_official && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <ShieldCheck className="h-3 w-3" />
                Official
              </span>
            )}
          </div>
          <div className="text-sm font-semibold leading-snug text-foreground/90">
            {broadcast?.title || '(untitled event)'}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {requesterLabel} - {formatDateTime(request.created_at)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {broadcast?.location_name || '---'}
          </div>
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <RequestField label="Requester email" value={requesterEmail} />
          <RequestField label="Organizer name" value={request.organizer_name} />
          <RequestField label="Website or social" value={request.website_or_social || '---'} />
          <RequestField label="Contact info" value={request.contact_info} />
          <RequestField label="Reviewed at" value={formatDateTime(request.reviewed_at)} />
          <RequestField label="Reviewed by" value={request.reviewed_by || '---'} />
          <div className="md:col-span-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Reason
            </div>
            <div className="whitespace-pre-wrap rounded-[16px] border border-white/[0.06] bg-black/20 p-3 text-sm leading-relaxed text-foreground/90">
              {request.reason}
            </div>
          </div>
          {request.admin_note && (
            <div className="md:col-span-2">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Admin note
              </div>
              <div className="whitespace-pre-wrap rounded-[16px] border border-white/[0.06] bg-black/20 p-3 text-sm leading-relaxed text-foreground/90">
                {request.admin_note}
              </div>
            </div>
          )}
          {request.status === 'approved' && !broadcast?.is_official && (
            <div className="md:col-span-2">
              <div className="rounded-[16px] border border-brand-amber/20 bg-brand-amber/10 px-4 py-3">
                <div className="text-sm font-semibold text-brand-amber">Official flag missing</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  The request is approved, but the broadcast flag is not set yet. Repair it from this card.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRepair}
                  disabled={repairing}
                  className="mt-3 rounded-full border-brand-amber/25 text-brand-amber hover:bg-brand-amber/10"
                >
                  {repairing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    'Repair official flag'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OfficialEventRequestsPanel({ broadcasts = [], users = [], profiles = [] }) {
  const qc = useQueryClient();
  const [adminNotes, setAdminNotes] = useState({});
  const [expandedReviewedId, setExpandedReviewedId] = useState(null);

  const broadcastById = useMemo(
    () => new Map((broadcasts || []).map((broadcast) => [broadcast.id, broadcast])),
    [broadcasts]
  );
  const userById = useMemo(
    () => new Map((users || []).map((user) => [user.id, user])),
    [users]
  );
  const profileByUserId = useMemo(
    () => new Map((profiles || []).map((profile) => [profile.user_id || profile.id, profile])),
    [profiles]
  );

  const requestsQuery = useQuery({
    queryKey: ['admin', 'official-event-requests'],
    queryFn: async () => {
      const { data, error } = await getOfficialEventRequests();
      if (error) throw error;
      return data || [];
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, action, adminNote }) => {
      const handler =
        action === 'approve'
          ? approveOfficialEventRequest
          : action === 'repair'
            ? repairOfficialEventRequest
            : declineOfficialEventRequest;
      const { data, error } = await handler(requestId, adminNote);
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      setAdminNotes((current) => {
        const next = { ...current };
        delete next[variables.requestId];
        return next;
      });
      setExpandedReviewedId(variables.requestId);
      qc.invalidateQueries({ queryKey: ['admin', 'official-event-requests'] });
      qc.invalidateQueries({ queryKey: ['admin', 'broadcasts'] });
      qc.invalidateQueries({ queryKey: broadcastKeys.all });
      qc.invalidateQueries({ queryKey: broadcastKeys.all });
      toast.success(
        variables.action === 'approve'
          ? 'Official badge approved'
          : variables.action === 'repair'
            ? 'Official flag repaired'
            : 'Official badge declined',
        {
          description:
            variables.action === 'approve'
              ? 'The event is now marked official.'
              : variables.action === 'repair'
                ? 'The official flag was restored on the event.'
                : 'The official request was declined.',
        }
      );
    },
    onError: (error) => {
      toast.error('Could not review request', {
        description: error?.message || 'Please try again.',
      });
    },
  });

  const requests = useMemo(() => {
    const rows = Array.isArray(requestsQuery.data) ? requestsQuery.data : [];
    return [...rows].sort((a, b) => {
      const priorityA = a.status === 'pending' ? 0 : 1;
      const priorityB = b.status === 'pending' ? 0 : 1;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
  }, [requestsQuery.data]);

  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const reviewedRequests = requests.filter((request) => request.status !== 'pending');

  const renderRequester = (request) => {
    const requesterUser = userById.get(request.requester_id);
    const requesterProfile = profileByUserId.get(request.requester_id);
    return getNameFromUser(requesterUser, requesterProfile);
  };

  const renderRequesterEmail = (request) => userById.get(request.requester_id)?.email || '---';

  if (requestsQuery.isLoading) {
    return (
      <section className="mb-6 rounded-[24px] border border-white/[0.06] bg-surface/70 p-4">
        <div className="mb-4 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <Text variant="micro" className="text-muted-foreground font-bold uppercase tracking-wider">
            Official event review requests
          </Text>
        </div>
        <div className="space-y-3">
          <div className="h-32 rounded-[20px] bg-white/[0.04]" />
          <div className="h-32 rounded-[20px] bg-white/[0.04]" />
        </div>
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-[24px] border border-white/[0.06] bg-surface/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <Text variant="micro" className="text-muted-foreground font-bold uppercase tracking-wider">
              Official event review requests
            </Text>
          </div>
          <Text variant="bodySm" color="muted" className="leading-relaxed">
            Review requests from event owners. Pending requests are shown first.
          </Text>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
          {pendingRequests.length} pending
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          No official event review requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.length > 0 && (
            <div className="space-y-3">
              {pendingRequests.map((request) => {
                const broadcast = broadcastById.get(request.broadcast_id);
                const requesterLabel = renderRequester(request);
                const requesterEmail = renderRequesterEmail(request);
                const adminNote = safeTrim(adminNotes[request.id] ?? '');

                return (
                  <PendingRequestCard
                    key={request.id}
                    request={request}
                    broadcast={broadcast}
                    requesterLabel={requesterLabel}
                    requesterEmail={requesterEmail}
                    adminNote={adminNote}
                    onAdminNoteChange={(nextValue) =>
                      setAdminNotes((current) => ({ ...current, [request.id]: nextValue }))
                    }
                    onApprove={() =>
                      reviewMutation.mutate({
                        requestId: request.id,
                        action: 'approve',
                        adminNote,
                      })
                    }
                    onDecline={() =>
                      reviewMutation.mutate({
                        requestId: request.id,
                        action: 'decline',
                        adminNote,
                      })
                    }
                    approveDisabled={reviewMutation.isPending}
                    declineDisabled={reviewMutation.isPending}
                  />
                );
              })}
            </div>
          )}

          {reviewedRequests.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                <Text variant="micro" className="text-muted-foreground font-bold uppercase tracking-wider">
                  Recent reviewed requests
                </Text>
              </div>
              <div className="space-y-3">
                {reviewedRequests.map((request) => {
                  const broadcast = broadcastById.get(request.broadcast_id);
                  const requesterLabel = renderRequester(request);
                  const requesterEmail = renderRequesterEmail(request);
                  const expanded = expandedReviewedId === request.id;

                  return (
                  <ReviewedRequestCard
                    key={request.id}
                    request={request}
                    broadcast={broadcast}
                    requesterLabel={requesterLabel}
                    requesterEmail={requesterEmail}
                    expanded={expanded}
                    onRepair={() =>
                      reviewMutation.mutate({
                        requestId: request.id,
                        action: 'repair',
                        adminNote: '',
                      })
                    }
                    repairing={reviewMutation.isPending}
                    onToggle={() =>
                      setExpandedReviewedId((current) => (current === request.id ? null : request.id))
                    }
                  />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {requestsQuery.error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <Text variant="caption" className="text-destructive">
            {requestsQuery.error?.message || 'Failed to load official review requests.'}
          </Text>
        </div>
      )}
    </section>
  );
}
