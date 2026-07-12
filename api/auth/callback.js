const { makeJwt } = require("../_jwt");

  module.exports = async function handler(req, res) {
    const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const GUILD_ID      = process.env.DISCORD_GUILD_ID;
    const ROLE_ID       = process.env.DISCORD_ROLE_ID;
    const SECRET        = process.env.SESSION_SECRET || "fallback";

    const host  = req.headers["x-forwarded-host"] || req.headers.host;
    const proto = req.headers["x-forwarded-proto"] || "https";
    const base  = proto + "://" + host;

    const code = req.query.code;
    if (!code) {
      res.writeHead(302, { "Location": base + "/?error=missing_code" });
      res.end();
      return;
    }

    try {
      const redirectUri = base + "/api/auth/callback";

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
        res.writeHead(302, { "Location": base + "/?error=auth_failed" });
        res.end();
        return;
      }

      const tokenData = await tokenRes.json();
      const access_token = tokenData.access_token;

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + access_token },
      });
      if (!userRes.ok) {
        res.writeHead(302, { "Location": base + "/?error=auth_failed" });
        res.end();
        return;
      }
      const user = await userRes.json();

      let hasAccess = false;
      const memberRes = await fetch(
        "https://discord.com/api/users/@me/guilds/" + GUILD_ID + "/member",
        { headers: { Authorization: "Bearer " + access_token } }
      );
      if (memberRes.ok) {
        const member = await memberRes.json();
        hasAccess = Array.isArray(member.roles) && member.roles.includes(ROLE_ID);
      } else {
        console.error("Member fetch failed:", memberRes.status, await memberRes.text());
      }

      const jwt = makeJwt(
        { userId: user.id, username: user.global_name || user.username, avatar: user.avatar || null, hasAccess },
        SECRET
      );

      const dest = hasAccess ? base + "/" : base + "/?error=no_access";
      res.writeHead(302, {
        "Set-Cookie": "ilegal_session=" + jwt + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (7 * 24 * 3600),
        "Location": dest,
      });
      res.end();
    } catch (err) {
      console.error("Auth callback error:", err);
      res.writeHead(302, { "Location": base + "/?error=auth_failed" });
      res.end();
    }
  };
  