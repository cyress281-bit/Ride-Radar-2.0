import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { ArrowLeft, MapPin, Calendar, Clock, Wrench, Users, Heart, Check } from 'lucide-react';
import { BROADCAST_META, timeAgo, timeUntilExpiry } from '@/lib/broadcastUtils';
import { useMyProfile, useCurrentUser } from '@/lib/useCurrentUser';
import { cn } from '@/lib/utils';

export default function BroadcastDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();

  const { data: broadcast } = useQuery({
    queryKey: ['broadcast', id],
    queryFn: async () => await base44.entities.Broadcast.get(id),
  });

  const { data: author } = useQuery({
    queryKey: ['profile', broadcast?.authorId],
    enabled: !!broadcast?.authorId,
    queryFn: async () => await base44.entities.UserProfile.get(broadcast.authorId),
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['myRequests', id, profile?.id],
    enabled: !!profile && !!broadcast,
    queryFn: async () => await base44.entities.ConnectionRequest.filter({ broadcastId: id, fromUserId: profile.id }),
  });

  const { data: myRSVP } = useQuery({
    queryKey: ['myRSVP', id, profile?.id],
    enabled: !!profile && !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const list = await base44.entities.EventRSVP.filter({ broadcastId: id, userId: profile.id });
      return list[0] || null;
    },
  });

  const { data: rsvpCounts = { interested: 0, going: 0 } } = useQuery({
    queryKey: ['rsvpCounts', id],
    enabled: !!broadcast && broadcast.type === 'event',
    queryFn: async () => {
      const list = await base44.entities.EventRSVP.filter({ broadcastId: id });
      return {
        interested: list.filter((r) => r.status === 'interested').length,
        going: list.filter((r) => r.status === 'going').length,
      };
    },
  });

  if (!broadcast) return <div className="p-10 text-center text-sm text-muted-foreground">Loading...</div>;

  const meta = BROADCAST_META[broadcast.type];
  const isAuthor = profile?.id === broadcast.authorId;
  const isAlert = broadcast.type === 'alert';

  return (
    <div className="px-5 pt-5">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className={cn('rounded-2xl border p-5', isAlert ? 'bg-alert/5 border-alert/40' : 'bg-card border-border/60')}>
        <div className={cn('inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-3',
          isAlert && 'bg-alert text-alert-foreground',
          broadcast.type === 'solo_ride' && 'bg-solo text-solo-foreground',
          broadcast.type === 'iso' && 'bg-iso text-iso-foreground',
          broadcast.type === 'event' && 'bg-event text-event-foreground'
        )}>
          {meta.label}
          {broadcast.isoSubtype && ` · ${broadcast.isoSubtype === 'mechanic' ? 'Mechanic' : 'Bike Crew'}`}
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight mb-2">{broadcast.title}</h1>
        {broadcast.body && <p className="text-[15px] text-foreground/80 leading-relaxed mb-4 whitespace-pre-wrap">{broadcast.body}</p>}

        {broadcast.type === 'event' && broadcast.eventImage && (
          <img src={broadcast.eventImage} className="w-full h-56 object-cover rounded-xl my-3" alt="" />
        )}

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
          <Link to={`/profile/${author.id}`} className="flex items-center gap-2.5 mt-4 pt-4 border-t border-border/60">
            {author.avatar ? (
              <img src={author.avatar} className="w-9 h-9 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center font-semibold text-sm">
                {author.displayName?.[0] || '?'}
              </div>
            )}
            <div>
              <div className="font-semibold text-sm">{author.displayName}</div>
              <div className="text-xs text-muted-foreground">@{author.username} · {timeAgo(broadcast.created_date)}</div>
            </div>
          </Link>
        )}
      </div>

      {/* Actions */}
      {!isAuthor && !isAlert && profile && (
        <div className="mt-5">
          {broadcast.type === 'event' ? (
            <EventRSVP broadcast={broadcast} profile={profile} myRSVP={myRSVP} counts={rsvpCounts} onChange={() => {
              qc.invalidateQueries({ queryKey: ['myRSVP', id] });
              qc.invalidateQueries({ queryKey: ['rsvpCounts', id] });
            }} />
          ) : (
            <ConnectionAction broadcast={broadcast} profile={profile} existing={myRequests[0]} onChange={() => qc.invalidateQueries({ queryKey: ['myRequests', id] })} />
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

function EventRSVP({ broadcast, profile, myRSVP, counts, onChange }) {
  const set = useMutation({
    mutationFn: async (status) => {
      const broadcastId = broadcast.id;
      const profileId = profile.id;
      if (myRSVP) {
        if (myRSVP.status === status) {
          await base44.entities.EventRSVP.delete(myRSVP.id);
        } else {
          await base44.entities.EventRSVP.update(myRSVP.id, { status });
          await base44.functions.invoke('sendNotification', {
            targetProfileId: broadcast.authorId,
            type: 'rsvp',
            title: 'RSVP Updated',
            body: `@${profile.username} is now ${status === 'going' ? 'going to' : 'interested in'} your event.`,
            relatedEntityId: broadcastId,
            relatedEntityType: 'Broadcast'
          });
        }
      } else {
        await base44.entities.EventRSVP.create({ broadcastId, userId: profileId, status });
        await base44.functions.invoke('sendNotification', {
          targetProfileId: broadcast.authorId,
          type: 'rsvp',
          title: 'New RSVP',
          body: `@${profile.username} is ${status === 'going' ? 'going to' : 'interested in'} your event.`,
          relatedEntityId: broadcastId,
          relatedEntityType: 'Broadcast'
        });
      }
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
}

function ConnectionAction({ broadcast, profile, existing, onChange }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');

  const send = useMutation({
    mutationFn: async () => {
      const existing = await base44.entities.ConnectionRequest.filter({ broadcastId: broadcast.id, fromUserId: profile.id });
      if (existing.length > 0) return;
      await base44.entities.ConnectionRequest.create({
        broadcastId: broadcast.id,
        fromUserId: profile.id,
        toUserId: broadcast.authorId,
        message: msg,
        status: 'pending',
      });
      await base44.functions.invoke('sendNotification', {
        targetProfileId: broadcast.authorId,
        type: 'connection_request',
        title: 'New connection request',
        body: `@${profile.username} wants to connect on your ${BROADCAST_META[broadcast.type].label.toLowerCase()}`,
        relatedEntityId: broadcast.id,
        relatedEntityType: 'Broadcast',
      });
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
}