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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const me = await getMyProfile(base44, user);
    if (!me) return Response.json({ error: 'Profile required' }, { status: 403 });

    const payload = await req.json();
    const action = payload.action;

    if (action === 'report') {
      if (!['user', 'broadcast', 'conversation', 'message'].includes(payload.targetType)) throw new Error('Invalid target type');
      if (!payload.targetId) throw new Error('Target is required');
      if (!['safety', 'harassment', 'spam', 'illegal', 'privacy', 'other'].includes(payload.reason)) throw new Error('Invalid reason');
      const report = await base44.asServiceRole.entities.Report.create({
        reporterProfileId: me.id,
        reporterAuthUserId: user.id,
        targetType: payload.targetType,
        targetId: payload.targetId,
        targetProfileId: payload.targetProfileId || '',
        reason: payload.reason,
        details: String(payload.details || '').slice(0, 500),
        status: 'open'
      });
      return Response.json({ report });
    }

    if (action === 'block') {
      if (!payload.blockedProfileId || payload.blockedProfileId === me.id) throw new Error('Invalid blocked profile');
      const blockedProfile = await base44.asServiceRole.entities.UserProfile.get(payload.blockedProfileId);
      if (!blockedProfile || blockedProfile.isDeleted === true) throw new Error('Profile not found');
      const existing = await base44.asServiceRole.entities.UserBlock.filter({ blockerProfileId: me.id, blockedProfileId: blockedProfile.id });
      if (existing[0]) return Response.json({ block: existing[0] });
      const block = await base44.asServiceRole.entities.UserBlock.create({
        blockerProfileId: me.id,
        blockerAuthUserId: user.id,
        blockedProfileId: blockedProfile.id,
        blockedAuthUserId: blockedProfile.userId || '',
        reason: String(payload.reason || '').slice(0, 500)
      });
      return Response.json({ block });
    }

    throw new Error('Unknown action');
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});