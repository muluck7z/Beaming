const { verifyJwt, parseCookies } = require("../_jwt");

  module.exports = function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    // Tenta Authorization: Bearer TOKEN primeiro
    var authHeader = req.headers["authorization"] || "";
    var token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // Fallback: cookie
    if (!token) {
      var cookies = parseCookies(req);
      token = cookies["ilegal_session"] || null;
    }

    var payload = verifyJwt(token, process.env.SESSION_SECRET || "fallback");
    if (!payload || !payload.hasAccess) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({ userId: payload.userId, username: payload.username, avatar: payload.avatar || null });
  };
  