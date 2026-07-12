const { verifyJwt, parseCookies } = require("./_jwt");

  module.exports = function handler(req, res) {
    const cookies = parseCookies(req);
    const token = cookies["ilegal_session"];
    const cookiePresent = !!token;
    
    let payload = null;
    let jwtValid = false;
    
    if (token) {
      payload = verifyJwt(token, process.env.SESSION_SECRET || "fallback");
      jwtValid = !!payload;
    }

    res.json({
      cookiePresent,
      jwtValid,
      hasAccess: payload ? payload.hasAccess : null,
      username: payload ? payload.username : null,
      envVarsSet: {
        DISCORD_CLIENT_ID: !!process.env.DISCORD_CLIENT_ID,
        DISCORD_CLIENT_SECRET: !!process.env.DISCORD_CLIENT_SECRET,
        DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
        DISCORD_ROLE_ID: !!process.env.DISCORD_ROLE_ID,
        SESSION_SECRET: !!process.env.SESSION_SECRET,
      }
    });
  };
  