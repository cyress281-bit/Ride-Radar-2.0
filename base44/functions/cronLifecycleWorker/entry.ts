import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // We expect this to run via schedule automation, requiring admin.
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();

    // 1. Broadcast expiry
    const activeBroadcasts = await base44.asServiceRole.entities.Broadcast.filter({ status: 'active' });
    for (const b of activeBroadcasts) {
      if (b.expiresAt && new Date(b.expiresAt) <= now) {
        await base44.asServiceRole.entities.Broadcast.update(b.id, { status: 'expired' });
        
        await base44.asServiceRole.functions.invoke('sendNotification', {
          targetProfileId: b.authorId,
          type: 'broadcast_expired',
          title: 'Broadcast Expired',
          body: `Your broadcast "${b.title}" has expired.`,
          relatedEntityId: b.id,
          relatedEntityType: 'Broadcast'
        });
      }
    }

    // 2. Thread expiry
    const activeConvos = await base44.asServiceRole.entities.Conversation.filter({ status: 'active', type: 'connection' });
    for (const c of activeConvos) {
      if (c.threadExpiresAt && new Date(c.threadExpiresAt) <= now) {
        await base44.asServiceRole.entities.Conversation.update(c.id, { status: 'archived' });
        for (const pId of c.participantIds) {
          await base44.asServiceRole.functions.invoke('sendNotification', {
            targetProfileId: pId,
            type: 'thread_expired',
            title: 'Connection Thread Expired',
            body: `A connection thread has expired after 72 hours of inactivity.`,
            relatedEntityId: c.id,
            relatedEntityType: 'Conversation'
          });
        }
      }
    }

    // 3. Event reminders (Events starting between 1h and 2h from now)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 3600000);
    const oneHourFromNow = new Date(now.getTime() + 3600000);
    
    const upcomingEvents = activeBroadcasts.filter(b => 
      b.type === 'event' && 
      b.eventDate && 
      new Date(b.eventDate) > oneHourFromNow && 
      new Date(b.eventDate) <= twoHoursFromNow
    );

    for (const e of upcomingEvents) {
      const rsvps = await base44.asServiceRole.entities.EventRSVP.filter({ broadcastId: e.id, status: 'going' });
      for (const rsvp of rsvps) {
        await base44.asServiceRole.functions.invoke('sendNotification', {
          targetProfileId: rsvp.userId,
          type: 'event_reminder',
          title: 'Upcoming Event',
          body: `Event "${e.title}" is starting soon!`,
          relatedEntityId: e.id,
          relatedEntityType: 'Broadcast'
        });
      }
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});