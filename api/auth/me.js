const { verifyJwt, parseCookies } = require("../_jwt");
const { isAdmin, supabase } = require("../_admin");

  module.exports = async function handler(req, res) {
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

    let memberStatus = "active";
    try {
      const rows = await supabase(`members?user_id=eq.${encodeURIComponent(String(payload.userId))}&select=status`);
      memberStatus = rows?.[0]?.status || "active";
    } catch (error) {
      // A autenticação continua funcionando se o banco ainda estiver sendo configurado.
      console.error("Status do membro indisponível:", error.message);
    }
    if (memberStatus === "banned") {
      res.status(403).json({ error: "Banned" });
      return;
    }
    res.json({
      userId: payload.userId,
      username: payload.username,
      avatar: payload.avatar || null,
      hasVipAccess: Boolean(payload.hasVipAccess),
      isAdmin: isAdmin(payload),
      memberStatus,
    });
  };

