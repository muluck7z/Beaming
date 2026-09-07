const { supabase } = require('./_admin');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const now = encodeURIComponent(new Date().toISOString());
    const rows = await supabase(`announcements?is_active=eq.true&or=(expires_at.is.null,expires_at.gt.${now})&select=id,title,message,author_avatar_url,author_name,created_at&order=created_at.desc&limit=10`);
    res.setHeader('Cache-Control', 'no-store');
    return res.json({ announcements: rows || [] });
  } catch (error) {
    console.error('announcements error:', error.message);
    return res.status(500).json({ announcements: [] });
  }
};
