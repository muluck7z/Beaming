const { makeJwt } = require("../_jwt");

module.exports = async function handler(req, res) {
  const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const GUILD_ID      = process.env.DISCORD_GUILD_ID;
  const ROLE_ID       = process.env.DISCORD_ROLE_ID;
  const SECRET        = process.env.SESSION_SECRET || "fallback";

  const code = req.query.code;
  if (!code) { res.redirect("/?error=missing_code"); return; }

  try {
    const host      = req.headers["x-forwarded-host"] || req.headers.host;
    const proto     = req.headers["x-forwarded-proto"] || "https";
    const redirectUri = `${proto}://${host}/api/auth/callback`;

    // 1. Trocar código por access_token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
        redirect_uri:  redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", tokenRes.status, await tokenRes.text());
      res.redirect("/?error=auth_failed");
      return;
    }

    const { access_token } = await tokenRes.json();

    // 2. Buscar dados do usuário
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!userRes.ok) { res.redirect("/?error=auth_failed"); return; }
    const user = await userRes.json();

    // 3. Verificar cargo no servidor
    let hasAccess = false;
    const memberRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    if (memberRes.ok) {
      const member = await memberRes.json();
      hasAccess = Array.isArray(member.roles) && member.roles.includes(ROLE_ID);
    }

    // 4. Gerar JWT e setar cookie
    const jwt = makeJwt(
      {
        userId:   user.id,
        username: user.global_name || user.username,
        avatar:   user.avatar || null,
        hasAccess,
      },
      SECRET
    );

    res.setHeader(
      "Set-Cookie",
      `ilegal_session=${jwt}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    res.redirect(hasAccess ? "/" : "/?error=no_access");
  } catch (err) {
    console.error("Auth callback error:", err);
    res.redirect("/?error=auth_failed");
  }
};
