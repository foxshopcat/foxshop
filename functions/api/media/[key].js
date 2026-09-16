export async function onRequestGet(context) {
  const key = String(context.params.key || '').trim();
  if (!/^[a-zA-Z0-9_-]{20,80}$/.test(key)) return new Response('Not found', { status: 404 });
  const row = await context.env.DB.prepare('SELECT mime_type, size_bytes, data FROM media_assets WHERE id = ? LIMIT 1').bind(key).first();
  if (!row) return new Response('Not found', { status: 404 });
  const headers = new Headers();
  headers.set('content-type', row.mime_type || 'image/webp');
  headers.set('content-length', String(row.size_bytes || 0));
  headers.set('cache-control', 'public, max-age=86400');
  return new Response(row.data, { headers });
}
