import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isValidImageUrl(url) {
  return typeof url === 'string' && /^https:\/\//.test(url) && url.length < 2000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const deletionRequests = await base44.asServiceRole.entities.AccountDeletionRequest.filter({ userId: user.id, status: 'completed' });
    if (deletionRequests.length > 0) return Response.json({ error: 'This account has been deleted and cannot recreate a profile automatically.' }, { status: 403 });

    const existingByEmail = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
    const existingByUser = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
    const existing = [...existingByEmail, ...existingByUser].find((profile) => profile?.isDeleted !== true);
    if (existing) return Response.json({ profile: existing, existing: true });

    const payload = await req.json();
    if (!isValidImageUrl(payload.avatar)) throw new Error('Profile picture is required');
    const bike = String(payload.bike || '').trim().slice(0, 120);
    if (!bike) throw new Error('Bike is required');

    const baseName = user.full_name ? user.full_name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() : 'rider';
    const username = `${baseName}${Math.floor(Math.random() * 10000)}`;

    const profile = await base44.asServiceRole.entities.UserProfile.create({
      userId: user.id,
      email: user.email || '',
      fullName: user.full_name || '',
      username,
      displayName: String(payload.displayName || user.full_name || username).trim().slice(0, 80),
      avatar: payload.avatar,
      bio: String(payload.bio || '').slice(0, 200),
      location: String(payload.location || '').slice(0, 120),
      rideStyle: payload.rideStyle || 'street',
      bike,
      bikePhoto: isValidImageUrl(payload.bikePhoto) ? payload.bikePhoto : '',
      isPublic: true,
      isDeleted: false
    });

    return Response.json({ profile, existing: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});