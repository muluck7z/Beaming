const { getUser, supabase, locationFromRequest, ipFromRequest } = require('../_admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = getUser(req);
  if (!user || !user.userId) return res.status(401).json({ error: 'Unauthorized' });
  const location = locationFromRequest(req);
  const username = String(user.username || 'desconhecido').slice(0, 120);
  try {
    const existing = await supabase(`members?user_id=eq.${encodeURIComponent(String(user.userId))}&select=user_id,status,total_seconds`, { method: 'GET' });
    const row = existing?.[0];
    if (row?.status === 'banned') return res.status(403).json({ error: 'banned' });
    const now = new Date().toISOString();
    const member = { user_id: String(user.userId), username, avatar: user.avatar || null, ip_address: ipFromRequest(req), ...location, last_seen_at: now, updated_at: now };
    await supabase('members?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(member) });
    if (!row) {
      await supabase('member_sessions', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: String(user.userId), started_at: now, last_seen_at: now }) });
    } else {
      await supabase(`member_sessions?user_id=eq.${encodeURIComponent(String(user.userId))}&ended_at=is.null`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ last_seen_at: now, duration_seconds: 60 }) });
      await supabase(`members?user_id=eq.${encodeURIComponent(String(user.userId))}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ total_seconds: Number(row.total_seconds || 0) + 60 }) });
    }
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ ok: true, status: row?.status || 'active' });
  } catch (error) {
    console.error('heartbeat error:', error.message);
    return res.status(500).json({ error: 'Database unavailable' });
  }
};
