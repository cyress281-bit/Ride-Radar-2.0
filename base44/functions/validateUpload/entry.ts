import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const maxBytesByKind = {
  avatar: 4 * 1024 * 1024,
  bike: 8 * 1024 * 1024,
  event: 10 * 1024 * 1024,
  alert: 8 * 1024 * 1024
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const kind = payload.kind || 'event';
    const contentType = String(payload.contentType || '');
    const size = Number(payload.size || 0);
    const maxBytes = maxBytesByKind[kind] || maxBytesByKind.event;

    if (!contentType.startsWith('image/')) throw new Error('Only image uploads are allowed');
    if (size <= 0 || size > maxBytes) throw new Error(`Image must be smaller than ${Math.floor(maxBytes / 1024 / 1024)}MB`);

    return Response.json({ allowed: true, maxBytes });
  } catch (error) {
    return Response.json({ allowed: false, error: error.message }, { status: 400 });
  }
});