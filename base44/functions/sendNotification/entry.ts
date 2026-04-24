import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { targetProfileId, type, title, body, relatedEntityId, relatedEntityType } = payload;

    const targetProfile = await base44.asServiceRole.entities.UserProfile.get(targetProfileId);
    if (!targetProfile || !targetProfile.userId) return Response.json({ success: false, reason: 'no profile' });

    const settingsList = await base44.asServiceRole.entities.UserSettings.filter({ userId: targetProfile.userId });
    const userSettings = settingsList[0] || {};

    let shouldNotify = true;
    if (type.includes('connection') && userSettings.notifyOnConnection === false) shouldNotify = false;
    if (type.includes('friend') && userSettings.notifyOnConnection === false) shouldNotify = false;
    if (type === 'new_message' && userSettings.notifyOnMessage === false) shouldNotify = false;
    if (type.includes('rsvp') && userSettings.notifyOnRSVP === false) shouldNotify = false;
    if (type === 'alert' && userSettings.notifyOnAlert === false) shouldNotify = false;

    if (shouldNotify) {
      await base44.asServiceRole.entities.Notification.create({
        userId: targetProfileId,
        type,
        title,
        body,
        relatedEntityId,
        relatedEntityType
      });
    }

    return Response.json({ success: true, notified: shouldNotify });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
});