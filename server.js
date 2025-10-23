const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// 🌍 Conexión a MongoDB Atlas (Render usa variable MONGO_URI)
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch((err) => console.error("❌ Error MongoDB:", err));

// 📦 Esquemas de MongoDB
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const AdSchema = new mongoose.Schema({
  username: String,
  fecha: String, // formato yyyy-MM-dd
});

const User = mongoose.model("User", UserSchema);
const Ad = mongoose.model("Ad", AdSchema);

// 🧾 Registrar usuario
app.post("/api/registrar_usuario", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (await User.findOne({ username })) {
      return res.status(400).json({ error: "Usuario ya existe" });
    }

    await User.create({ username, email, password });
    res.status(201).json({ message: "Usuario registrado" });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar usuario" });
  }
});

// 🔑 Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (!user)
      return res.status(401).json({ error: "Credenciales inválidas" });
    res.json({ message: "Login exitoso" });
  } catch (err) {
    res.status(500).json({ error: "Error en login" });
  }
});

// 📺 Registrar anuncio visto + Webhooks
app.post("/api/anuncio_visto", async (req, res) => {
  try {
    const { username, fecha } = req.body;
    await Ad.create({ username, fecha });

    // 🪝 Enviar mensaje al webhook de Discord
    await axios.post(process.env.WEBHOOK_URL, {
      content: `📢 ${username} vio un anuncio el ${fecha}`,
    });

    res.json({ message: "Anuncio registrado" });
  } catch (err) {
    res.status(500).json({ error: "Error registrando anuncio" });
  }
});

// 🏆 Ranking diario
app.get("/api/ranking", async (req, res) => {
  try {
    const hoy = new Date().toISOString().slice(0, 10);
    const ads = await Ad.find({ fecha: hoy });

    const ranking = {};
    ads.forEach((log) => {
      ranking[log.username] = (ranking[log.username] || 0) + 1;
    });

    const sorted = Object.keys(ranking)
      .map((username) => ({
        username,
        adsWatched: ranking[username],
      }))
      .sort((a, b) => b.adsWatched - a.adsWatched);

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: "Error obteniendo ranking" });
  }
});

// 🕓 Reinicio automático cada medianoche (00:00 hora Lima)
cron.schedule("0 0 * * *", async () => {
  console.log("🧹 Reiniciando ranking diario...");
  await Ad.deleteMany({});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));
