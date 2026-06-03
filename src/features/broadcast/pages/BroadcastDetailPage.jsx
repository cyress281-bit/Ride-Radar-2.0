import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, memo, useCallback, useEffect, useRef } from 'react';
import { MapPin, Calendar, Clock, Users, Heart, Check, Share2, Trash2, Loader2, AlertCircle, Pencil, ShieldCheck } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import AlertPhotoGrid from '@/components/shared/AlertPhotoGrid';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { BROADCAST_META, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';
import { getProfileByUserId } from '@/features/profile/api/profile-api.js';
import { isValidUuid } from '@/lib/utils.js';
import { supabase } from '@/lib/supabase.js';
import SafetyActions from '@/components/safety/SafetyActions';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { toast } from 'sonner';
import { canViewActiveBikeDownDetail, getBroadcastById, getEventRsvps, getMyEventRsvp, setEventRsvp, removeEventRsvp } from '@/features/broadcast/api/broadcast-api.js';
import {
  cancelOfficialEventRequest,
  createOfficialEventRequest,
  getLatestOfficialEventRequest,
} from '@/features/broadcast/api/official-event-requests-api.js';
import { useConnectionRequestWith, useSendConnectionRequest } from '@/features/connections/hooks/use-connection-requests.js';
import { useProfileBatch } from '@/hooks/use-profile-batch.js';
import { broadcastKeys, useRemoveBroadcast, useUpdateBroadcast, useResolveBroadcast } from '@/features/broadcast/hooks/use-broadcasts.js';
import { logger } from '@/lib/logger.js';
import { isExpectedRealtimeDisconnect } from '@/lib/realtime-disconnects.js';
import BroadcastComments from '@/features/broadcast/components/BroadcastComments.jsx';

function RemovedSignalScreen({ onHome }) {
  return (
    <div className="px-5 pt-5">
      <div className="surface-card p-10 text-center">
        <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
        <p className="text-[13px] font-semibold text-muted-foreground mb-2">Signal removed</p>
        <p className="text-[13px] text-muted-foreground">This signal was removed by its owner.</p>
        <button
          onClick={onHome}
          className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          Back to Radar
        </button>
      </div>
    </div>
  );
}

function ResolvedSignalScreen({ onHome, resolvedNote }) {
  return (
    <div className="px-5 pt-5">
      <div className="surface-card p-10 text-center">
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-green-500 opacity-80" />
        <p className="text-[13px] font-semibold text-foreground/90 mb-2">Rider found safe</p>
        <p className="text-[13px] text-muted-foreground">This Bike Down signal was marked resolved.</p>
        {resolvedNote && (
          <p className="mt-2 text-[13px] text-muted-foreground italic">{resolvedNote}</p>
        )}
        <button
          onClick={onHome}
          className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          Back to Radar
        </button>
      </div>
    </div>
  );
}

function UnavailableSignalScreen({ onHome }) {
  return (
    <div className="px-5 pt-5">
      <div className="surface-card p-10 text-center">
        <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
        <p className="text-[13px] font-semibold text-muted-foreground mb-2">Signal unavailable</p>
        <p className="text-[13px] text-muted-foreground">This signal is no longer available to view.</p>
        <button
          onClick={onHome}
          className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95"
        >
          Back to Radar
        </button>
      </div>
    </div>
  );
}

function formatOfficialEventRequestError(error) {
  const message = String(error?.message || '').toLowerCase();

  if (error?.code === '23505' || message.includes('duplicate key')) {
    return 'A pending review request already exists for this event.';
  }

  if (error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied')) {
    return 'You do not have permission to submit this request.';
  }

  if (error?.code === '23503') {
    return 'This event could not be found.';
  }

  if (error?.code === '23514') {
    return 'Please check the form fields and try again.';
  }

  return error?.message || 'Something went wrong. Please try again.';
}

const OFFICIAL_REQUEST_QUERY_KEY = (broadcastId, requesterId) => ['official-event-request', broadcastId, requesterId];

const OfficialEventReviewPanel = memo(function OfficialEventReviewPanel({ broadcast, user, profile, isAuthor, isOfficialEvent }) {
  const queryClient = useQueryClient();
  const [requestOpen, setRequestOpen] = useState(false);
  const [organizerName, setOrganizerName] = useState('');
  const [websiteOrSocial, setWebsiteOrSocial] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [reason, setReason] = useState('');
  const [requestError, setRequestError] = useState('');

  const requestQueryKey = OFFICIAL_REQUEST_QUERY_KEY(broadcast?.id, user?.id);
  const requestQuery = useQuery({
    queryKey: requestQueryKey,
    enabled: !!broadcast?.id && !!user?.id && isAuthor && broadcast?.type === 'event' && !isOfficialEvent,
    queryFn: async () => {
      const { data, error } = await getLatestOfficialEventRequest(broadcast.id, user.id);
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const latestRequest = requestQuery.data || null;
  const isPending = latestRequest?.status === 'pending';
  const isApproved = latestRequest?.status === 'approved';
  const isDeclined = latestRequest?.status === 'declined';
  const isCancelled = latestRequest?.status === 'cancelled';

  useEffect(() => {
    setRequestOpen(false);
    setRequestError('');
  }, [broadcast?.id]);

  const seedForm = useCallback(() => {
    const organizerSeed =
      latestRequest?.organizer_name ||
      profile?.display_name ||
      user?.user_metadata?.full_name ||
      '';
    const contactSeed = latestRequest?.contact_info || user?.email || '';
    const websiteSeed = latestRequest?.website_or_social || '';
    const reasonSeed = latestRequest?.reason || '';

    setOrganizerName(organizerSeed);
    setWebsiteOrSocial(websiteSeed);
    setContactInfo(contactSeed);
    setReason(reasonSeed);
  }, [latestRequest, profile?.display_name, user?.user_metadata?.full_name, user?.email]);

  const openRequestForm = useCallback(() => {
    setRequestError('');
    seedForm();
    setRequestOpen(true);
  }, [seedForm]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await createOfficialEventRequest({
        broadcastId: broadcast.id,
        requesterId: user.id,
        organizerName,
        websiteOrSocial,
        contactInfo,
        reason,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRequestOpen(false);
      setRequestError('');
      toast({
        title: 'Review requested',
        description: 'Ride Radar admins will review your event.',
      });
    },
    onError: (error) => {
      setRequestError(formatOfficialEventRequestError(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: requestQueryKey });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!latestRequest?.id) throw new Error('No pending request found.');
      const { data, error } = await cancelOfficialEventRequest(latestRequest.id);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setRequestOpen(false);
      setRequestError('');
      toast({
        title: 'Review request cancelled',
        description: 'Your official review request was cancelled.',
      });
    },
    onError: (error) => {
      setRequestError(formatOfficialEventRequestError(error));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: requestQueryKey });
    },
  });

  if (!broadcast || !user || !isAuthor || broadcast.type !== 'event' || isOfficialEvent) {
    return null;
  }

  const handleSubmit = () => {
    const trimmedOrganizer = organizerName.trim();
    const trimmedContact = contactInfo.trim();
    const trimmedReason = reason.trim();

    if (!trimmedOrganizer || !trimmedContact || !trimmedReason) {
      setRequestError('Please fill out the required fields.');
      return;
    }

    setRequestError('');
    createMutation.mutate();
  };

  const hasStatus = isPending || isApproved || isDeclined || isCancelled;

  return (
    <div className="mb-5 rounded-[20px] border border-event/20 bg-event/5 px-4 py-4">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-event/20 bg-event/10">
          <ShieldCheck className="h-5 w-5 text-event" />
        </div>
        <div className="min-w-0 flex-1">
          <Text variant="micro" className="text-event font-bold uppercase tracking-wider">
            Official event review
          </Text>
          <Text variant="bodySm" className="mt-1 leading-relaxed text-foreground/80">
            Official badges are reviewed by Ride Radar admins and are not user-assigned.
          </Text>
        </div>
      </div>

      {requestQuery.error && !latestRequest && !requestOpen && (
        <p className="mb-3 text-xs text-muted-foreground">
          We couldn't load your previous request. You can still submit a new one.
        </p>
      )}

      {isPending ? (
        <div className="rounded-[18px] border border-event/20 bg-background/60 px-4 py-3">
          <Text variant="bodySm" className="font-semibold text-foreground/90">
            Official review requested
          </Text>
          <Text variant="caption" color="muted" className="mt-1 block leading-relaxed">
            Admins will review your event. We’ll keep the badge off until approval.
          </Text>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel request'}
            </Button>
          </div>
        </div>
      ) : isApproved ? (
        <div className="rounded-[18px] border border-event/20 bg-background/60 px-4 py-3">
          <Text variant="bodySm" className="font-semibold text-foreground/90">
            Official review approved
          </Text>
          <Text variant="caption" color="muted" className="mt-1 block leading-relaxed">
            This event should now show the Official badge.
          </Text>
        </div>
      ) : requestOpen ? (
        <div className="rounded-[18px] border border-event/20 bg-background/60 px-4 py-4">
          <div className="mb-3">
            <Text variant="bodySm" className="font-semibold text-foreground/90">
              Tell admins who is hosting this event and how to contact you.
            </Text>
            <Text variant="caption" color="muted" className="mt-1 block leading-relaxed">
              Event title, date, and location are already tied to this request.
            </Text>
          </div>

          <div className="space-y-3">
            <div>
              <Text variant="caption" color="muted" className="mb-1 block font-semibold">
                Organizer / club name
              </Text>
              <Input
                value={organizerName}
                onChange={(e) => setOrganizerName(e.target.value)}
                placeholder="e.g. City Riders Club"
                maxLength={120}
                className="rr-premium-input rounded-xl"
              />
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1 block font-semibold">
                Website or social link
              </Text>
              <Input
                value={websiteOrSocial}
                onChange={(e) => setWebsiteOrSocial(e.target.value)}
                placeholder="Instagram, Facebook, website, or event page"
                maxLength={200}
                className="rr-premium-input rounded-xl"
              />
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1 block font-semibold">
                Contact info
              </Text>
              <Input
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Email or phone"
                maxLength={160}
                className="rr-premium-input rounded-xl"
              />
            </div>
            <div>
              <Text variant="caption" color="muted" className="mb-1 block font-semibold">
                Why should this event be reviewed?
              </Text>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Short explanation for the review team"
                rows={4}
                maxLength={500}
                className="rr-premium-input rounded-xl"
              />
              <Text variant="micro" color="muted" className="mt-1 block text-right">
                {reason.length} / 500
              </Text>
            </div>
          </div>

          {requestError && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
              <Text variant="caption" className="text-destructive">
                {requestError}
              </Text>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setRequestOpen(false);
                setRequestError('');
              }}
              disabled={createMutation.isPending}
              className="rounded-full border-white/[0.08] sm:flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="rounded-full bg-primary text-primary-foreground sm:flex-1"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Submit review request'
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-[18px] border border-event/20 bg-background/60 px-4 py-3">
          {isDeclined && (
            <Text variant="caption" color="muted" className="mb-2 block leading-relaxed">
              This request was declined. You can submit a new request if the event details changed.
            </Text>
          )}
          {isCancelled && (
            <Text variant="caption" color="muted" className="mb-2 block leading-relaxed">
              Your previous request was cancelled.
            </Text>
          )}
          <Text variant="caption" color="muted" className="block leading-relaxed">
            Want this event reviewed for an Official badge? Official badges are reviewed by Ride Radar admins and are not user-assigned.
          </Text>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={openRequestForm}
              className="rounded-full bg-primary text-primary-foreground"
            >
              {hasStatus ? 'Request official review again' : 'Request official review'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

function RsvpAvatarRow({ userIds, profiles, label, onExpand }) {
  if (userIds.length === 0) return null;
  const visible = userIds.slice(0, 5);
  const overflow = userIds.length - 5;
  return (
    <button onClick={onExpand} className="flex items-center gap-3 w-full pressable py-1">
      <div className="flex -space-x-2">
        {visible.map((uid) => {
          const p = profiles.get(uid);
          return p?.avatar_url ? (
            <img key={uid} src={p.avatar_url} alt={p.display_name || 'Rider'}
              className="w-8 h-8 rounded-full object-cover border-2 border-background" />
          ) : (
            <div key={uid}
              className="w-8 h-8 rounded-full bg-surface-elevated border-2 border-background flex items-center justify-center text-xs font-bold text-foreground/60">
              {p?.display_name?.[0] || '?'}
            </div>
          );
        })}
        {overflow > 0 && (
          <div className="w-8 h-8 rounded-full bg-surface-elevated border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground">
            +{overflow}
          </div>
        )}
      </div>
      <Text variant="caption" color="muted" className="font-semibold">
        {label} · {userIds.length}
      </Text>
    </button>
  );
}

function RsvpAttendeeSheet({ userIds, profiles, label, onClose }) {
  return createPortal(
    <>
      <div
        className="fixed inset-x-0 top-0 z-[55] bg-black/60"
        style={{ bottom: 'calc(var(--rr-nav-h, 56px) + 14px + var(--rr-safe-area-bottom, 0px))' }}
        onClick={onClose}
      />
      <div
        className="fixed left-0 right-0 z-[60] rounded-t-[28px] bg-surface border-t border-white/[0.06] px-5 pt-5 pb-6 overflow-y-auto"
        style={{
          bottom: 'calc(var(--rr-nav-h, 56px) + 14px + var(--rr-safe-area-bottom, 0px))',
          maxHeight: 'calc(70vh - var(--rr-nav-h, 56px) - 14px - var(--rr-safe-area-bottom, 0px))',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <Text variant="h3" className="font-bold">{label}</Text>
          <button onClick={onClose}
            className="pressable text-sm font-semibold text-muted-foreground hover:text-foreground min-h-[44px] px-2">
            Done
          </button>
        </div>
        <VStack gap={3}>
          {userIds.map((uid) => {
            const p = profiles.get(uid);
            return (
              <HStack key={uid} gap={3} align="center">
                {p?.avatar_url ? (
                  <img src={p.avatar_url} alt={p.display_name || 'Rider'}
                    className="w-10 h-10 rounded-full object-cover border border-white/[0.08] shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-surface-elevated border border-white/[0.08] flex items-center justify-center text-sm font-bold text-foreground/60 shrink-0">
                    {p?.display_name?.[0] || '?'}
                  </div>
                )}
                <Text variant="bodySm" className="font-semibold truncate">
                  {p?.display_name || 'Rider'}
                </Text>
              </HStack>
            );
          })}
        </VStack>
      </div>
    </>,
    document.body
  );
}

/**
 * Single broadcast detail page.
 */
function BroadcastDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuthState();
  const hasValidBroadcastId = isValidUuid(id);
  const qc = useQueryClient();

  const { data: viewerRole = 'user' } = useQuery({
    queryKey: ['viewer-role', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (error) return 'user';
      return data?.role || 'user';
    },
    staleTime: 5 * 60_000,
  });

  const isViewerAdmin = viewerRole === 'admin';

  useEffect(() => {
    if (location.hash !== '#comments') return;
    const el = document.getElementById('comments');
    if (!el) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [location.hash]);

  const { data: broadcast, isLoading: isBroadcastLoading, isError: isBroadcastError } = useQuery({
    queryKey: broadcastKeys.detail(id),
    enabled: hasValidBroadcastId,
    queryFn: async () => {
      const { data, error } = await getBroadcastById(id);
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });

  const isAuthor = user?.id === broadcast?.author_id;
  const isBikeDown = broadcast?.type === 'alert' && broadcast?.alert_type === 'bike_down';
  const expiresAtMs = Date.parse(broadcast?.expires_at || '');
  const isExpiredByTime = Number.isFinite(expiresAtMs) && expiresAtMs <= Date.now();
  const requiresBikeDownVisibilityCheck =
    !!broadcast?.id &&
    !!user?.id &&
    isBikeDown &&
    broadcast.status === 'active' &&
    !isAuthor &&
    !isViewerAdmin &&
    !isExpiredByTime;

  const {
    data: bikeDownVisibility = { isVisible: true },
    isLoading: isBikeDownVisibilityLoading,
    isError: isBikeDownVisibilityError,
  } = useQuery({
    queryKey: ['bike-down-visibility', broadcast?.id, user?.id],
    enabled: requiresBikeDownVisibilityCheck,
    queryFn: async () => {
      const { data, error } = await canViewActiveBikeDownDetail(broadcast);
      if (error) throw error;
      return { isVisible: data };
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const { data: author } = useQuery({
    queryKey: ['profile', broadcast?.author_id],
    enabled: !!broadcast?.author_id,
    queryFn: async () => {
      const { data, error } = await getProfileByUserId(broadcast.author_id);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: connectionRequest } = useConnectionRequestWith(broadcast?.author_id);

  const { data: myRSVP } = useQuery({
    queryKey: ['myRSVP', id, user?.id],
    enabled: !!user && !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await getMyEventRsvp(id, user.id);
      if (error) throw error;
      return data;
    },
  });

  const { data: rsvpAttendees = { interested: 0, going: 0, rows: [] } } = useQuery({
    queryKey: ['rsvpAttendees', id],
    enabled: !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await getEventRsvps(id);
      if (error) throw error;
      const rows = data || [];
      return {
        interested: rows.filter((r) => r.status === 'interested').length,
        going: rows.filter((r) => r.status === 'going').length,
        rows,
      };
    },
  });

  const rsvpCounts = { interested: rsvpAttendees.interested, going: rsvpAttendees.going };

  const goingUserIds = rsvpAttendees.rows.filter((r) => r.status === 'going').map((r) => r.user_id);
  const interestedUserIds = rsvpAttendees.rows.filter((r) => r.status === 'interested').map((r) => r.user_id);
  const { profiles: rsvpProfiles } = useProfileBatch([...goingUserIds, ...interestedUserIds]);

  const [sheetStatus, setSheetStatus] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editError, setEditError] = useState('');
  const [confirmResolve, setConfirmResolve] = useState(false);
  const [resolveError, setResolveError] = useState('');

  const removeSignal = useRemoveBroadcast();
  const updateSignal = useUpdateBroadcast();
  const resolveSignal = useResolveBroadcast();

  const wasLoaded = useRef(false);

  useEffect(() => {
    if (!hasValidBroadcastId) return;
    const channel = supabase
      .channel(`broadcast-detail-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'broadcasts',
          filter: `id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: broadcastKeys.detail(id) });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[BroadcastDetailPage] Realtime disconnected (expected reconnect)', { status });
          } else {
            logger.error('[BroadcastDetailPage] Realtime subscription error:', err);
          }
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, hasValidBroadcastId, qc]);

  // Realtime sync for RSVP counts — instant update when anyone RSVPs
  useEffect(() => {
    if (!hasValidBroadcastId || !broadcast || broadcast.type !== 'event') return;
    const channel = supabase
      .channel(`event-rsvps-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_rsvps',
          filter: `broadcast_id=eq.${id}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['rsvpAttendees', id] });
          qc.invalidateQueries({ queryKey: ['myRSVP', id, user?.id] });
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (isExpectedRealtimeDisconnect(err, status)) {
            logger.debug('[BroadcastDetailPage] Realtime disconnected (expected reconnect)', { status });
          } else {
            logger.error('[BroadcastDetailPage] Realtime subscription error:', err);
          }
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, hasValidBroadcastId, broadcast?.type, user?.id, qc]);

  const canEditTitle = broadcast?.type === 'solo_ride' || broadcast?.type === 'iso' || broadcast?.type === 'event';
  const saveDisabled = updateSignal.isPending || (canEditTitle && editTitle.trim().length < 3);



  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied', { description: 'Signal link copied to clipboard.' });
    } catch {
      toast.error('Copy failed', { description: 'Unable to copy link.' });
    }
  }, []);

  const handleEditOpen = useCallback(() => {
    setEditTitle(broadcast?.title || '');
    setEditBody(broadcast?.body || '');
    setEditError('');
    setConfirmRemove(false);
    setEditOpen(true);
  }, [broadcast?.title, broadcast?.body]);

  const handleSave = useCallback(async () => {
    setEditError('');
    const fields = { body: editBody.trim() };
    if (canEditTitle) fields.title = editTitle.trim();
    try {
      await updateSignal.mutateAsync({ id, fields });
      setEditOpen(false);
      toast.success('Signal updated', { description: 'Your changes are now live.' });
    } catch (err) {
      setEditError(err?.message || 'Failed to update signal. Please try again.');
    }
  }, [id, editBody, editTitle, canEditTitle, updateSignal]);

  const handleRemove = useCallback(async () => {
    setRemoveError('');
    try {
      await removeSignal.mutateAsync(id);
      navigate('/home');
    } catch (err) {
      setRemoveError(err?.message || 'Failed to remove signal. Please try again.');
      setConfirmRemove(false);
    }
  }, [id, removeSignal, navigate]);

  const handleResolve = useCallback(async () => {
    setResolveError('');
    try {
      await resolveSignal.mutateAsync({ id });
      navigate('/home');
    } catch (err) {
      setResolveError(err?.message || 'Failed to resolve signal. Please try again.');
      setConfirmResolve(false);
    }
  }, [id, resolveSignal, navigate]);

  if (!hasValidBroadcastId) {
    return (
      <div className="px-5 pt-5 bg-background min-h-dvh">
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Invalid signal link.</Text>
        </div>
      </div>
    );
  }

  if (isBroadcastLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center text-sm text-muted-foreground bg-background">
        <RRLogo size="md" className="mb-4 animate-pulse" />
        Loading signal…
      </div>
    );
  }

  if (isBroadcastError) {
    return (
      <div className="px-5 pt-5 bg-background min-h-dvh">
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Unable to load this signal.</Text>
        </div>
      </div>
    );
  }

  if (broadcast) wasLoaded.current = true;

  if (!broadcast) {
    if (wasLoaded.current) {
      return <RemovedSignalScreen onHome={() => navigate('/home')} />;
    }
    return (
      <div className="px-5 pt-5 bg-background min-h-dvh">
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Signal not found.</Text>
        </div>
      </div>
    );
  }

  if (requiresBikeDownVisibilityCheck && isBikeDownVisibilityLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-sm text-muted-foreground">
        <RRLogo size="md" className="mb-4 animate-pulse" />
        Loading signal…
      </div>
    );
  }

  if (requiresBikeDownVisibilityCheck && isBikeDownVisibilityError) {
    return (
      <div className="px-5 pt-5 bg-background min-h-dvh">
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Unable to load this signal.</Text>
        </div>
      </div>
    );
  }

  if (requiresBikeDownVisibilityCheck && !bikeDownVisibility.isVisible) {
    return <UnavailableSignalScreen onHome={() => navigate('/home')} />;
  }

  if ((broadcast.status !== 'active' || isExpiredByTime) && !isAuthor && !isViewerAdmin) {
    if (broadcast.resolved_at) {
      return <ResolvedSignalScreen onHome={() => navigate('/home')} resolvedNote={broadcast.resolved_note} />;
    }
    return <RemovedSignalScreen onHome={() => navigate('/home')} />;
  }

  const meta = BROADCAST_META[broadcast.type];
  const displayLabel = broadcast.alert_type === 'bike_down' ? 'Bike Down' : meta?.label;
  const isAlert = broadcast.type === 'alert';
  const signalTone = isBikeDown ? 'bike_down' : broadcast.type;

  const typeAccentClass = {
    solo_ride: 'border-l-[3px] border-l-primary shadow-[-3px_0_14px_hsl(var(--primary)/0.25)]',
    iso: 'border-l-[3px] border-l-iso shadow-[-3px_0_14px_hsl(var(--iso)/0.25)]',
    event: 'border-l-[3px] border-l-event shadow-[-3px_0_14px_hsl(var(--event)/0.25)]',
    alert: 'border-l-[3px] border-l-brand-amber shadow-[-3px_0_14px_hsl(var(--brand-amber)/0.22)]',
    bike_down: 'border-l-[3px] border-l-brand-emergency shadow-[-3px_0_14px_hsl(var(--brand-emergency)/0.3)]',
  }[signalTone] || 'border-l-[3px] border-l-border/60';

  const badgeClass = {
    solo_ride: 'bg-primary/10 text-primary border-primary/30',
    iso: 'bg-iso/10 text-iso border-iso/30',
    event: 'bg-event/10 text-event border-event/30',
    alert: 'bg-brand-amber/10 text-brand-amber border-brand-amber/30',
    bike_down: 'bg-brand-emergency/10 text-brand-emergency border-brand-emergency/30',
  }[signalTone] || 'bg-muted text-muted-foreground border-border/50';

  const hasHeroImage = broadcast.type === 'event' && broadcast.event_image_url;
  const isOfficialEvent = broadcast.type === 'event' && broadcast.is_official === true;

  return (
    <div className="px-5 pt-5 pb-8 bg-background min-h-dvh">
      {/* Top nav */}
      <HStack justify="end" align="center" className="mb-5">
        <button
          onClick={handleShare}
          className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1"
          aria-label="Copy signal link"
        >
          <Share2 className="w-4 h-4" /> Share
        </button>
      </HStack>

      {/* Hero image with gradient overlay */}
      {hasHeroImage && (
        <div className="relative -mx-5 mb-6 overflow-hidden">
          <img
            src={broadcast.event_image_url}
            className="w-full h-72 object-cover"
            alt="Event poster"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="inline-flex flex-wrap items-center gap-2 mb-3">
              <div className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border backdrop-blur-md',
                badgeClass
              )}>
                {displayLabel}
              </div>
            </div>
            <Text as="h1" variant="h1" className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] tracking-tight">
              {broadcast.title}
            </Text>
          </div>
        </div>
      )}

      {hasHeroImage && isOfficialEvent && (
        <div className="mb-4 inline-flex items-center rounded-full border border-event/30 bg-event/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-event-foreground backdrop-blur-md">
          Official
        </div>
      )}

      <div className={cn('rounded-[24px] border p-5 relative overflow-hidden backdrop-blur-xl bg-surface/80 border-white/[0.06]', !hasHeroImage && typeAccentClass)}>
        {/* Subtle ambient glow */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

        {!hasHeroImage && (
          <div className="inline-flex flex-wrap items-center gap-2 mb-4">
            <div
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest border backdrop-blur-md',
                badgeClass
              )}
            >
              {broadcast.type === 'solo_ride' && <OfficialMotorcycleIcon className="h-5 w-6 rounded-md" />}
              {displayLabel}
              {broadcast.iso_subtype && ` · ${broadcast.iso_subtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}`}
            </div>
            {isOfficialEvent && (
              <span className="inline-flex items-center rounded-full border border-event/30 bg-event/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-event-foreground backdrop-blur-md">
                Official
              </span>
            )}
          </div>
        )}

        {!hasHeroImage && isOfficialEvent && (
          <p className="mb-4 text-[11px] leading-snug text-muted-foreground">
            Official means Ride Radar reviewed and approved this event badge. It is not user-assigned.
          </p>
        )}

        {!hasHeroImage && (
          <Text as="h1" variant="h2" className="text-xl sm:text-2xl font-extrabold tracking-tight mb-3 text-white/95">
            {broadcast.title}
          </Text>
        )}

        {broadcast.body && (
          <Text variant="body" className="text-foreground/75 leading-[1.7] mb-5 whitespace-pre-wrap text-[15px]">
            {broadcast.body}
          </Text>
        )}

        <OfficialEventReviewPanel
          broadcast={broadcast}
          user={user}
          profile={profile}
          isAuthor={isAuthor}
          isOfficialEvent={isOfficialEvent}
        />

        {isAlert && <AlertPhotoGrid images={(broadcast.alert_photos || broadcast.alert_image_urls) || []} variant="detail" />}

        {/* Metadata */}
        <HStack gap={4} wrap className="text-sm text-muted-foreground mt-5">
          {(broadcast.type === 'event' || isAlert) && broadcast.location_name && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {broadcast.location_name}
            </span>
          )}
          {broadcast.type === 'event' && broadcast.event_date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" />
              {new Date(broadcast.event_date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            {timeUntilExpiry(broadcast.expires_at)}
          </span>
        </HStack>

        {/* Author card — glassmorphism */}
        {broadcast.author_id && (
          author ? (
            <Link
              to={`/profile/${author.user_id}`}
              className="flex items-center gap-3 mt-6 pt-5 border-t border-white/[0.06] pressable"
            >
              {author.avatar_url ? (
                <div className="rr-avatar-ring shrink-0" style={{ padding: '3px' }}>
                  <img src={author.avatar_url} className="w-11 h-11 rounded-full object-cover border border-primary/30" alt={author.display_name || 'Rider'} />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-full bg-surface-elevated flex items-center justify-center font-semibold text-sm border border-white/[0.08] text-foreground/80">
                  {author.display_name?.[0] || '?'}
                </div>
              )}
              <VStack gap={0.5}>
                <Text variant="bodySm" className="font-semibold text-foreground/90">{author.display_name}</Text>
                <Text variant="caption" color="muted">{timeAgo(broadcast.created_at)}</Text>
              </VStack>
            </Link>
          ) : (
            <div className="flex items-center gap-3 mt-6 pt-5 border-t border-white/[0.06]">
              <div className="w-11 h-11 rounded-full bg-surface-elevated flex items-center justify-center border border-white/[0.08]">
                <span className="text-sm font-semibold text-foreground/40">?</span>
              </div>
              <VStack gap={0.5}>
                <Text variant="bodySm" className="font-semibold text-foreground/90">Rider</Text>
                <Text variant="caption" color="muted">Profile unavailable</Text>
              </VStack>
            </div>
          )
        )}
      </div>

      {/* Bike Down responder safety reminder */}
      {isBikeDown && (
        <div className="mt-4 flex items-start gap-2.5 rounded-[20px] border border-destructive/25 bg-destructive/8 px-4 py-3.5" role="note">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold leading-snug text-destructive">
              Call 911 first. Ride Radar is not an emergency service.
            </p>
            <p className="mt-1 text-xs leading-snug text-destructive/80">
              If someone may be injured or in danger, contact emergency services before heading out.{' '}
              <Link to="/safety-disclaimer" className="underline underline-offset-2 hover:text-destructive">
                Safety info
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Owner controls */}
      {isAuthor && (
        <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4">
          {!editOpen && !confirmRemove && !confirmResolve ? (
            <VStack gap={3}>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleEditOpen}
                  className="flex items-center justify-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-5 py-2.5 text-sm font-bold transition-all hover:bg-white/[0.08] active:scale-95"
                >
                  <Pencil className="h-4 w-4" />
                  Edit Signal
                </button>
                <button
                  onClick={() => setConfirmRemove(true)}
                  className="flex items-center justify-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-5 py-2.5 text-sm font-bold text-destructive transition-all hover:bg-destructive/20 active:scale-95"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Signal
                </button>
              </div>
              {isBikeDown && (
                <button
                  onClick={() => setConfirmResolve(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-green-500/30 bg-green-600/15 px-5 py-2.5 text-sm font-bold text-green-400 transition-all hover:bg-green-600/25 active:scale-95"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Mark Safe
                </button>
              )}
            </VStack>
          ) : editOpen ? (
            <VStack gap={3}>
              {canEditTitle && (
                <VStack gap={1}>
                  <Text variant="caption" color="muted" className="font-semibold">Title</Text>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    maxLength={120}
                    className="rr-premium-input rounded-xl"
                  />
                  {editTitle.trim().length > 0 && editTitle.trim().length < 3 && (
                    <p className="text-xs text-destructive">Title must be at least 3 characters</p>
                  )}
                  <Text variant="micro" color="muted" className="block text-right">{editTitle.length} / 120</Text>
                </VStack>
              )}
              <VStack gap={1}>
                <Text variant="caption" color="muted" className="font-semibold">Details</Text>
                <Textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  maxLength={500}
                  rows={4}
                  className="rr-premium-input rounded-xl"
                />
                <Text variant="micro" color="muted" className="block text-right">{editBody.length} / 500</Text>
              </VStack>
              {editError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
                  <Text variant="caption" className="text-destructive">{editError}</Text>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setEditOpen(false)}
                  disabled={updateSignal.isPending}
                  className="rounded-full border border-white/[0.06] py-2.5 text-sm font-bold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saveDisabled}
                  className="rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {updateSignal.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                  ) : 'Save Changes'}
                </button>
              </div>
            </VStack>
          ) : confirmResolve ? (
            <VStack gap={3}>
              <Text variant="caption" color="muted" className="block text-center">
                Rider is safe? This will close the Bike Down signal and remove it from Radar.
              </Text>
              {resolveError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
                  <Text variant="caption" className="text-destructive">{resolveError}</Text>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmResolve(false)}
                  disabled={resolveSignal.isPending}
                  className="rounded-full border border-white/[0.06] py-2.5 text-sm font-bold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolve}
                  disabled={resolveSignal.isPending}
                  className="rounded-full bg-green-600 py-2.5 text-sm font-bold text-white transition-all hover:bg-green-700 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {resolveSignal.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolving…</>
                  ) : 'Mark Rider Safe'}
                </button>
              </div>
            </VStack>
          ) : (
            <VStack gap={3}>
              <Text variant="caption" color="muted" className="block text-center">
                This will remove your signal from all feeds.
              </Text>
              {removeError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3" role="alert">
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" aria-hidden="true" />
                  <Text variant="caption" className="text-destructive">{removeError}</Text>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setConfirmRemove(false)}
                  disabled={removeSignal.isPending}
                  className="rounded-full border border-white/[0.06] py-2.5 text-sm font-bold transition-colors hover:bg-white/[0.06] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRemove}
                  disabled={removeSignal.isPending}
                  className="rounded-full bg-destructive py-2.5 text-sm font-bold text-white transition-all hover:bg-destructive/90 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {removeSignal.isPending ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Removing…</>
                  ) : 'Confirm Remove'}
                </button>
              </div>
            </VStack>
          )}
        </div>
      )}

      {/* SafetyActions — glassmorphism panel */}
      {!isAuthor && user && (
        <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4">
          <SafetyActions targetType="broadcast" targetId={broadcast.id} targetProfileId={broadcast.author_id} />
        </div>
      )}

      {/* Action bar */}
      {!isAuthor && !isAlert && user && (
        <div className="mt-5">
          <BroadcastActions
            broadcast={broadcast}
            user={user}
            myRSVP={myRSVP}
            rsvpCounts={rsvpCounts}
            connectionRequest={connectionRequest}
            id={id}
          />
        </div>
      )}

      {/* Author event stats */}
      {isAuthor && broadcast.type === 'event' && (
        <div className="mt-5 p-5 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06]">
          <Text variant="micro" color="muted" className="mb-2 uppercase tracking-widest text-[10px] font-bold">Your event</Text>
          <Text variant="h3" className="text-lg font-bold text-white/90">
            <span className="text-primary">{rsvpCounts.going}</span> going · <span className="text-brand-radar">{rsvpCounts.interested}</span> interested
          </Text>
        </div>
      )}

      {/* RSVP Attendee List */}
      {broadcast.type === 'event' && (goingUserIds.length > 0 || interestedUserIds.length > 0) && (
        <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4 space-y-3">
          <RsvpAvatarRow
            userIds={goingUserIds}
            profiles={rsvpProfiles}
            label="Going"
            onExpand={() => setSheetStatus('going')}
          />
          <RsvpAvatarRow
            userIds={interestedUserIds}
            profiles={rsvpProfiles}
            label="Interested"
            onExpand={() => setSheetStatus('interested')}
          />
        </div>
      )}

      {sheetStatus && (
        <RsvpAttendeeSheet
          userIds={sheetStatus === 'going' ? goingUserIds : interestedUserIds}
          profiles={rsvpProfiles}
          label={sheetStatus === 'going' ? 'Going' : 'Interested'}
          onClose={() => setSheetStatus(null)}
        />
      )}

      {/* Comments */}
      <div id="comments">
        <BroadcastComments
          broadcastId={broadcast.id}
          broadcastAuthorId={broadcast.author_id}
          currentUserId={user?.id}
          isActive={broadcast.status === 'active'}
        />
      </div>
    </div>
  );
}

const EventRSVP = memo(function EventRSVP({ broadcast, user, myRSVP, counts, onChange, queryKey }) {
  const qc = useQueryClient();
  const [localStatus, setLocalStatus] = useState(myRSVP?.status || null);

  // Only sync local status from prop when no mutation is in flight
  useEffect(() => {
    if (!localStatus || !myRSVP) {
      setLocalStatus(myRSVP?.status || null);
    }
  }, [myRSVP?.status]);

  const set = useMutation({
    mutationFn: async (status) => {
      const { data, error } = await setEventRsvp(broadcast.id, user.id, status);
      if (error) throw error;
      return data;
    },
    onMutate: async (status) => {
      setLocalStatus(status);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, { status, broadcast_id: broadcast.id, user_id: user.id });
      return { previous, queryKey };
    },
    onError: (error, _status, context) => {
      setLocalStatus(myRSVP?.status || null);
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
      toast.error('RSVP failed', {
        description: error?.message || 'Could not update your RSVP. Try again.',
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      onChange();
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      await removeEventRsvp(broadcast.id, user.id);
    },
    onMutate: async () => {
      setLocalStatus(null);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData(queryKey);
      qc.setQueryData(queryKey, null);
      return { previous, queryKey };
    },
    onSuccess: () => {
    },
    onError: (error, _vars, context) => {
      setLocalStatus(myRSVP?.status || null);
      if (context?.previous) qc.setQueryData(context.queryKey, context.previous);
      const isNotFound = error?.message === 'RSVP_NOT_FOUND';
      toast.error(isNotFound ? 'Already cancelled' : 'Could not cancel RSVP', {
        description: isNotFound
          ? 'This RSVP was already removed.'
          : error?.message || 'Please try again.',
      });
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
      onChange();
    },
  });

  const isPending = set.isPending || remove.isPending;
  const activeStatus = isPending ? localStatus : (myRSVP?.status || null);

  const handleInterested = () => {
    if (activeStatus === 'interested') {
      remove.mutate();
    } else {
      set.mutate('interested');
    }
  };

  const handleGoing = () => {
    if (activeStatus === 'going') {
      remove.mutate();
    } else {
      set.mutate('going');
    }
  };

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={activeStatus === 'interested' ? 'default' : 'outline'}
          className={cn(
            'h-14 rounded-full text-base font-bold pressable transition-colors',
            activeStatus === 'interested'
              ? 'bg-brand-radar hover:bg-brand-radar/90 text-white glow-yamaha'
              : 'border-brand-radar/30 text-brand-radar hover:bg-brand-radar/10 hover:border-brand-radar/50'
          )}
          onClick={handleInterested}
          disabled={isPending}
        >
          <Heart className={cn('w-5 h-5 mr-1.5', activeStatus === 'interested' && 'fill-current')} />
          {activeStatus === 'interested' ? 'Interested' : 'Interested'} · {counts.interested}
        </Button>
        <Button
          variant={activeStatus === 'going' ? 'default' : 'outline'}
          className={cn(
            'h-14 rounded-full text-base font-bold pressable transition-colors',
            activeStatus === 'going'
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground glow-kawasaki-sm'
              : 'border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50'
          )}
          onClick={handleGoing}
          disabled={isPending}
        >
          <Check className="w-5 h-5 mr-1.5" />
          {activeStatus === 'going' ? 'Going' : 'Going'} · {counts.going}
        </Button>
      </div>
      {myRSVP && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Tap again to cancel
        </p>
      )}
    </div>
  );
});

const ConnectionAction = memo(function ConnectionAction({ broadcast, user, existing, onChange }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const sendRequest = useSendConnectionRequest();

  const handleSend = useCallback(() => {
    sendRequest.mutate(
      { from_user_id: user.id, to_user_id: broadcast.author_id, message: msg.trim() || undefined },
      { onSuccess: () => { setOpen(false); setMsg(''); onChange(); } }
    );
  }, [sendRequest, user, broadcast, msg, onChange]);

  if (existing && existing.status !== 'declined') {
    const map = { pending: 'Request sent', accepted: 'Connected' };
    return (
      <Button variant="outline" disabled className="w-full h-14 rounded-full border-primary/20">
        <Check className="w-4 h-4 mr-1.5" /> {map[existing.status] || 'Request sent'}
      </Button>
    );
  }

  return (
    <div>
      {!open ? (
        <Button onClick={() => setOpen(true)} className="w-full h-14 rounded-full glow-kawasaki-sm pressable text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-colors">
          <Users className="w-4 h-4 mr-1.5" /> Initiate connection
        </Button>
      ) : (
        <div className="p-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] space-y-3">
          <Text variant="micro" color="muted" className="mb-1 uppercase tracking-widest text-[10px] font-bold">Connection request</Text>
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Add a quick note (optional)..."
            rows={3}
            maxLength={200}
            className="rr-premium-input rounded-xl"
          />
          {sendRequest.isError && <p className="text-xs text-destructive">{sendRequest.error?.message || 'Failed to send request'}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-full h-11 border-white/[0.08] pressable hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleSend} disabled={sendRequest.isPending} className="flex-1 rounded-full h-11 glow-kawasaki-sm pressable bg-primary hover:bg-primary/90 text-primary-foreground transition-colors">
              {sendRequest.isPending ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

const BroadcastActions = memo(function BroadcastActions({ broadcast, user, myRSVP, rsvpCounts, connectionRequest, id }) {
  const qc = useQueryClient();

  const handleRsvpChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['myRSVP', id, user?.id] });
    qc.invalidateQueries({ queryKey: ['rsvpAttendees', id] });
  }, [qc, id, user?.id]);

  const handleConnectionChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['connection-requests'] });
  }, [qc]);

  return (
    <div className="mt-5">
      {broadcast.type === 'event' ? (
        <EventRSVP broadcast={broadcast} user={user} myRSVP={myRSVP} counts={rsvpCounts} onChange={handleRsvpChange} queryKey={['myRSVP', id, user?.id]} />
      ) : (
        <ConnectionAction broadcast={broadcast} user={user} existing={connectionRequest} onChange={handleConnectionChange} />
      )}
    </div>
  );
});

export default memo(BroadcastDetailPage);
