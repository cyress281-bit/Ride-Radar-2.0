import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase.js';
import { useAuthState } from '@/features/auth/hooks/use-auth.js';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, memo, useCallback } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Heart, Check } from 'lucide-react';
import RRLogo from '@/components/RRLogo';
import AlertPhotoGrid from '@/components/shared/AlertPhotoGrid';
import { BROADCAST_META, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils.js';
import { getProfileById } from '@/features/profile/api/profile-api.js';
import { isValidUuid } from '@/lib/utils.js';
import SafetyActions from '@/components/safety/SafetyActions';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';

/**
 * Single broadcast detail page.
 * FIX: Uses `broadcast.author_id` (snake_case) everywhere.
 */
function BroadcastDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthState();
  const hasValidBroadcastId = isValidUuid(id);

  const { data: broadcast, isLoading: isBroadcastLoading, isError: isBroadcastError } = useQuery({
    queryKey: ['broadcast', id],
    enabled: hasValidBroadcastId,
    queryFn: async () => {
      const { data, error } = await supabase.from('broadcasts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return data;
    },
    staleTime: 60_000,
  });

  const { data: author } = useQuery({
    queryKey: ['profile', broadcast?.author_id],
    enabled: !!broadcast?.author_id,
    queryFn: async () => {
      const { data, error } = await getProfileById(broadcast.author_id);
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests', id, user?.id],
    enabled: !!user && !!broadcast,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('broadcast_id', id)
        .eq('from_user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const { data: myRSVP } = useQuery({
    queryKey: ['myRSVP', id, user?.id],
    enabled: !!user && !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('*')
        .eq('broadcast_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });

  const { data: rsvpCounts = { interested: 0, going: 0 } } = useQuery({
    queryKey: ['rsvpCounts', id],
    enabled: !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await supabase.from('event_rsvps').select('status').eq('broadcast_id', id);
      if (error) throw error;
      return {
        interested: (data || []).filter((r) => r.status === 'interested').length,
        going: (data || []).filter((r) => r.status === 'going').length,
      };
    },
    staleTime: 30_000,
  });

  if (!hasValidBroadcastId) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rr-surface rounded-2xl p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">Invalid broadcast link.</p>
        </div>
      </div>
    );
  }

  if (isBroadcastLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-sm text-muted-foreground">
        <RRLogo size="md" className="mb-4 animate-pulse" />
        Loading broadcast…
      </div>
    );
  }

  if (isBroadcastError) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rr-surface rounded-2xl p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">Unable to load this broadcast.</p>
        </div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="rr-surface rounded-2xl p-10 text-center">
          <RRLogo size="md" className="mx-auto mb-4 opacity-60" />
          <p className="text-sm text-muted-foreground">Broadcast not found.</p>
        </div>
      </div>
    );
  }

  const meta = BROADCAST_META[broadcast.type];
  const isAuthor = user?.id === broadcast.author_id;
  const isAlert = broadcast.type === 'alert';

  const typeAccentClass = {
    solo_ride: 'border-solo/30 bg-solo/5',
    iso: 'border-iso/30 bg-iso/5',
    event: 'border-event/30 bg-event/5',
    alert: 'border-alert/30 bg-alert/5',
  }[broadcast.type] || 'border-border/60 bg-card';

  const typeTopBorder = {
    solo_ride: 'bg-solo',
    iso: 'bg-iso',
    event: 'bg-event',
    alert: 'bg-alert animate-pulse-alert',
  }[broadcast.type];

  return (
    <div className="px-5 pt-5 pb-8">
      <button onClick={() => navigate(-1)} className="rr-haptic flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 min-h-[44px] px-1">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className={cn('rounded-[1.45rem] border p-5 relative overflow-hidden rr-surface', typeAccentClass)}>
        <div className={cn('absolute top-0 left-0 right-0 h-1', typeTopBorder)} />

        <div
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-4 border',
            isAlert && 'bg-alert/10 text-alert border-alert/20',
            broadcast.type === 'solo_ride' && 'bg-solo/10 text-solo border-solo/20',
            broadcast.type === 'iso' && 'bg-iso/10 text-iso border-iso/20',
            broadcast.type === 'event' && 'bg-event/10 text-event border-event/20'
          )}
        >
          {broadcast.type === 'solo_ride' && <OfficialMotorcycleIcon className="h-5 w-6 rounded-md" />}
          {meta.label}
          {broadcast.iso_subtype && ` · ${broadcast.iso_subtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}`}
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight mb-2">{broadcast.title}</h1>
        {broadcast.body && <p className="text-[15px] text-foreground/80 leading-relaxed mb-4 whitespace-pre-wrap">{broadcast.body}</p>}

        {broadcast.type === 'event' && broadcast.event_image_url && (
          <div className="my-5 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-event/20 bg-black/45 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.35),inset_0_1px_0_hsl(0_0%_100%/0.05)]">
            <img src={broadcast.event_image_url} className="max-h-[68vh] w-full object-contain" alt="Event poster" />
          </div>
        )}

        {isAlert && <AlertPhotoGrid images={broadcast.alert_photos || broadcast.alert_image_urls} variant="detail" />}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-4">
          {(broadcast.type === 'event' || isAlert) && broadcast.exact_location_text && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-primary" />
              {broadcast.exact_location_text}
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
        </div>

        {author && (
          <Link
            to={`/profile/${author.user_id}`}
            className="flex items-center gap-3 mt-5 pt-4 border-t border-border/60 rr-haptic"
          >
            {author.avatar ? (
              <div className="rr-avatar-ring shrink-0" style={{ padding: '3px' }}>
                <img src={author.avatar} className="w-10 h-10 rounded-full object-cover border border-primary/30" alt="" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm border border-border/50">
                {author.displayName?.[0] || '?'}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{author.display_name}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(broadcast.created_at)}</div>
            </div>
          </Link>
        )}
      </div>

      {!isAuthor && user && (
        <div className="mt-4">
          <SafetyActions targetType="broadcast" targetId={broadcast.id} targetProfileId={broadcast.author_id} />
        </div>
      )}

      {!isAuthor && !isAlert && user && (
        <BroadcastActions broadcast={broadcast} user={user} myRSVP={myRSVP} rsvpCounts={rsvpCounts} myRequests={myRequests} id={id} />
      )}

      {isAuthor && broadcast.type === 'event' && (
        <div className="mt-5 p-4 rounded-2xl rr-surface border border-primary/15">
          <div className="rr-kicker text-muted-foreground mb-2">Your event</div>
          <div className="font-display text-lg font-bold">{rsvpCounts.going} going · {rsvpCounts.interested} interested</div>
        </div>
      )}
    </div>
  );
}

const EventRSVP = memo(function EventRSVP({ broadcast, user, myRSVP, counts, onChange }) {
  const set = useMutation({
    mutationFn: async (status) => {
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({ broadcast_id: broadcast.id, user_id: user.id, status }, { onConflict: 'broadcast_id,user_id' });
      if (error) throw error;
    },
    onSuccess: onChange,
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={myRSVP?.status === 'interested' ? 'default' : 'outline'}
          className={cn('h-14 rounded-full text-base font-bold rr-haptic', myRSVP?.status === 'interested' && 'glow-green')}
          onClick={() => set.mutate('interested')}
          disabled={set.isPending}
        >
          <Heart className={cn('w-5 h-5 mr-1.5', myRSVP?.status === 'interested' && 'fill-current')} />
          Interested · {counts.interested}
        </Button>
        <Button
          variant={myRSVP?.status === 'going' ? 'default' : 'outline'}
          className={cn('h-14 rounded-full text-base font-bold rr-haptic', myRSVP?.status === 'going' && 'glow-green')}
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

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('connection_requests').insert({
        broadcast_id: broadcast.id,
        from_user_id: user.id,
        to_user_id: broadcast.author_id,
        message: msg.trim() || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => { setOpen(false); onChange(); },
  });

  if (existing) {
    const map = { pending: 'Request sent', accepted: 'Connected', declined: 'Declined' };
    return (
      <Button variant="outline" disabled className="w-full h-12 rounded-full border-primary/20">
        <Check className="w-4 h-4 mr-1.5" /> {map[existing.status]}
      </Button>
    );
  }

  return (
    <div>
      {!open ? (
        <Button onClick={() => setOpen(true)} className="w-full h-12 rounded-full glow-green rr-haptic text-base font-bold">
          <Users className="w-4 h-4 mr-1.5" /> Initiate connection
        </Button>
      ) : (
        <div className="p-4 rounded-2xl rr-glass-panel space-y-3">
          <div className="rr-kicker text-muted-foreground mb-1">Connection request</div>
          <Textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="Add a quick note (optional)..."
            rows={3}
            maxLength={200}
            className="rr-premium-input rounded-xl"
          />
          {send.isError && <p className="text-xs text-destructive">{send.error?.message || 'Failed to send request'}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1 rounded-full h-11 border-primary/20">Cancel</Button>
            <Button onClick={() => send.mutate()} disabled={send.isPending} className="flex-1 rounded-full h-11 glow-green-sm">
              {send.isPending ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

const BroadcastActions = memo(function BroadcastActions({ broadcast, user, myRSVP, rsvpCounts, myRequests, id }) {
  const qc = useQueryClient();

  const handleRsvpChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['myRSVP', id] });
    qc.invalidateQueries({ queryKey: ['rsvpCounts', id] });
  }, [qc, id]);

  const handleConnectionChange = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['myRequests', id] });
  }, [qc, id]);

  return (
    <div className="mt-5">
      {broadcast.type === 'event' ? (
        <EventRSVP broadcast={broadcast} user={user} myRSVP={myRSVP} counts={rsvpCounts} onChange={handleRsvpChange} />
      ) : (
        <ConnectionAction broadcast={broadcast} user={user} existing={myRequests[0]} onChange={handleConnectionChange} />
      )}
    </div>
  );
});

export default memo(BroadcastDetailPage);

