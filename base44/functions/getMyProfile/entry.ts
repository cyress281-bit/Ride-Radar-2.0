import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function cleanEmail(user) {
  return String(user.email || '').trim().toLowerCase();
}

async function safeGetProfile(base44, profileId) {
  if (!profileId) return null;
  try {
    const profile = await base44.asServiceRole.entities.UserProfile.get(profileId);
    if (!profile || profile.isDeleted === true) return null;
    return profile;
  } catch (_error) {
    return null;
  }
}

async function ensurePrivateIdentity(base44, user, profile) {
  const email = cleanEmail(user);
  const payload = {
    userId: user.id,
    profileId: profile.id,
    email,
    fullName: String(user.full_name || '').trim(),
    isDeleted: false
  };

  try {
    const existingForUser = await base44.asServiceRole.entities.UserPrivateIdentity.filter({ userId: user.id });
    const current = existingForUser.find((identity) => identity.isDeleted !== true);
    if (current) {
      await base44.asServiceRole.entities.UserPrivateIdentity.update(current.id, payload);
    } else {
      await base44.asServiceRole.entities.UserPrivateIdentity.create(payload);
    }
  } catch (error) {
    console.warn('Private identity sync skipped:', error.message);
  }

  if (profile.userId !== user.id) {
    await base44.asServiceRole.entities.UserProfile.update(profile.id, { userId: user.id });
    profile.userId = user.id;
  }
}

async function findProfile(base44, user) {
  const email = cleanEmail(user);
  const identitiesByUser = await base44.asServiceRole.entities.UserPrivateIdentity.filter({ userId: user.id });
  const identitiesByEmail = email ? await base44.asServiceRole.entities.UserPrivateIdentity.filter({ email }) : [];
  const identities = [...identitiesByUser, ...identitiesByEmail].filter((identity, index, list) => identity?.id && list.findIndex((item) => item.id === identity.id) === index && identity.isDeleted !== true);

  for (const identity of identities) {
    const profile = await safeGetProfile(base44, identity.profileId);
    if (profile) {
      await ensurePrivateIdentity(base44, user, profile);
      return profile;
    }
  }

  const legacyProfiles = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
  const legacy = legacyProfiles.find((profile) => profile.isDeleted !== true) || null;
  if (legacy) await ensurePrivateIdentity(base44, user, legacy);
  return legacy;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await findProfile(base44, user);
    return Response.json({ profile });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});