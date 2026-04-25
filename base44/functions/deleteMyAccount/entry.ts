import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profilesByEmail = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
    const profilesByUser = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
    const profiles = [...profilesByEmail, ...profilesByUser].filter((p, i, arr) => p?.id && arr.findIndex((x) => x.id === p.id) === i);
    const profileIds = profiles.map((p) => p.id);

    const request = await base44.asServiceRole.entities.AccountDeletionRequest.create({
      userId: user.id,
      profileId: profileIds[0] || '',
      email: user.email || '',
      status: 'requested',
      note: 'User initiated in-app account deletion.'
    });

    for (const profileId of profileIds) {
      const collections = [
        ['Broadcast', 'authorId'],
        ['UserSettings', 'userId'],
        ['EventRSVP', 'userId'],
        ['ConnectionRequest', 'fromUserId'],
        ['ConnectionRequest', 'toUserId'],
        ['Friendship', 'userAId'],
        ['Friendship', 'userBId'],
        ['Message', 'fromUserId'],
        ['Notification', 'userId'],
        ['Report', 'reporterProfileId'],
        ['Report', 'targetProfileId'],
        ['UserBlock', 'blockerProfileId'],
        ['UserBlock', 'blockedProfileId'],
      ];

      for (const [entity, field] of collections) {
        const rows = await base44.asServiceRole.entities[entity].filter({ [field]: profileId });
        for (const row of rows) await base44.asServiceRole.entities[entity].delete(row.id);
      }

      const conversations = await base44.asServiceRole.entities.Conversation.list();
      for (const convo of conversations.filter((c) => Array.isArray(c.participantIds) && c.participantIds.includes(profileId))) {
        const messages = await base44.asServiceRole.entities.Message.filter({ conversationId: convo.id });
        for (const message of messages) await base44.asServiceRole.entities.Message.delete(message.id);
        await base44.asServiceRole.entities.Conversation.delete(convo.id);
      }

      await base44.asServiceRole.entities.UserProfile.delete(profileId);
    }

    await base44.asServiceRole.entities.AccountDeletionRequest.update(request.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      note: 'App data deletion completed. Authentication provider account/session may require platform-level removal if applicable.'
    });

    return Response.json({ message: 'Your Ride Radar app account data has been deleted. Some legally required security or moderation records may be retained if applicable. You can now log out.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});