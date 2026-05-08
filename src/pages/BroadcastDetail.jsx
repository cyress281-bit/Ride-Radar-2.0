import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSupabaseAuth } from '@/lib/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState, memo } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Users, Heart, Check } from 'lucide-react';
import AlertPhotoGrid from '@/components/broadcast/AlertPhotoGrid';
import { BROADCAST_META, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { cn } from '@/lib/utils';
import { getProfileByIdSafe, isValidUuid } from '@/lib/profileLookup';
import SafetyActions from '@/components/safety/SafetyActions';
import OfficialMotorcycleIcon from '@/components/brand/OfficialMotorcycleIcon';
import { prefetchRiderProfile } from '@/lib/query-client';
import { normalizeBroadcast, normalizeProfile } from '@/lib/supabaseNormalizer';

export default function BroadcastDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useSupabaseAuth();
  const hasValidBroadcastId = isValidUuid(id);

  const { data: broadcast, isLoading: isBroadcastLoading, isError: isBroadcastError } = useQuery({
    queryKey: ['broadcast', id],
    enabled: hasValidBroadcastId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('broadcasts')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return normalizeBroadcast(data);
    },
    staleTime: 60000, // 1 min - broadcasts don't change often
  });

  const { data: author } = useQuery({
    queryKey: ['profile', broadcast?.authorId],
    enabled: !!broadcast?.authorId,
    queryFn: async () => normalizeProfile(await getProfileByIdSafe(broadcast.authorId)),
    staleTime: 5 * 60 * 1000, // 5 min - profiles are stable
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
    staleTime: 30000, // 30s - user's own requests
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
    staleTime: 30000,
  });

  const { data: rsvpCounts = { interested: 0, going: 0 } } = useQuery({
    queryKey: ['rsvpCounts', id],
    enabled: !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_rsvps')
        .select('status')
        .eq('broadcast_id', id);

      if (error) throw error;
      return {
        interested: (data || []).filter((r) => r.status === 'interested').length,
        going: (data || []).filter((r) => r.status === 'going').length,
      };
    },
    staleTime: 30000,
  });

  if (!hasValidBroadcastId) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Invalid broadcast link.</div>
      </div>
    );
  }

  if (isBroadcastLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  if (isBroadcastError) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Unable to load this broadcast.</div>
      </div>
    );
  }

  if (!broadcast) {
    return (
      <div className="px-5 pt-5">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-10 text-center text-sm text-muted-foreground">Broadcast not found.</div>
      </div>
    );
  }

  const meta = BROADCAST_META[broadcast.type];
  const isAuthor = user?.id === broadcast.authorId;
  const isAlert = broadcast.type === 'alert';

  return (
    <div className="px-5 pt-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className={cn('rounded-3xl border p-6 relative overflow-hidden', isAlert ? 'bg-alert/5 border-alert/40 shadow-[0_0_30px_hsl(var(--alert)/0.1)]' : 'bg-card border-border/60 shadow-lg')}>
        {isAlert && <div className="absolute top-0 left-0 right-0 h-1 bg-alert animate-pulse-alert" />}
        {broadcast.type === 'iso' && <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />}
        
        <div className={cn('inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest mb-5 border border-current/20',
          isAlert && 'bg-alert/10 text-alert',
          broadcast.type === 'solo_ride' && 'bg-solo/10 text-solo',
          broadcast.type === 'iso' && 'bg-iso/10 text-iso',
          broadcast.type === 'event' && 'bg-event/10 text-event'
        )}>
        {broadcast.type === 'solo_ride' && <OfficialMotorcycleIcon className="h-5 w-6 rounded-md" />}
        {meta.label}
          {broadcast.isoSubtype && ` · ${broadcast.isoSubtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}`}
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight mb-2">{broadcast.title}</h1>
        {broadcast.body && <p className="text-[15px] text-foreground/80 leading-relaxed mb-4 whitespace-pre-wrap">{broadcast.body}</p>}

        {broadcast.type === 'event' && broadcast.eventImage && (
          <div className="my-5 flex max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl border border-event/25 bg-black/45 p-2 shadow-[0_18px_55px_rgba(0,0,0,0.35),inset_0_1px_0_hsl(0_0%_100%/0.05)]">
            <img src={broadcast.eventImage} className="max-h-[68vh] w-full object-contain" alt="Event poster" />
          </div>
        )}
        {isAlert && <AlertPhotoGrid images={broadcast.alertImages} variant="detail" />}

        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground mt-3">
          {(broadcast.type === 'event' || isAlert) && broadcast.exactLocationText && (
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{broadcast.exactLocationText}</span>
          )}
          {broadcast.type === 'event' && broadcast.eventDate && (
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" />
              {new Date(broadcast.eventDate).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{timeUntilExpiry(broadcast.expiresAt)}</span>
        </div>

        {author && (
          <Link
            to={`/profile/${author.user_id}`}
            onMouseEnter={() => prefetchRiderProfile(author.user_id)}
            onFocus={() => prefetchRiderProfile(author.user_id)}
            className="flex items-center gap-2.5 mt-4 pt-4 border-t border-border/60"
          >
            {author.avatar ? (
              <img src={author.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                {author.displayName?.[0] || '?'}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{author.displayName}</div>
              <div className="text-xs text-muted-foreground">{timeAgo(broadcast.createdAt)}</div>
            </div>
          </Link>
        )}
      </div>

      {!isAuthor && user && (
        <div className="mt-4">
          <SafetyActions targetType="broadcast" targetId={broadcast.id} targetProfileId={broadcast.authorId} />
        </div>
      )}

      {/* Actions */}
      {!isAuthor && !isAlert && user && (
        <div className="mt-5">
          {broadcast.type === 'event' ? (
            <EventRSVP broadcast={broadcast} user={user} myRSVP={myRSVP} counts={rsvpCounts} onChange={() => {
              qc.invalidateQueries({ queryKey: ['myRSVP', id] });
              qc.invalidateQueries({ queryKey: ['rsvpCounts', id] });
            }} />
          ) : (
            <ConnectionAction broadcast={broadcast} user={user} existing={myRequests[0]} onChange={() => qc.invalidateQueries({ queryKey: ['myRequests', id] })} />
          )}
        </div>
      )}

      {isAuthor && broadcast.type === 'event' && (
        <div className="mt-5 p-4 rounded-xl bg-accent/50 text-sm">
          <div className="font-semibold mb-1">Your event</div>
          <div className="text-muted-foreground">{rsvpCounts.going} going · {rsvpCounts.interested} interested</div>
        </div>
      )}
    </div>
  );
}

/**
 * Memoized RSVP buttons - prevents re-render when unrelated parent queries
 * (like the author profile) settle. Only re-renders when RSVP state changes.
 */
const EventRSVP = memo(function EventRSVP({ broadcast, user, myRSVP, counts, onChange }) {
  const set = useMutation({
    mutationFn: async (status) => {
      // Upsert RSVP
      const { error } = await supabase
        .from('event_rsvps')
        .upsert({
          broadcast_id: broadcast.id,
          user_id: user.id,
          status,
        }, {
          onConflict: 'broadcast_id,user_id',
        });

      if (error) throw error;
    },
    onSuccess: onChange,
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant={myRSVP?.status === 'interested' ? 'default' : 'outline'}
          className="h-12 rounded-full"
          onClick={() => set.mutate('interested')}
          disabled={set.isPending}
        >
          <Heart className={cn('w-4 h-4 mr-1.5', myRSVP?.status === 'interested' && 'fill-current')} />
          Interested · {counts.interested}
        </Button>
        <Button
          variant={myRSVP?.status === 'going' ? 'default' : 'outline'}
          className="h-12 rounded-full"
          onClick={() => set.mutate('going')}
          disabled={set.isPending}
        >
          <Check className="w-4 h-4 mr-1.5" />
          Going · {counts.going}
        </Button>
      </div>
    </div>
  );
});

/**
 * Memoized connection request form - prevents re-render when parent
 * queries (broadcast details, RSVP counts) settle but request status hasn't changed.
 */
const ConnectionAction = memo(function ConnectionAction({ broadcast, user, existing, onChange }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          broadcast_id: broadcast.id,
          from_user_id: user.id,
          to_user_id: broadcast.authorId,
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
      <Button variant="outline" disabled className="w-full h-12 rounded-full">
        <Check className="w-4 h-4 mr-1.5" /> {map[existing.status]}
      </Button>
    );
  }

  return (
    <div>
      {!open ? (
        <Button onClick={() => setOpen(true)} className="w-full h-12 rounded-full">
          <Users className="w-4 h-4 mr-1.5" /> Send connection request
        </Button>
      ) : (
        <div className="p-4 rounded-xl bg-card border border-border space-y-3">
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Add a quick note (optional)..." rows={3} maxLength={200} />
          {send.isError && <p className="text-xs text-destructive">{send.error?.message || 'Failed to send request'}</p>}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            <Button onClick={() => send.mutate()} disabled={send.isPending} className="flex-1">
              {send.isPending ? 'Sending...' : 'Send request'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
