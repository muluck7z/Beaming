module.exports = function handler(req, res) {
  const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
  if (!CLIENT_ID) {
    res.status(500).send("Missing DISCORD_CLIENT_ID");
    return;
  }

  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const proto = req.headers["x-forwarded-proto"] || "https";
  const redirectUri = `${proto}://${host}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "identify guilds.members.read",
  });

  res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
};
