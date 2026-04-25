import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function computeExpiresAt(broadcast) {
  const now = Date.now();
  if (broadcast.type === 'solo_ride') return new Date(now + 90 * 60 * 1000).toISOString();
  if (broadcast.type === 'alert') return new Date(now + 240 * 60 * 1000).toISOString();
  if (broadcast.type === 'iso') return new Date(now + (broadcast.isoSubtype === 'mechanic' ? 720 : 1440) * 60 * 1000).toISOString();
  if (broadcast.type === 'event' && broadcast.eventEndTime) return new Date(new Date(broadcast.eventEndTime).getTime() + 6 * 60 * 60 * 1000).toISOString();
  return new Date(now + 24 * 60 * 60 * 1000).toISOString();
}

function fuzzLocation(lat, lng) {
  const fuzz = 0.015;
  return {
    lat: lat + (Math.random() - 0.5) * fuzz * 2,
    lng: lng + (Math.random() - 0.5) * fuzz * 2
  };
}

async function getMyProfile(base44, user) {
  const profiles = user.email ? await base44.asServiceRole.entities.UserProfile.filter({ email: user.email }) : [];
  const legacy = await base44.asServiceRole.entities.UserProfile.filter({ userId: user.id });
  return [...profiles, ...legacy].find((profile, index, list) => profile?.id && list.findIndex((item) => item.id === profile.id) === index && profile.isDeleted !== true) || null;
}

function validateMediaUrl(url) {
  if (!url) return false;
  return typeof url === 'string' && /^https:\/\//.test(url) && url.length < 2000;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const profile = await getMyProfile(base44, user);
    if (!profile) return Response.json({ error: 'Profile required' }, { status: 403 });

    const payload = await req.json();
    const type = payload.type;
    if (!['solo_ride', 'event', 'iso', 'alert'].includes(type)) throw new Error('Invalid broadcast type');

    const title = type === 'iso' && payload.isoSubtype === 'bike_crew'
      ? (payload.lookingTo === 'start_crew' ? 'Start a bike crew' : 'Join a bike crew')
      : String(payload.title || '').trim();

    if (title.length < 3 || title.length > 120) throw new Error('Title is required');

    const broadcast = {
      authorId: profile.id,
      authorUserId: user.id,
      authorEmail: user.email || '',
      type,
      title,
      body: String(payload.body || '').slice(0, 500),
      status: 'active',
      mediaUrls: []
    };

    if (type === 'solo_ride' || type === 'iso') {
      const settings = await base44.asServiceRole.entities.UserSettings.filter({ userId: user.id }).then((list) => list[0]);
      if (settings?.showLocation !== false && typeof payload.lat === 'number' && typeof payload.lng === 'number') {
        const fuzzed = fuzzLocation(payload.lat, payload.lng);
        broadcast.frozenLat = fuzzed.lat;
        broadcast.frozenLng = fuzzed.lng;
      }
    }

    if (type === 'iso') {
      if (!['mechanic', 'bike_crew'].includes(payload.isoSubtype)) throw new Error('ISO subtype is required');
      broadcast.isoSubtype = payload.isoSubtype;
    }

    if (type === 'event') {
      if (!payload.exactLocationText) throw new Error('Event location is required');
      if (!payload.eventDate || !payload.eventEndTime) throw new Error('Event start and end are required');
      const eventDate = new Date(payload.eventDate);
      const eventEndTime = new Date(payload.eventEndTime);
      if (!(eventEndTime > eventDate)) throw new Error('Event end must be after start');
      broadcast.exactLocationText = String(payload.exactLocationText).slice(0, 200);
      broadcast.eventDate = eventDate.toISOString();
      broadcast.eventEndTime = eventEndTime.toISOString();
      if (validateMediaUrl(payload.eventImage)) {
        broadcast.eventImage = payload.eventImage;
        broadcast.mediaUrls.push(payload.eventImage);
      }
    }

    if (type === 'alert') {
      if (!payload.exactLocationText) throw new Error('Approximate alert area is required');
      broadcast.exactLocationText = String(payload.exactLocationText).slice(0, 200);
      const images = Array.isArray(payload.alertImages) ? payload.alertImages.filter(validateMediaUrl).slice(0, 2) : [];
      if (images.length) {
        broadcast.alertImages = images;
        broadcast.mediaUrls = images;
      }
    }

    broadcast.expiresAt = computeExpiresAt(broadcast);
    const created = await base44.asServiceRole.entities.Broadcast.create(broadcast);
    return Response.json({ broadcast: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
});