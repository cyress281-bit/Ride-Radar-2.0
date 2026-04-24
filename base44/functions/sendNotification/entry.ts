import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { targetProfileId, sendToAll, type, title, body, relatedEntityId, relatedEntityType } = payload;

    let targetProfiles = [];
    if (sendToAll) {
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      targetProfiles = await base44.asServiceRole.entities.UserProfile.list('-created_date', 5000);
    } else if (targetProfileId) {
      const profile = await base44.asServiceRole.entities.UserProfile.get(targetProfileId);
      if (profile) targetProfiles = [profile];
    }

    if (!targetProfiles.length) return Response.json({ success: false, reason: 'no profiles' });

    let settingsList = [];
    if (sendToAll) {
      settingsList = await base44.asServiceRole.entities.UserSettings.list('-created_date', 5000);
    } else {
      const userIds = targetProfiles.map(p => p.userId).filter(Boolean);
      settingsList = await Promise.all(userIds.map(id => base44.asServiceRole.entities.UserSettings.filter({ userId: id }).then(l => l[0])));
    }

    const settingsMap = {};
    settingsList.forEach(s => { if (s) settingsMap[s.userId] = s; });

    let notificationsToCreate = [];

    for (const profile of targetProfiles) {
      const userSettings = settingsMap[profile.userId] || {};
      let shouldNotify = true;
      
      if (type.includes('connection') && userSettings.notifyOnConnection === false) shouldNotify = false;
      if (type.includes('friend') && userSettings.notifyOnConnection === false) shouldNotify = false;
      if (type === 'new_message' && userSettings.notifyOnMessage === false) shouldNotify = false;
      if ((type.includes('rsvp') || type === 'event_reminder') && userSettings.notifyOnRSVP === false) shouldNotify = false;
      if (type === 'alert' && userSettings.notifyOnAlert === false) shouldNotify = false;

      if (shouldNotify) {
        notificationsToCreate.push({
          userId: profile.id,
          type,
          title,
          body,
          relatedEntityId,
          relatedEntityType
        });
      }
    }

    if (notificationsToCreate.length > 0) {
      const chunkSize = 1000;
      for (let i = 0; i < notificationsToCreate.length; i += chunkSize) {
        await base44.asServiceRole.entities.Notification.bulkCreate(notificationsToCreate.slice(i, i + chunkSize));
      }
    }

    return Response.json({ success: true, notified: notificationsToCreate.length });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});