import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isValidImageUrl(url) {
  return typeof url === 'string' && /^https:\/\//.test(url) && url.length < 2000;
}

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

async function findExistingProfile(base44, user) {
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
  if (legacy) {
    await ensurePrivateIdentity(base44, user, legacy);
    return legacy;
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = cleanEmail(user);
    const deletionByUser = await base44.asServiceRole.entities.AccountDeletionRequest.filter({ userId: user.id, status: 'completed' });
    const deletionByEmail = email ? await base44.asServiceRole.entities.AccountDeletionRequest.filter({ email, status: 'completed' }) : [];
    if (deletionByUser.length > 0 || deletionByEmail.length > 0) {
      return Response.json({ error: 'This account has been deleted and cannot recreate a profile automatically.' }, { status: 403 });
    }

    const existing = await findExistingProfile(base44, user);
    if (existing) return Response.json({ profile: existing, existing: true });

    const payload = await req.json();
    if (!isValidImageUrl(payload.avatar)) throw new Error('Profile picture is required');
    const bike = String(payload.bike || '').trim().slice(0, 120);
    if (!bike) throw new Error('Bike is required');

    const baseName = user.full_name ? user.full_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'rider';
    const username = `${baseName}${Math.floor(Math.random() * 10000)}`;
    const rideStyle = String(payload.rideStyle || '').trim();

    const profilePayload = {
      userId: user.id,
      username,
      displayName: String(payload.displayName || user.full_name || username).trim().slice(0, 80),
      avatar: payload.avatar,
      bio: String(payload.bio || '').slice(0, 200),
      location: String(payload.location || '').slice(0, 120),
      bike,
      bikePhoto: isValidImageUrl(payload.bikePhoto) ? payload.bikePhoto : '',
      isPublic: true,
      isDeleted: false
    };
    if (rideStyle) profilePayload.rideStyle = rideStyle;

    const profile = await base44.entities.UserProfile.create(profilePayload);
    await ensurePrivateIdentity(base44, user, profile);

    return Response.json({ profile, existing: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});