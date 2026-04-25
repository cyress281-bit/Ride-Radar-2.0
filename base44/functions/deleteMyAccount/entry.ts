import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function deleteRows(rows, entityClient) {
  for (const row of rows) await entityClient.delete(row.id);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const existingCompleted = await base44.asServiceRole.entities.AccountDeletionRequest.filter({ userId: user.id, status: 'completed' });
    if (existingCompleted.length > 0) {
      return Response.json({ message: 'Your Ride Radar app data was already deleted. Please log out.' });
    }

    const profilesByEmail = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
    const profilesByUser = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
    const profiles = [...profilesByEmail, ...profilesByUser].filter((profile, index, list) => profile?.id && list.findIndex((item) => item.id === profile.id) === index);
    const profileIds = profiles.map((profile) => profile.id);

    const request = await base44.asServiceRole.entities.AccountDeletionRequest.create({
      userId: user.id,
      profileId: profileIds[0] || '',
      email: user.email || '',
      status: 'requested',
      note: 'User initiated in-app account deletion.'
    });

    for (const profile of profiles) {
      const profileId = profile.id;

      const broadcasts = await base44.asServiceRole.entities.Broadcast.filter({ authorId: profileId });
      for (const broadcast of broadcasts) {
        const rsvps = await base44.asServiceRole.entities.EventRSVP.filter({ broadcastId: broadcast.id });
        await deleteRows(rsvps, base44.asServiceRole.entities.EventRSVP);
        const requests = await base44.asServiceRole.entities.ConnectionRequest.filter({ broadcastId: broadcast.id });
        await deleteRows(requests, base44.asServiceRole.entities.ConnectionRequest);
        await base44.asServiceRole.entities.Broadcast.update(broadcast.id, { status: 'removed', title: 'Deleted broadcast', body: '', exactLocationText: '', frozenLat: null, frozenLng: null, eventImage: '', alertImages: [], mediaUrls: [] });
      }

      const outboundRequests = await base44.asServiceRole.entities.ConnectionRequest.filter({ fromUserId: profileId });
      const inboundRequests = await base44.asServiceRole.entities.ConnectionRequest.filter({ toUserId: profileId });
      await deleteRows(outboundRequests, base44.asServiceRole.entities.ConnectionRequest);
      await deleteRows(inboundRequests, base44.asServiceRole.entities.ConnectionRequest);

      const outgoingFriendships = await base44.asServiceRole.entities.Friendship.filter({ userAId: profileId });
      const incomingFriendships = await base44.asServiceRole.entities.Friendship.filter({ userBId: profileId });
      await deleteRows(outgoingFriendships, base44.asServiceRole.entities.Friendship);
      await deleteRows(incomingFriendships, base44.asServiceRole.entities.Friendship);

      const rsvps = await base44.asServiceRole.entities.EventRSVP.filter({ userId: profileId });
      await deleteRows(rsvps, base44.asServiceRole.entities.EventRSVP);

      const notifications = await base44.asServiceRole.entities.Notification.filter({ userId: profileId });
      await deleteRows(notifications, base44.asServiceRole.entities.Notification);

      const settings = await base44.asServiceRole.entities.UserSettings.filter({ userId: user.id });
      await deleteRows(settings, base44.asServiceRole.entities.UserSettings);

      const reportsByUser = await base44.asServiceRole.entities.Report.filter({ reporterProfileId: profileId });
      for (const report of reportsByUser) {
        await base44.asServiceRole.entities.Report.update(report.id, { reporterProfileId: '', reporterAuthUserId: '', details: `${report.details || ''}\nReporter account deleted.`.trim() });
      }
      const reportsAboutUser = await base44.asServiceRole.entities.Report.filter({ targetProfileId: profileId });
      for (const report of reportsAboutUser) {
        await base44.asServiceRole.entities.Report.update(report.id, { targetProfileId: '', details: `${report.details || ''}\nTarget account deleted.`.trim() });
      }

      const blocksByUser = await base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: profileId });
      const blocksAgainstUser = await base44.asServiceRole.entities.UserBlock.filter({ blockedProfileId: profileId });
      await deleteRows(blocksByUser, base44.asServiceRole.entities.UserBlock);
      await deleteRows(blocksAgainstUser, base44.asServiceRole.entities.UserBlock);

      const conversations = await base44.asServiceRole.entities.Conversation.list('-updated_date', 5000);
      for (const conversation of conversations.filter((item) => Array.isArray(item.participantIds) && item.participantIds.includes(profileId))) {
        const myMessages = await base44.asServiceRole.entities.Message.filter({ conversationId: conversation.id, fromUserId: profileId });
        for (const message of myMessages) {
          await base44.asServiceRole.entities.Message.update(message.id, { body: '[deleted message]', fromUserId: profileId, fromAuthUserId: user.id });
        }
        await base44.asServiceRole.entities.Conversation.update(conversation.id, { status: 'archived' });
      }

      await base44.asServiceRole.entities.UserProfile.update(profileId, {
        displayName: 'Deleted Rider',
        username: `deleted_${profileId}`,
        avatar: '',
        bio: '',
        location: '',
        bike: 'Deleted account',
        bikePhoto: '',
        isPublic: false,
        isDeleted: true,
        deletedAt: new Date().toISOString(),
        email: '',
        fullName: ''
      });
    }

    await base44.asServiceRole.entities.AccountDeletionRequest.update(request.id, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      note: 'App data anonymized/deleted. Auth session should be logged out by client.'
    });

    return Response.json({ message: 'Your Ride Radar app data has been deleted/anonymized. Please log out to finish.', shouldLogout: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});