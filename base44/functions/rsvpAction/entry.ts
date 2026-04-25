import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function getMyProfile(base44, user) {
  const email = String(user.email || '').trim().toLowerCase();
  const identitiesByUser = await base44.asServiceRole.entities.UserPrivateIdentity.filter({ userId: user.id });
  const identitiesByEmail = email ? await base44.asServiceRole.entities.UserPrivateIdentity.filter({ email }) : [];
  const identities = [...identitiesByUser, ...identitiesByEmail].filter((identity, index, list) => identity?.id && list.findIndex((item) => item.id === identity.id) === index && identity.isDeleted !== true);

  for (const identity of identities) {
    try {
      const profile = await base44.asServiceRole.entities.UserProfile.get(identity.profileId);
      if (profile && profile.isDeleted !== true) return profile;
    } catch (_error) {}
  }

  const legacy = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
  return legacy.find((profile) => profile.isDeleted !== true) || null;
}

async function hasBlockBetween(base44, a, b) {
  const [aBlocksB, bBlocksA] = await Promise.all([
    base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: a, blockedProfileId: b }),
    base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: b, blockedProfileId: a })
  ]);
  return aBlocksB.length > 0 || bBlocksA.length > 0;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await getMyProfile(base44, user);
    if (!me) return Response.json({ error: 'Profile required' }, { status: 403 });

    const payload = await req.json();
    const broadcast = await base44.asServiceRole.entities.Broadcast.get(payload.broadcastId);
    if (!broadcast || broadcast.type !== 'event' || broadcast.status !== 'active') throw new Error('Event unavailable');
    if (broadcast.authorId === me.id) throw new Error('Cannot RSVP to your own event');
    if (await hasBlockBetween(base44, me.id, broadcast.authorId)) throw new Error('Interaction unavailable');

    const existing = await base44.asServiceRole.entities.EventRSVP.filter({ broadcastId: broadcast.id, userId: me.id });
    const current = existing[0];
    const status = payload.status;
    if (!['interested', 'going'].includes(status)) throw new Error('Invalid RSVP status');

    let rsvp = null;
    if (current) {
      if (current.status === status) {
        await base44.asServiceRole.entities.EventRSVP.delete(current.id);
      } else {
        rsvp = await base44.asServiceRole.entities.EventRSVP.update(current.id, { status });
      }
    } else {
      rsvp = await base44.asServiceRole.entities.EventRSVP.create({
        broadcastId: broadcast.id,
        userId: me.id,
        userAuthId: user.id,
        status
      });
    }

    if (rsvp) {
      const author = await base44.asServiceRole.entities.UserProfile.get(broadcast.authorId);
      if (author?.userId) {
        const settings = await base44.asServiceRole.entities.UserSettings.filter({ userId: author.userId }).then((list) => list[0]);
        if (settings?.notifyOnRSVP !== false) {
          await base44.asServiceRole.entities.Notification.create({
            userId: author.id,
            userAuthId: author.userId,
            type: 'rsvp',
            title: current ? 'RSVP Updated' : 'New RSVP',
            body: `@${me.username} is ${status === 'going' ? 'going to' : 'interested in'} your event.`,
            relatedEntityId: broadcast.id,
            relatedEntityType: 'Broadcast',
            isRead: false
          });
        }
      }
    }

    return Response.json({ rsvp });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});