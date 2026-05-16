import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useState, memo, useCallback } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Heart, Check, Share2, Radio, Trash2, Loader2, AlertCircle, Pencil } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import AlertPhotoGrid from '@/components/shared/AlertPhotoGrid';
import { Text } from '@/components/ui/primitives/Text';
import { HStack, VStack } from '@/components/ui/primitives/Stack';
import { BROADCAST_META, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';
import { getProfileByUserId } from '@/features/profile/api/profile-api.js';
import { isValidUuid } from '@/lib/utils.js';
import SafetyActions from '@/components/safety/SafetyActions';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { toast } from '@/components/ui/use-toast';
import { getBroadcastById, getEventRsvps, getMyEventRsvp, setEventRsvp } from '@/features/broadcast/api/broadcast-api.js';
import { useConnectionRequestWith, useSendConnectionRequest } from '@/features/connections/hooks/use-connection-requests.js';
import { broadcastKeys, useRemoveBroadcast, useUpdateBroadcast } from '@/features/broadcast/hooks/use-broadcasts.js';

/**
 * Single broadcast detail page.
 */
function BroadcastDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthState();
  const hasValidBroadcastId = isValidUuid(id);

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
    staleTime: 30_000,
  });

  const { data: rsvpCounts = { interested: 0, going: 0 } } = useQuery({
    queryKey: ['rsvpCounts', id],
    enabled: !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await getEventRsvps(id);
      if (error) throw error;
      return {
        interested: (data || []).filter((r) => r.status === 'interested').length,
        going: (data || []).filter((r) => r.status === 'going').length,
      };
    },
    staleTime: 30_000,
  });

  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editError, setEditError] = useState('');

  const removeSignal = useRemoveBroadcast();
  const updateSignal = useUpdateBroadcast();

  const canEditTitle = broadcast?.type === 'solo_ride' || broadcast?.type === 'iso' || broadcast?.type === 'event';
  const saveDisabled = updateSignal.isPending || (canEditTitle && editTitle.trim().length < 3);

  const handleGoBack = useCallback(() => navigate(-1), [navigate]);

  const handleShare = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ title: 'Link copied', description: 'Signal link copied to clipboard.' });
    } catch {
      toast({ title: 'Copy failed', description: 'Unable to copy link.', variant: 'destructive' });
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
      toast({ title: 'Signal updated', description: 'Your changes are now live.' });
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

  if (!hasValidBroadcastId) {
    return (
      <div className="px-5 pt-5">
        <button onClick={handleGoBack} className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Invalid signal link.</Text>
        </div>
      </div>
    );
  }

  if (isBroadcastLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-sm text-muted-foreground">
        <RRLogo size="md" className="mb-4 animate-pulse" />
        Loading signal…
      </div>
    );
  }

  if (isBroadcastError) {
    return (
      <div className="px-5 pt-5">
        <button onClick={handleGoBack} className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Unable to load this signal.</Text>
        </div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="px-5 pt-5">
        <button onClick={handleGoBack} className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="surface-card p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <Text variant="bodySm" color="muted">Signal not found.</Text>
        </div>
      </div>
    );
  }

  const meta = BROADCAST_META[broadcast.type];
  const displayLabel = broadcast.alert_type === 'bike_down' ? 'Bike Down' : meta?.label;
  const isAuthor = user?.id === broadcast.author_id;
  const isAlert = broadcast.type === 'alert';

  const typeAccentClass = {
    solo_ride: 'border-l-[3px] border-l-primary shadow-[-3px_0_14px_hsl(var(--primary)/0.25)]',
    iso: 'border-l-[3px] border-l-brand-radar shadow-[-3px_0_14px_hsl(var(--brand-radar)/0.25)]',
    event: 'border-l-[3px] border-l-brand-amber shadow-[-3px_0_14px_hsl(var(--brand-amber)/0.25)]',
    alert: 'border-l-[3px] border-l-brand-emergency shadow-[-3px_0_14px_hsl(var(--brand-emergency)/0.3)]',
  }[broadcast.type] || 'border-l-[3px] border-l-border/60';

  const badgeClass = {
    solo_ride: 'bg-primary/10 text-primary border-primary/30',
    iso: 'bg-brand-radar/10 text-brand-radar border-brand-radar/30',
    event: 'bg-brand-amber/10 text-brand-amber border-brand-amber/30',
    alert: 'bg-brand-emergency/10 text-brand-emergency border-brand-emergency/30',
  }[broadcast.type] || 'bg-muted text-muted-foreground border-border/50';

  const hasHeroImage = broadcast.type === 'event' && broadcast.event_image_url;

  return (
    <div className="px-5 pt-5 pb-8">
      {/* Top nav */}
      <HStack justify="between" align="center" className="mb-5">
        <button onClick={handleGoBack} aria-label="Go back" className="pressable flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
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
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-3 border backdrop-blur-md',
              badgeClass
            )}>
              {displayLabel}
            </div>
            <Text as="h1" variant="h1" className="text-2xl sm:text-3xl font-extrabold text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] tracking-tight">
              {broadcast.title}
            </Text>
          </div>
        </div>
      )}

      <div className={cn('rounded-[24px] border p-5 relative overflow-hidden backdrop-blur-xl bg-surface/80 border-white/[0.06]', !hasHeroImage && typeAccentClass)}>
        {/* Subtle ambient glow */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/[0.04] blur-3xl pointer-events-none" />

        {!hasHeroImage && (
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4 border backdrop-blur-md',
              badgeClass
            )}
          >
            {broadcast.type === 'solo_ride' && <OfficialMotorcycleIcon className="h-5 w-6 rounded-md" />}
            {displayLabel}
            {broadcast.iso_subtype && ` · ${broadcast.iso_subtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}`}
          </div>
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
        {author && (
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
        )}
      </div>

      {/* Owner controls */}
      {isAuthor && (
        <div className="mt-4 rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4">
          {!editOpen && !confirmRemove ? (
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

      {/* Related broadcasts — horizontal scroll with RideCards */}
      <div className="mt-5">
        <Text variant="micro" color="muted" className="mb-3 uppercase tracking-widest text-[10px] font-bold px-1">Related rides</Text>
        <div className="-mx-5 px-5">
          <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="min-w-[260px] max-w-[260px] snap-start rounded-[20px] backdrop-blur-xl bg-surface/80 border border-white/[0.06] p-4 flex-shrink-0"
              >
                <div className="h-28 rounded-2xl bg-surface-elevated border border-white/[0.04] mb-3 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-muted-foreground/20" />
                </div>
                <div className="h-3 w-20 rounded-full bg-primary/20 mb-2" />
                <div className="h-2.5 w-full rounded-full bg-white/[0.04] mb-1.5" />
                <div className="h-2.5 w-2/3 rounded-full bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const EventRSVP = memo(function EventRSVP({ broadcast, user, myRSVP, counts, onChange }) {
  const set = useMutation({
    mutationFn: async (status) => {
      const { error } = await setEventRsvp(broadcast.id, user.id, status);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (error) => {
      toast({
        title: 'RSVP failed',
        description: error?.message || 'Could not update your RSVP. Try again.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={myRSVP?.status === 'interested' ? 'default' : 'outline'}
          className={cn(
            'h-14 rounded-full text-base font-bold pressable transition-colors',
            myRSVP?.status === 'interested'
              ? 'bg-brand-radar hover:bg-brand-radar/90 text-white glow-yamaha'
              : 'border-brand-radar/30 text-brand-radar hover:bg-brand-radar/10 hover:border-brand-radar/50'
          )}
          onClick={() => set.mutate('interested')}
          disabled={set.isPending}
        >
          <Heart className={cn('w-5 h-5 mr-1.5', myRSVP?.status === 'interested' && 'fill-current')} />
          Interested · {counts.interested}
        </Button>
        <Button
          variant={myRSVP?.status === 'going' ? 'default' : 'outline'}
          className={cn(
            'h-14 rounded-full text-base font-bold pressable transition-colors',
            myRSVP?.status === 'going'
              ? 'bg-primary hover:bg-primary/90 text-primary-foreground glow-kawasaki-sm'
              : 'border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50'
          )}
          onClick={() => set.mutate('going')}
          disabled={set.isPending}
        >
          <Check className="w-5 h-5 mr-1.5" />
          Going · {counts.going}
        </Button>
      </div>
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

  if (existing) {
    const map = { pending: 'Request sent', accepted: 'Connected', declined: 'Declined' };
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
    qc.invalidateQueries({ queryKey: ['myRSVP', id] });
    qc.invalidateQueries({ queryKey: ['rsvpCounts', id] });
  }, [qc, id]);

  const handleConnectionChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['connection-requests'] });
  }, [qc]);

  return (
    <div className="mt-5">
      {broadcast.type === 'event' ? (
        <EventRSVP broadcast={broadcast} user={user} myRSVP={myRSVP} counts={rsvpCounts} onChange={handleRsvpChange} />
      ) : (
        <ConnectionAction broadcast={broadcast} user={user} existing={connectionRequest} onChange={handleConnectionChange} />
      )}
    </div>
  );
});

export default memo(BroadcastDetailPage);
