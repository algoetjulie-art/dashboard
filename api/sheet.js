// api/sheet.js  — Vercel Serverless Function
// Place ce fichier dans /api/sheet.js à la racine de ton projet Vite

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");

  const { mode } = req.query;

  const URLS = {
    hebdo:   "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8ZciJQped1l4159ntQZeBO8nRQQ8CCWCITj6_WT-7sLW7Y03eesAEPJdO394UJQ/pub?gid=1653386731&single=true&output=csv",
    mensuel: "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8ZciJQped1l4159ntQZeBO8nRQQ8CCWCITj6_WT-7sLW7Y03eesAEPJdO394UJQ/pub?gid=719176496&single=true&output=csv",
  };

  const url = URLS[mode];
  if (!url) {
    return res.status(400).json({ error: "mode invalide, utilise ?mode=hebdo ou ?mode=mensuel" });
  }

  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!response.ok) throw new Error(`Google Sheets HTTP ${response.status}`);
    const csv = await response.text();
    res.setHeader("Content-Type", "text/csv");
    res.status(200).send(csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
