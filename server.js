import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = 8787;

// metti il token in env: FDTOKEN="..." node server.js
const TOKEN = process.env.FDTOKEN;

if (!TOKEN) {
  console.error("Manca FDTOKEN. Avvia così: FDTOKEN='...' node server.js");
  process.exit(1);
}

// Match Serie A (codice competizione: SA)
app.get("/matches", async (req, res) => {
  try {
    const params = new URLSearchParams();
    if (req.query.status) params.set("status", req.query.status);
    if (req.query.dateFrom) params.set("dateFrom", req.query.dateFrom);
    if (req.query.dateTo) params.set("dateTo", req.query.dateTo);

    const url = `https://api.football-data.org/v4/competitions/SA/matches?${params.toString()}`;

    const r = await fetch(url, {
      headers: { "X-Auth-Token": TOKEN }
    });

    const text = await r.text();
    res.status(r.status).set("Content-Type", "application/json").send(text);
  } catch (e) {
    res.status(500).json({ error: "proxy_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy OK: http://localhost:${PORT}`);
});