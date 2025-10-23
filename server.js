const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Datos temporales (en memoria)
let users = [];
let adsLog = [];

// Registrar usuario
app.post("/api/registrar_usuario", (req, res) => {
  const { username, email, password } = req.body;
  if (users.find((u) => u.username === username)) {
    return res.status(400).json({ error: "Usuario ya existe" });
  }
  users.push({ username, email, password });
  res.status(201).json({ message: "Usuario registrado" });
});

// Login
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password
  );
  if (!user) return res.status(401).json({ error: "Credenciales inválidas" });
  res.json({ message: "Login exitoso" });
});

// Registrar anuncio visto
app.post("/api/anuncio_visto", (req, res) => {
  const { username, fecha } = req.body;
  adsLog.push({ username, fecha });
  res.json({ message: "Anuncio registrado" });
});

// Ranking
app.get("/api/ranking", (req, res) => {
  const ranking = {};
  adsLog.forEach((log) => {
    if (!ranking[log.username]) ranking[log.username] = 0;
    ranking[log.username]++;
  });

  const sorted = Object.keys(ranking)
    .map((username) => ({
      username,
      adsWatched: ranking[username],
    }))
    .sort((a, b) => b.adsWatched - a.adsWatched);

  res.json(sorted);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`✅ Servidor activo en puerto ${PORT}`));
