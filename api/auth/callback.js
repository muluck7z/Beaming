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
    if (!code) { return redirect(res, base + "/?error=missing_code"); }

    var log = [];

    try {
      const redirectUri = base + "/api/auth/callback";
      log.push("redirect_uri: " + redirectUri);

      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          grant_type: "authorization_code", code, redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        var tokenErr = await tokenRes.text();
        log.push("TOKEN FAILED " + tokenRes.status + ": " + tokenErr);
        return showDiag(res, log, false, null, base);
      }

      const { access_token } = await tokenRes.json();
      log.push("token ok");

      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: "Bearer " + access_token },
      });
      if (!userRes.ok) { log.push("user fetch failed " + userRes.status); return showDiag(res, log, false, null, base); }
      const user = await userRes.json();
      log.push("user: " + (user.global_name || user.username) + " (" + user.id + ")");

      const memberRes = await fetch(
        "https://discord.com/api/users/@me/guilds/" + GUILD_ID + "/member",
        { headers: { Authorization: "Bearer " + access_token } }
      );

      var hasAccess = false;
      if (memberRes.ok) {
        const member = await memberRes.json();
        hasAccess = Array.isArray(member.roles) && member.roles.includes(ROLE_ID);
        log.push("member ok, roles: " + member.roles.join(","));
        log.push("ROLE_ID procurado: " + ROLE_ID);
        log.push("hasAccess: " + hasAccess);
      } else {
        var memberErr = await memberRes.text();
        log.push("MEMBER FAILED " + memberRes.status + ": " + memberErr);
      }

      const jwt = makeJwt(
        { userId: user.id, username: user.global_name || user.username, avatar: user.avatar || null, hasAccess },
        SECRET
      );

      res.setHeader("Set-Cookie",
        "ilegal_session=" + jwt + "; Path=/; HttpOnly; SameSite=Lax; Max-Age=" + (7 * 24 * 3600)
      );
      return showDiag(res, log, hasAccess, user, base);

    } catch (err) {
      log.push("EXCEPTION: " + err.message);
      return showDiag(res, log, false, null, base);
    }
  };

  function showDiag(res, log, hasAccess, user, base) {
    var dest = hasAccess ? base + "/" : base + "/?error=no_access";
    var color = hasAccess ? "#39d353" : "#ff4444";
    var rows = log.map(function(l) { return "<div style=\"margin:4px 0;font-family:monospace;font-size:13px;\">" + l + "</div>"; }).join("");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>body{background:#0d0d0d;color:#eee;font-family:sans-serif;padding:40px;max-width:600px;margin:auto}</style></head><body>" +
      "<h2 style=\"color:" + color + ";\">Auth: " + (hasAccess ? "✓ ACESSO LIBERADO" : "✗ SEM ACESSO") + "</h2>" +
      "<div style=\"background:#111;border:1px solid #333;border-radius:8px;padding:16px;margin:16px 0;\">" + rows + "</div>" +
      (user ? "<div style=\"margin:8px 0;\">Usuário: <b>" + (user.global_name || user.username) + "</b></div>" : "") +
      "<a href=\"" + dest + "\" style=\"display:inline-block;margin-top:20px;padding:12px 28px;background:" + color + ";color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;\">" +
      (hasAccess ? "Entrar no site →" : "Voltar") +
      "</a></body></html>"
    );
  }

  function redirect(res, url) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send("<!DOCTYPE html><html><head><script>location.replace(" + JSON.stringify(url) + ")<\/script></head></html>");
  }
  