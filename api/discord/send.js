export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, channelId, message } = req.body ?? {};

  if (!token || !channelId || !message) {
    return res.status(400).json({ error: "token, channelId e message são obrigatórios." });
  }

  if (!/^\d{17,20}$/.test(String(channelId))) {
    return res.status(400).json({ error: "channelId inválido." });
  }

  if (String(message).length > 2000) {
    return res.status(400).json({ error: "Mensagem excede 2000 caracteres." });
  }

  try {
    const discordRes = await fetch(
      `https://discord.com/api/v9/channels/${channelId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: message }),
      }
    );

    const body = await discordRes.json().catch(() => ({}));

    return res.status(discordRes.status).json(body);
  } catch (err) {
    return res.status(502).json({ error: "Erro ao contactar a API do Discord.", detail: String(err) });
  }
}
