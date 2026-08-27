const { makeJwt } = require("../_jwt");

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers["x-real-ip"];
  if (typeof realIp === "string" && realIp.trim()) {
    return realIp.trim();
  }

  return req.socket?.remoteAddress || "desconhecido";
}

async function logVerification(req, user) {
  const webhookUrl = process.env.VERIFICATION_LOG_WEBHOOK;
  if (!webhookUrl) {
    console.warn("VERIFICATION_LOG_WEBHOOK não configurado.");
    return;
  }

  const username = user.global_name || user.username || "desconhecido";
  const payload = {
    embeds: [
      {
        title: "Verificação",
        fields: [
          { name: "ID", value: String(user.id), inline: true },
          { name: "Usuário", value: String(username).slice(0, 1024), inline: true },
          { name: "IP", value: getClientIp(req).slice(0, 1024), inline: true },
          { name: "Horário", value: new Date().toISOString(), inline: true },
        ],
        color: 0x5865f2,
      },
    ],
    allowed_mentions: { parse: [] },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const webhookRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!webhookRes.ok) {
      console.error("Falha ao enviar o log de verificação:", webhookRes.status);
    }
  } catch (err) {
    console.error(
      "Falha ao enviar o log de verificação:",
      err?.name === "AbortError" ? "timeout" : err?.message || "erro desconhecido"
    );
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
  const GUILD_ID = process.env.DISCORD_GUILD_ID;
  const ROLE_ID = process.env.DISCORD_ROLE_ID;
  const SECRET = process.env.SESSION_SECRET || "fallback";

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const base = proto + "://" + host;

  function send(res, dest) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" +
        "<script>window.location.replace(" + JSON.stringify(dest) + ");<\\/script>" +
        "</head><body></body></html>"
    );
  }

  const code = req.query.code;
  if (!code) {
    send(res, base + "/?error=missing_code");
    return;
  }

  try {
    const redirectUri = base + "/api/auth/callback";

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) {
      send(res, base + "/?error=auth_failed");
      return;
    }

    const { access_token } = await tokenRes.json();

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: "Bearer " + access_token },
    });
    if (!userRes.ok) {
      send(res, base + "/?error=auth_failed");
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
    }

    if (!hasAccess) {
      send(res, base + "/?error=no_access");
      return;
    }

    await logVerification(req, user);

    const jwt = makeJwt(
      {
        userId: user.id,
        username: user.global_name || user.username,
        avatar: user.avatar || null,
        hasAccess,
      },
      SECRET
    );

    // Passa o JWT pelo hash da URL (não vai pro servidor, fica só no browser)
    send(res, base + "/#jwt=" + encodeURIComponent(jwt));
  } catch (err) {
    console.error("Auth callback error:", err);
    send(res, base + "/?error=auth_failed");
  }
};

module.exports.logVerification = logVerification;
module.exports.getClientIp = getClientIp;

