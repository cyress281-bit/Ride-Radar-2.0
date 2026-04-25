import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function profileByIdMap(profiles) {
  return new Map(profiles.map((profile) => [profile.id, profile]));
}

async function updateIfChanged(entityClient, row, patch) {
  const cleanPatch = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined && row[key] !== value) cleanPatch[key] = value;
  }
  if (Object.keys(cleanPatch).length > 0) {
    await entityClient.update(row.id, cleanPatch);
    return 1;
  }
  return 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

    const profiles = await base44.asServiceRole.entities.UserProfile.list('-updated_date', 5000);
    const profilesById = profileByIdMap(profiles);
    const stats = {
      broadcasts: 0,
      conversations: 0,
      messages: 0,
      connectionRequests: 0,
      friendships: 0,
      notifications: 0,
      eventRsvps: 0,
      reports: 0,
      blocks: 0,
      privateIdentities: 0
    };

    for (const profile of profiles) {
      if (!profile.userId) continue;
      const existingIdentity = await base44.asServiceRole.entities.UserPrivateIdentity.filter({ userId: profile.userId });
      if (!existingIdentity.length) {
        await base44.asServiceRole.entities.UserPrivateIdentity.create({
          userId: profile.userId,
          profileId: profile.id,
          email: String(profile.email || '').trim().toLowerCase(),
          fullName: String(profile.fullName || '').trim(),
          isDeleted: profile.isDeleted === true
        });
        stats.privateIdentities += 1;
      }
    }

    const broadcasts = await base44.asServiceRole.entities.Broadcast.list('-created_date', 5000);
    for (const broadcast of broadcasts) {
      const author = profilesById.get(broadcast.authorId);
      stats.broadcasts += await updateIfChanged(base44.asServiceRole.entities.Broadcast, broadcast, {
        authorUserId: broadcast.authorUserId || author?.userId || '',
        mediaUrls: broadcast.mediaUrls || [broadcast.eventImage, ...(broadcast.alertImages || [])].filter(Boolean)
      });
    }

    const conversations = await base44.asServiceRole.entities.Conversation.list('-updated_date', 5000);
    for (const conversation of conversations) {
      const participantA = profilesById.get(conversation.participantIds?.[0]);
      const participantB = profilesById.get(conversation.participantIds?.[1]);
      stats.conversations += await updateIfChanged(base44.asServiceRole.entities.Conversation, conversation, {
        participantAUserId: conversation.participantAUserId || participantA?.userId || '',
        participantBUserId: conversation.participantBUserId || participantB?.userId || ''
      });
    }

    const messages = await base44.asServiceRole.entities.Message.list('-created_date', 5000);
    const conversationMap = new Map(conversations.map((conversation) => [conversation.id, conversation]));
    for (const message of messages) {
      const sender = profilesById.get(message.fromUserId);
      const conversation = conversationMap.get(message.conversationId);
      const participantA = profilesById.get(conversation?.participantIds?.[0]);
      const participantB = profilesById.get(conversation?.participantIds?.[1]);
      stats.messages += await updateIfChanged(base44.asServiceRole.entities.Message, message, {
        fromAuthUserId: message.fromAuthUserId || sender?.userId || '',
        participantAUserId: message.participantAUserId || conversation?.participantAUserId || participantA?.userId || '',
        participantBUserId: message.participantBUserId || conversation?.participantBUserId || participantB?.userId || ''
      });
    }

    const connectionRequests = await base44.asServiceRole.entities.ConnectionRequest.list('-created_date', 5000);
    for (const request of connectionRequests) {
      const from = profilesById.get(request.fromUserId);
      const to = profilesById.get(request.toUserId);
      stats.connectionRequests += await updateIfChanged(base44.asServiceRole.entities.ConnectionRequest, request, {
        fromAuthUserId: request.fromAuthUserId || from?.userId || '',
        toAuthUserId: request.toAuthUserId || to?.userId || ''
      });
    }

    const friendships = await base44.asServiceRole.entities.Friendship.list('-created_date', 5000);
    for (const friendship of friendships) {
      const userA = profilesById.get(friendship.userAId);
      const userB = profilesById.get(friendship.userBId);
      stats.friendships += await updateIfChanged(base44.asServiceRole.entities.Friendship, friendship, {
        userAAuthId: friendship.userAAuthId || userA?.userId || '',
        userBAuthId: friendship.userBAuthId || userB?.userId || ''
      });
    }

    const notifications = await base44.asServiceRole.entities.Notification.list('-created_date', 5000);
    for (const notification of notifications) {
      const profile = profilesById.get(notification.userId);
      stats.notifications += await updateIfChanged(base44.asServiceRole.entities.Notification, notification, {
        userAuthId: notification.userAuthId || profile?.userId || ''
      });
    }

    const rsvps = await base44.asServiceRole.entities.EventRSVP.list('-created_date', 5000);
    for (const rsvp of rsvps) {
      const profile = profilesById.get(rsvp.userId);
      stats.eventRsvps += await updateIfChanged(base44.asServiceRole.entities.EventRSVP, rsvp, {
        userAuthId: rsvp.userAuthId || profile?.userId || ''
      });
    }

    const reports = await base44.asServiceRole.entities.Report.list('-created_date', 5000);
    for (const report of reports) {
      const reporter = profilesById.get(report.reporterProfileId);
      stats.reports += await updateIfChanged(base44.asServiceRole.entities.Report, report, {
        reporterAuthUserId: report.reporterAuthUserId || reporter?.userId || ''
      });
    }

    const blocks = await base44.asServiceRole.entities.UserBlock.list('-created_date', 5000);
    for (const block of blocks) {
      const blocker = profilesById.get(block.blockerProfileId);
      const blocked = profilesById.get(block.blockedProfileId);
      stats.blocks += await updateIfChanged(base44.asServiceRole.entities.UserBlock, block, {
        blockerAuthUserId: block.blockerAuthUserId || blocker?.userId || '',
        blockedAuthUserId: block.blockedAuthUserId || blocked?.userId || ''
      });
    }

    return Response.json({ success: true, stats });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});