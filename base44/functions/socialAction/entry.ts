import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getMyProfile(base44, user) {
  const byEmail = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
  const byUser = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
  return [...byEmail, ...byUser].find((profile, index, list) => profile?.id && list.findIndex((item) => item.id === profile.id) === index && profile.isDeleted !== true) || null;
}

async function hasBlockBetween(base44, profileAId, profileBId) {
  if (!profileAId || !profileBId) return false;
  const [aBlocksB, bBlocksA] = await Promise.all([
    base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: profileAId, blockedProfileId: profileBId }),
    base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: profileBId, blockedProfileId: profileAId })
  ]);
  return aBlocksB.length > 0 || bBlocksA.length > 0;
}

async function profileById(base44, id) {
  const profile = await base44.asServiceRole.entities.UserProfile.get(id);
  if (!profile || profile.isDeleted === true) throw new Error('Profile not found');
  return profile;
}

async function createNotification(base44, profile, type, title, body, relatedEntityId, relatedEntityType) {
  if (!profile?.id || !profile?.userId) return;
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
}

async function createConversation(base44, type, participantA, participantB, fields = {}) {
  return await base44.asServiceRole.entities.Conversation.create({
    type,
    participantIds: [participantA.id, participantB.id],
    participantAUserId: participantA.userId,
    participantBUserId: participantB.userId,
    status: 'active',
    lastMessageAt: new Date().toISOString(),
    ...fields
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await getMyProfile(base44, user);
    if (!me) return Response.json({ error: 'Profile required' }, { status: 403 });

    const payload = await req.json();
    const action = payload.action;

    if (action === 'sendConnectionRequest') {
      const broadcast = await base44.asServiceRole.entities.Broadcast.get(payload.broadcastId);
      if (!broadcast || broadcast.status !== 'active') throw new Error('Broadcast unavailable');
      if (broadcast.authorId === me.id) throw new Error('Cannot connect to your own broadcast');
      const target = await profileById(base44, broadcast.authorId);
      if (await hasBlockBetween(base44, me.id, target.id)) throw new Error('Interaction unavailable');
      const existing = await base44.asServiceRole.entities.ConnectionRequest.filter({ broadcastId: broadcast.id, fromUserId: me.id });
      if (existing.length) return Response.json({ request: existing[0] });
      const request = await base44.asServiceRole.entities.ConnectionRequest.create({
        broadcastId: broadcast.id,
        fromUserId: me.id,
        fromAuthUserId: user.id,
        toUserId: target.id,
        toAuthUserId: target.userId,
        message: String(payload.message || '').slice(0, 200),
        status: 'pending'
      });
      await createNotification(base44, target, 'connection_request', 'New connection request', `@${me.username} wants to connect on your broadcast`, broadcast.id, 'Broadcast');
      return Response.json({ request });
    }

    if (action === 'respondConnectionRequest') {
      const request = await base44.asServiceRole.entities.ConnectionRequest.get(payload.requestId);
      if (!request || request.toUserId !== me.id) throw new Error('Request unavailable');
      if (!['accepted', 'declined'].includes(payload.status)) throw new Error('Invalid status');
      const from = await profileById(base44, request.fromUserId);
      if (await hasBlockBetween(base44, me.id, from.id)) throw new Error('Interaction unavailable');
      await base44.asServiceRole.entities.ConnectionRequest.update(request.id, { status: payload.status });
      let conversation = null;
      if (payload.status === 'accepted') {
        const existing = await base44.asServiceRole.entities.Conversation.filter({ connectionRequestId: request.id });
        conversation = existing[0] || await createConversation(base44, 'connection', from, me, {
          connectionRequestId: request.id,
          threadExpiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
        });
        await createNotification(base44, from, 'connection_accepted', 'Connection accepted', `@${me.username} accepted your request. Thread active 72h.`, conversation.id, 'Conversation');
      }
      return Response.json({ requestId: request.id, conversationId: conversation?.id || null });
    }

    if (action === 'sendMessage') {
      const conversation = await base44.asServiceRole.entities.Conversation.get(payload.conversationId);
      if (!conversation || conversation.status !== 'active' || !conversation.participantIds?.includes(me.id)) throw new Error('Conversation unavailable');
      const otherId = conversation.participantIds.find((id) => id !== me.id);
      const other = await profileById(base44, otherId);
      if (await hasBlockBetween(base44, me.id, other.id)) throw new Error('Messaging unavailable');
      const body = String(payload.body || '').trim().slice(0, 1000);
      if (!body) throw new Error('Message body is required');
      const message = await base44.asServiceRole.entities.Message.create({
        conversationId: conversation.id,
        fromUserId: me.id,
        fromAuthUserId: user.id,
        participantAUserId: conversation.participantAUserId,
        participantBUserId: conversation.participantBUserId,
        body,
        isRead: false
      });
      const update = { lastMessageAt: new Date().toISOString() };
      if (conversation.type === 'connection') update.threadExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      await base44.asServiceRole.entities.Conversation.update(conversation.id, update);
      await createNotification(base44, other, 'new_message', `New message from @${me.username}`, body, conversation.id, 'Conversation');
      return Response.json({ message });
    }

    if (action === 'sendFriendRequest') {
      const target = await profileById(base44, payload.targetProfileId);
      if (target.id === me.id) throw new Error('Cannot friend yourself');
      if (await hasBlockBetween(base44, me.id, target.id)) throw new Error('Interaction unavailable');
      const [existingA, existingB] = await Promise.all([
        base44.asServiceRole.entities.Friendship.filter({ userAId: me.id, userBId: target.id }),
        base44.asServiceRole.entities.Friendship.filter({ userAId: target.id, userBId: me.id })
      ]);
      if (existingA[0] || existingB[0]) return Response.json({ friendship: existingA[0] || existingB[0] });
      const friendship = await base44.asServiceRole.entities.Friendship.create({
        userAId: me.id,
        userAAuthId: user.id,
        userBId: target.id,
        userBAuthId: target.userId,
        status: 'pending'
      });
      await createNotification(base44, target, 'friend_request', 'New friend request', `@${me.username} wants to connect`, me.id, 'UserProfile');
      return Response.json({ friendship });
    }

    if (action === 'respondFriendRequest') {
      const friendship = await base44.asServiceRole.entities.Friendship.get(payload.friendshipId);
      if (!friendship || friendship.userBId !== me.id) throw new Error('Friend request unavailable');
      const requester = await profileById(base44, friendship.userAId);
      if (await hasBlockBetween(base44, me.id, requester.id)) throw new Error('Interaction unavailable');
      if (payload.status === 'declined') {
        await base44.asServiceRole.entities.Friendship.delete(friendship.id);
        return Response.json({ declined: true });
      }
      if (payload.status !== 'active') throw new Error('Invalid status');
      await base44.asServiceRole.entities.Friendship.update(friendship.id, { status: 'active' });
      const existing = await base44.asServiceRole.entities.Conversation.filter({ type: 'friendship', friendshipId: friendship.id });
      const conversation = existing[0] || await createConversation(base44, 'friendship', requester, me, { friendshipId: friendship.id });
      await createNotification(base44, requester, 'friend_accepted', 'Friend request accepted', `@${me.username} accepted your friend request`, me.id, 'UserProfile');
      return Response.json({ conversationId: conversation.id });
    }

    throw new Error('Unknown action');
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});