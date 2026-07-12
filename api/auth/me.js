const { verifyJwt, parseCookies } = require("../_jwt");

  module.exports = function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    const cookies = parseCookies(req);
    const token   = cookies["ilegal_session"];
    const payload = verifyJwt(token, process.env.SESSION_SECRET || "fallback");

    if (!payload || !payload.hasAccess) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({
      userId:   payload.userId,
      username: payload.username,
      avatar:   payload.avatar || null,
    });
  };
  