import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function deriveExpiresAt(broadcast) {
  const created = new Date(broadcast.created_date || Date.now()).getTime();
  if (broadcast.type === 'solo_ride') return new Date(created + 90 * 60 * 1000).toISOString();
  if (broadcast.type === 'alert') return new Date(created + 240 * 60 * 1000).toISOString();
  if (broadcast.type === 'iso') return new Date(created + (broadcast.isoSubtype === 'mechanic' ? 720 : 1440) * 60 * 1000).toISOString();
  if (broadcast.type === 'event' && broadcast.eventEndTime) return new Date(new Date(broadcast.eventEndTime).getTime() + 6 * 60 * 60 * 1000).toISOString();
  return new Date(created + 24 * 60 * 60 * 1000).toISOString();
}

async function notify(base44, profileId, type, title, body, relatedEntityId, relatedEntityType) {
  const profile = await base44.asServiceRole.entities.UserProfile.get(profileId);
  if (!profile?.userId || profile.isDeleted === true) return false;
  await base44.asServiceRole.entities.Notification.create({
    userId: profile.id,
    userAuthId: profile.userId,
    type,
    title,
    body,
    relatedEntityId,
    relatedEntityType,
    isRead: false
  });
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date();
    const activeBroadcasts = await base44.asServiceRole.entities.Broadcast.filter({ status: 'active' });
    let repairedBroadcasts = 0;
    let expiredBroadcasts = 0;

    for (const broadcast of activeBroadcasts) {
      let expiresAt = broadcast.expiresAt;
      if (!expiresAt) {
        expiresAt = deriveExpiresAt(broadcast);
        await base44.asServiceRole.entities.Broadcast.update(broadcast.id, { expiresAt });
        repairedBroadcasts += 1;
      }

      if (new Date(expiresAt) <= now) {
        await base44.asServiceRole.entities.Broadcast.update(broadcast.id, { status: 'expired' });
        expiredBroadcasts += 1;
        await notify(base44, broadcast.authorId, 'broadcast_expired', 'Broadcast Expired', `Your broadcast "${broadcast.title}" has expired.`, broadcast.id, 'Broadcast');
      }
    }

    const activeConvos = await base44.asServiceRole.entities.Conversation.filter({ status: 'active', type: 'connection' });
    let archivedThreads = 0;
    for (const conversation of activeConvos) {
      if (conversation.threadExpiresAt && new Date(conversation.threadExpiresAt) <= now) {
        await base44.asServiceRole.entities.Conversation.update(conversation.id, { status: 'archived' });
        archivedThreads += 1;
        for (const profileId of conversation.participantIds || []) {
          await notify(base44, profileId, 'thread_expired', 'Connection Thread Expired', 'A connection thread has expired after 72 hours of inactivity.', conversation.id, 'Conversation');
        }
      }
    }

    const twoHoursFromNow = new Date(now.getTime() + 2 * 3600000);
    const oneHourFromNow = new Date(now.getTime() + 3600000);
    const upcomingEvents = activeBroadcasts.filter((broadcast) =>
      broadcast.type === 'event' &&
      broadcast.eventDate &&
      new Date(broadcast.eventDate) > oneHourFromNow &&
      new Date(broadcast.eventDate) <= twoHoursFromNow
    );

    let remindersSent = 0;
    for (const event of upcomingEvents) {
      const rsvps = await base44.asServiceRole.entities.EventRSVP.filter({ broadcastId: event.id, status: 'going' });
      for (const rsvp of rsvps) {
        const existing = await base44.asServiceRole.entities.Notification.filter({
          userId: rsvp.userId,
          type: 'event_reminder',
          relatedEntityId: event.id
        });
        if (existing.length > 0) continue;
        await notify(base44, rsvp.userId, 'event_reminder', 'Upcoming Event', `Event "${event.title}" is starting soon!`, event.id, 'Broadcast');
        remindersSent += 1;
      }
    }

    return Response.json({ success: true, repairedBroadcasts, expiredBroadcasts, archivedThreads, remindersSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});