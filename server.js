// server.js
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const DISCORD_TOKEN = process.env.DISCORD_TOKEN; // guardado en Render (ENV)
const CHANNEL_ID = "1430766390729506916";       // tu canal

app.post("/api/registrar_usuario", async (req, res) => {
  try {
    const { username, email } = req.body;
    // (aquí podrías guardar en BD si quieres)

    // Enviar mensaje a Discord usando el token seguro en el servidor
    await axios.post(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      { content: `Nuevo usuario: ${username} (${email})` },
      { headers: { Authorization: `Bot ${DISCORD_TOKEN}`, "Content-Type": "application/json" } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: "Error interno" });
  }
});

// endpoint simple para chequear que está vivo
app.get("/api/health", (req, res) => res.json({ ok: true }));

// Render (y la mayoría de PaaS) proveen PORT en process.env.PORT
const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
