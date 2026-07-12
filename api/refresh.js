export const config = { runtime: 'edge' };

const ROBLOX_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.roblox.com/',
  'Origin': 'https://www.roblox.com',
};

function extractToken(raw) {
  const m = raw.match(/_\|WARNING[^|]*\|_(.+)/);
  return m ? m[1].trim() : raw.trim();
}

function buildCookieHeader(token) {
  return `.ROBLOSECURITY=${token}`;
}

function extractRefreshedCookie(setCookieHeader) {
  if (!setCookieHeader) return null;
  const m = setCookieHeader.match(/\.ROBLOSECURITY=([^;]+)/);
  return m ? m[1] : null;
}

async function robloxFetch(url, cookieHeader, csrfToken) {
  const headers = {
    ...ROBLOX_HEADERS,
    'Cookie': cookieHeader,
  };
  if (csrfToken) headers['x-csrf-token'] = csrfToken;

  const res = await fetch(url, { headers });
  return res;
}

async function getCSRF(cookieHeader) {
  // Roblox returns 403 with X-CSRF-Token on the first POST
  const res = await fetch('https://auth.roblox.com/v2/logout', {
    method: 'POST',
    headers: { ...ROBLOX_HEADERS, 'Cookie': cookieHeader, 'Content-Length': '0' },
  });
  return res.headers.get('x-csrf-token') || '';
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { cookie } = body;
  if (!cookie || cookie.trim().length < 20) {
    return new Response(JSON.stringify({ error: 'Cookie inválido ou muito curto.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const token = extractToken(cookie);
  const cookieHeader = buildCookieHeader(token);

  try {
    // 1. Authenticated user (validates cookie + may rotate it)
    const authRes = await robloxFetch('https://users.roblox.com/v1/users/authenticated', cookieHeader);

    if (!authRes.ok) {
      const status = authRes.status;
      const msg = status === 401 || status === 403
        ? 'Cookie inválido ou expirado.'
        : `Erro ao validar cookie (${status}).`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const authData = await authRes.json();
    const userId = authData.id;
    const username = authData.name || authData.displayName || 'Desconhecido';
    const displayName = authData.displayName || username;

    // Capture any rotated cookie from this response
    const rotatedRaw = authRes.headers.get('set-cookie');
    const rotatedToken = extractRefreshedCookie(rotatedRaw);

    // 2. Fetch everything in parallel
    const [econRes, userRes, friendsRes, avatarRes, premiumRes] = await Promise.allSettled([
      robloxFetch('https://economy.roblox.com/v1/user/currency', cookieHeader),
      robloxFetch(`https://users.roblox.com/v1/users/${userId}`, cookieHeader),
      robloxFetch(`https://friends.roblox.com/v1/users/${userId}/friends/count`, cookieHeader),
      fetch(`https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`, { headers: ROBLOX_HEADERS }),
      robloxFetch(`https://premiumfeatures.roblox.com/v1/users/${userId}/validate-membership`, cookieHeader),
    ]);

    // Parse results safely
    let robux = null;
    if (econRes.status === 'fulfilled' && econRes.value.ok) {
      try { const d = await econRes.value.json(); robux = d.robux ?? null; } catch {}
    }

    let created = null, description = null;
    if (userRes.status === 'fulfilled' && userRes.value.ok) {
      try { const d = await userRes.value.json(); created = d.created || null; description = d.description || null; } catch {}
    }

    let friendCount = null;
    if (friendsRes.status === 'fulfilled' && friendsRes.value.ok) {
      try { const d = await friendsRes.value.json(); friendCount = d.count ?? null; } catch {}
    }

    let avatarUrl = null;
    if (avatarRes.status === 'fulfilled' && avatarRes.value.ok) {
      try { const d = await avatarRes.value.json(); avatarUrl = d?.data?.[0]?.imageUrl || null; } catch {}
    }

    let isPremium = false;
    if (premiumRes.status === 'fulfilled' && premiumRes.value.ok) {
      try {
        const d = await premiumRes.value.json();
        isPremium = d === true || d?.isPremium === true || d?.hasPremium === true;
      } catch {}
    }

    // Build the refreshed cookie string
    const finalToken = rotatedToken || token;
    const refreshedCookie = `_|WARNING:-DO-NOT-SHARE-THIS.--Sharing-this-will-allow-someone-to-log-in-as-you-and-to-steal-your-ROBUX-and-items.|_${finalToken}`;

    return new Response(JSON.stringify({
      ok: true,
      userId,
      username,
      displayName,
      robux,
      friendCount,
      created,
      description,
      avatarUrl,
      isPremium,
      wasRefreshed: !!rotatedToken,
      refreshedCookie,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
