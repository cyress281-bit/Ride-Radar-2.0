import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const allowedTypes = new Set([
  'connection_request',
  'connection_accepted',
  'new_message',
  'rsvp',
  'event_reminder',
  'broadcast_expired',
  'thread_expired',
  'friend_request',
  'friend_accepted',
  'alert',
  'announcement'
]);

async function getMyProfile(base44, user) {
  const byEmail = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
  const byUser = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
  return [...byEmail, ...byUser].find((profile) => profile && profile.isDeleted !== true) || null;
}

async function assertNotificationAllowed(base44, user, payload) {
  const { sendToAll, targetProfileId, type, relatedEntityId, relatedEntityType } = payload;

  if (!type || !allowedTypes.has(type)) throw new Error('Invalid notification type');
  if (!payload.title || typeof payload.title !== 'string') throw new Error('Notification title is required');

  if (sendToAll) {
    if (user.role !== 'admin') throw new Error('Forbidden');
    if (type !== 'announcement' && type !== 'alert') throw new Error('Only announcements or alerts can be sent to all users');
    return;
  }

  if (!targetProfileId) throw new Error('targetProfileId is required');

  if (['broadcast_expired', 'thread_expired', 'event_reminder'].includes(type)) {
    if (user.role !== 'admin') throw new Error('System notification requires admin');
    return;
  }

  const me = await getMyProfile(base44, user);
  if (!me) throw new Error('Profile required');

  if (type === 'connection_request') {
    const requests = await base44.asServiceRole.entities.ConnectionRequest.filter({ broadcastId: relatedEntityId, fromUserId: me.id, toUserId: targetProfileId });
    if (!requests.length) throw new Error('Connection request not found');
    return;
  }

  if (type === 'connection_accepted') {
    const requests = await base44.asServiceRole.entities.ConnectionRequest.filter({ fromUserId: targetProfileId, toUserId: me.id, status: 'accepted' });
    if (!requests.some((request) => !relatedEntityId || request.id === relatedEntityId || relatedEntityType === 'Conversation')) throw new Error('Accepted request not found');
    return;
  }

  if (type === 'new_message') {
    if (relatedEntityType !== 'Conversation' || !relatedEntityId) throw new Error('Conversation reference required');
    const conversation = await base44.asServiceRole.entities.Conversation.get(relatedEntityId);
    if (!conversation?.participantIds?.includes(me.id) || !conversation.participantIds.includes(targetProfileId)) throw new Error('Not a conversation participant');
    return;
  }

  if (type === 'rsvp') {
    if (relatedEntityType !== 'Broadcast' || !relatedEntityId) throw new Error('Broadcast reference required');
    const rsvps = await base44.asServiceRole.entities.EventRSVP.filter({ broadcastId: relatedEntityId, userId: me.id });
    const broadcast = await base44.asServiceRole.entities.Broadcast.get(relatedEntityId);
    if (!rsvps.length || broadcast?.authorId !== targetProfileId) throw new Error('RSVP notification not allowed');
    return;
  }

  if (type === 'friend_request') {
    const friendships = await base44.asServiceRole.entities.Friendship.filter({ userAId: me.id, userBId: targetProfileId, status: 'pending' });
    if (!friendships.length) throw new Error('Friend request not found');
    return;
  }

  if (type === 'friend_accepted') {
    const friendships = await base44.asServiceRole.entities.Friendship.filter({ userAId: targetProfileId, userBId: me.id, status: 'active' });
    if (!friendships.length) throw new Error('Friendship not found');
    return;
  }

  throw new Error('Notification type not allowed for direct user action');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    await assertNotificationAllowed(base44, user, payload);

    const { targetProfileId, sendToAll, type, title, body, relatedEntityId, relatedEntityType } = payload;

    let targetProfiles = [];
    if (sendToAll) {
      targetProfiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 5000);
      targetProfiles = targetProfiles.filter((profile) => profile.isDeleted !== true);
    } else {
      const profile = await base44.asServiceRole.entities.UserProfile.get(targetProfileId);
      if (profile && profile.isDeleted !== true) targetProfiles = [profile];
    }

    if (!targetProfiles.length) return Response.json({ success: false, reason: 'no profiles' });

    let settingsList = [];
    if (sendToAll) {
      settingsList = await base44.asServiceRole.entities.UserSettings.list('-created_date', 5000);
    } else {
      const userIds = targetProfiles.map((profile) => profile.userId).filter(Boolean);
      settingsList = await Promise.all(userIds.map((id) => base44.asServiceRole.entities.UserSettings.filter({ userId: id }).then((list) => list[0])));
    }

    const settingsMap = {};
    settingsList.forEach((settings) => { if (settings) settingsMap[settings.userId] = settings; });

    const notificationsToCreate = [];
    for (const profile of targetProfiles) {
      const userSettings = settingsMap[profile.userId] || {};
      let shouldNotify = true;

      if ((type.includes('connection') || type.includes('friend')) && userSettings.notifyOnConnection === false) shouldNotify = false;
      if (type === 'new_message' && userSettings.notifyOnMessage === false) shouldNotify = false;
      if ((type.includes('rsvp') || type === 'event_reminder') && userSettings.notifyOnRSVP === false) shouldNotify = false;
      if (type === 'alert' && userSettings.notifyOnAlert === false) shouldNotify = false;

      if (shouldNotify) {
        notificationsToCreate.push({
          userId: profile.id,
          userAuthId: profile.userId,
          type,
          title: title.slice(0, 140),
          body: typeof body === 'string' ? body.slice(0, 500) : '',
          relatedEntityId,
          relatedEntityType,
          isRead: false
        });
      }
    }

    for (let i = 0; i < notificationsToCreate.length; i += 1000) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notificationsToCreate.slice(i, i + 1000));
    }

    return Response.json({ success: true, notified: notificationsToCreate.length });
  } catch (error) {
    const status = error.message === 'Forbidden' ? 403 : 400;
    return Response.json({ error: error.message }, { status });
  }
});