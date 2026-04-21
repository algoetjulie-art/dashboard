import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SHEET_HEBDO   = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8ZciJQped1l4159ntQZeBO8nRQQ8CCWCITj6_WT-7sLW7Y03eesAEPJdO394UJQ/pub?gid=1653386731&single=true&output=csv";
const SHEET_MENSUEL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vR8ZciJQped1l4159ntQZeBO8nRQQ8CCWCITj6_WT-7sLW7Y03eesAEPJdO394UJQ/pub?gid=719176496&single=true&output=csv";
function sheetUrl(mode) {
  // Appel à la Vercel Serverless Function /api/sheet
  // qui fetch Google Sheets côté serveur sans problème CORS
  return `/api/sheet?mode=${mode}`;
}

// ─── STRUCTURE DU SHEET ────────────────────────────────────────────────────
// Identique pour Hebdo et Mensuel (index 0-basé) :
// Row 0  = titre ("FlowBoard — Maison Soleil — Vue Hebdomadaire")
// Row 1  = sous-titre ("Boutique e-commerce · Données de démo")
// Row 2  = vide
// Row 3  = section header "Ventes"
// Row 4  = colonnes (KPI | Unité | S1 Jan | … | Tendance)
// Row 5-10 = 6 KPIs Ventes
// Row 11 = vide
// Row 12 = section header "Pub"
// Row 13 = colonnes
// Row 14-19 = 6 KPIs Pub
// Row 20 = vide
// Row 21 = section header "Réseaux"
// Row 22 = colonnes
// Row 23-28 = 6 KPIs Réseaux
// Row 29 = vide
// Row 30 = section header "Emails"
// Row 31 = colonnes
// Row 32-37 = 6 KPIs Emails
// Row 38 = vide
// Row 39 = section header "Lancements"
// Row 40 = colonnes
// Row 41-46 = 6 KPIs Lancements

const SECTIONS_DEF = {
  ventes:     { kpiStart: 5,  kpiEnd: 10, headerRow: 4  },
  pub:        { kpiStart: 14, kpiEnd: 19, headerRow: 13 },
  reseaux:    { kpiStart: 23, kpiEnd: 28, headerRow: 22 },
  emails:     { kpiStart: 32, kpiEnd: 37, headerRow: 31 },
  lancements: { kpiStart: 41, kpiEnd: 46, headerRow: 40 },
};

const ICONS = {
  "Chiffre d'affaires": "💶", "Commandes": "🛒", "Panier moyen": "🎯",
  "Taux d'abandon": "🚪", "Nouveaux clients": "🙋", "Note moyenne": "⭐",
  "Dépenses pub": "💸", "ROAS": "📊", "CPA": "🏷", "Impressions": "👁",
  "CTR": "🖱", "Clics": "👆",
  "Abonnés": "👥", "Taux engagement": "❤️", "Posts publiés": "📝",
  "Portée organique": "📡", "Partages": "↗️", "Messages reçus": "💬",
  "Campagnes envoyées": "📤", "Taux ouverture": "📬", "Taux de clic": "🔗",
  "Liste abonnés": "📋", "Désabonnements": "🚫", "Revenus email": "💡",
  "Lancements": "🚀", "Pré-inscriptions": "📝", "Revenu lancement": "💰",
  "Taux conversion": "🎯", "Score satisfaction": "⭐", "Remboursements": "↩️",
};

const TAB_LABELS = [
  { id: "ventes",     label: "💰 Ventes" },
  { id: "pub",        label: "📣 Pub" },
  { id: "reseaux",    label: "📱 Réseaux" },
  { id: "emails",     label: "📧 Emails" },
  { id: "lancements", label: "🚀 Lancements" },
  { id: "ia",         label: "🤖 IA" },
];

// ─── PARSING ──────────────────────────────────────────────────────────────
function parseCSVToRows(text) {
  return text.split("\n").map((line) => {
    const cells = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur.trim());
    return cells;
  });
}

function cleanNum(val) {
  if (!val) return null;
  const s = String(val).replace(/\s/g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function parseTendance(val) {
  if (!val || val === "—" || val === "-" || val.trim() === "") return null;
  const n = parseFloat(String(val).replace("%", "").replace(",", ".").trim());
  return isNaN(n) ? null : n;
}

function extractSection(rows, secId) {
  const def = SECTIONS_DEF[secId];
  const headerRow = rows[def.headerRow] || [];

  // Colonnes de périodes : col 3 à avant-dernière (Tendance est la dernière)
  const periodCols = [];
  for (let c = 3; c < headerRow.length - 1; c++) {
    const lbl = (headerRow[c] || "").trim();
    if (lbl) periodCols.push({ idx: c, label: lbl });
  }

  const kpis = [];
  for (let r = def.kpiStart; r <= def.kpiEnd; r++) {
    const row = rows[r];
    if (!row) continue;
    const name = (row[1] || "").trim();
    if (!name) continue;
    const unit = (row[2] || "").trim();
    const tendance = parseTendance(row[row.length - 1]);

    // Valeur courante = dernière colonne de période non-nulle
    let currentVal = null, prevVal = null;
    for (let ci = periodCols.length - 1; ci >= 0; ci--) {
      const v = cleanNum(row[periodCols[ci].idx]);
      if (v !== null) {
        if (currentVal === null) currentVal = v;
        else if (prevVal === null) { prevVal = v; break; }
      }
    }

    const series = periodCols.map((p) => ({
      label: p.label,
      value: cleanNum(row[p.idx]) ?? 0,
    }));

    kpis.push({
      name, unit, tendance,
      icon: ICONS[name] || "📌",
      currentVal: currentVal ?? 0,
      prevVal: prevVal ?? 0,
      series,
    });
  }
  return { kpis, periodCols };
}

function formatVal(value, unit) {
  if (value === null || value === undefined) return "–";
  const n = Number(value);
  if (unit === "€") return `${n.toLocaleString("fr-FR")}€`;
  if (unit === "%") return `${n.toFixed(1)}%`;
  if (unit === "x") return `${n.toFixed(1)}x`;
  if (unit === "/5") return `${n.toFixed(1)}/5`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString("fr-FR");
}

function computeHealth(sections) {
  let score = 65;
  Object.values(sections).forEach(({ kpis }) => {
    kpis.forEach((k) => {
      if (k.tendance !== null) score += k.tendance > 0 ? 1.5 : k.tendance < 0 ? -0.8 : 0;
    });
  });
  return Math.min(100, Math.max(0, Math.round(score)));
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const S = {
  bg: "#07090F", card: "#0D1120", border: "#1a2040",
  accent: "#C8F464", text: "#e8eaf0", muted: "#5a6080",
  dim: "#8090b0", danger: "#ff4d6d", warning: "#ffb347",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${S.bg};color:${S.text};font-family:'Syne',sans-serif;min-height:100vh;overflow-x:hidden}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-track{background:${S.bg}}
::-webkit-scrollbar-thumb{background:#1a2040;border-radius:2px}
.wrap{max-width:1200px;margin:0 auto;padding:0 16px 80px}
.hdr{position:sticky;top:0;z-index:100;background:rgba(7,9,15,.93);backdrop-filter:blur(16px);border-bottom:1px solid ${S.border}}
.hdr-in{max-width:1200px;margin:0 auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 16px}
.logo{font-weight:800;font-size:18px;letter-spacing:-.5px;color:${S.accent};flex-shrink:0}
.logo span{color:${S.text}}
.client{font-size:12px;color:${S.dim};font-family:'DM Mono',monospace;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hbadge{display:flex;align-items:center;gap:6px;background:${S.card};border:1px solid ${S.border};border-radius:20px;padding:4px 12px;flex-shrink:0}
.hdot{width:8px;height:8px;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.hscore{font-family:'DM Mono',monospace;font-size:13px;font-weight:500}
.pnav{display:flex;align-items:center;gap:5px;flex-shrink:0;flex-wrap:wrap}
.pbtn{background:${S.card};border:1px solid ${S.border};color:${S.dim};border-radius:6px;padding:5px 10px;font-size:11px;font-family:'DM Mono',monospace;cursor:pointer;transition:all .15s}
.pbtn:hover{border-color:${S.accent};color:${S.accent}}
.pbtn.on{background:${S.accent};color:#07090F;border-color:${S.accent};font-weight:700}
.arr{background:none;border:1px solid ${S.border};color:${S.dim};border-radius:6px;width:28px;height:28px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .15s}
.arr:hover{border-color:${S.accent};color:${S.accent}}
.arr:disabled{opacity:.3;cursor:default}
.plbl{font-family:'DM Mono',monospace;font-size:11px;color:${S.dim};min-width:80px;text-align:center}
.tabs{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none;padding:14px 0 0;-webkit-overflow-scrolling:touch}
.tabs::-webkit-scrollbar{display:none}
.tbtn{background:none;border:1px solid transparent;color:${S.dim};border-radius:8px;padding:8px 14px;font-size:12px;font-family:'Syne',sans-serif;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s}
.tbtn:hover{color:${S.text};background:${S.card}}
.tbtn.on{background:${S.card};border-color:${S.accent};color:${S.accent}}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}
@media(min-width:768px){.grid{grid-template-columns:repeat(3,1fr);gap:14px}}
.kc{background:${S.card};border:1px solid ${S.border};border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;transition:border-color .2s,transform .2s;animation:fu .3s ease both}
.kc:hover{border-color:rgba(200,244,100,.35);transform:translateY(-2px)}
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.kc:nth-child(1){animation-delay:.04s}.kc:nth-child(2){animation-delay:.08s}
.kc:nth-child(3){animation-delay:.12s}.kc:nth-child(4){animation-delay:.16s}
.kc:nth-child(5){animation-delay:.2s}.kc:nth-child(6){animation-delay:.24s}
.kh{display:flex;justify-content:space-between;align-items:flex-start}
.kl{font-size:10px;color:${S.muted};font-family:'DM Mono',monospace;text-transform:uppercase;letter-spacing:.06em;line-height:1.3}
.ki{font-size:18px;line-height:1}
.kv{font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:${S.text};letter-spacing:-.5px}
@media(min-width:768px){.kv{font-size:26px}}
.kt{display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:11px}
.up{color:${S.accent}}.dn{color:${S.danger}}.fl{color:${S.muted}}
.chart{margin-top:14px;background:${S.card};border:1px solid ${S.border};border-radius:14px;padding:20px 12px 12px;animation:fu .4s .28s ease both}
.ctit{font-size:10px;font-family:'DM Mono',monospace;color:${S.muted};text-transform:uppercase;letter-spacing:.08em;margin-bottom:14px;padding-left:8px}
.ia{margin-top:14px;display:flex;flex-direction:column;gap:12px;animation:fu .3s ease both}
.iac{background:${S.card};border:1px solid ${S.border};border-radius:14px;padding:20px}
.iat{font-size:13px;font-weight:700;color:${S.accent};margin-bottom:8px}
.iad{font-size:12px;color:${S.dim};font-family:'DM Mono',monospace;line-height:1.6;margin-bottom:14px}
.iabtn{background:${S.accent};color:#07090F;border:none;border-radius:8px;padding:10px 20px;font-family:'Syne',sans-serif;font-weight:700;font-size:13px;cursor:pointer;transition:all .15s}
.iabtn:hover{background:#d8ff70;transform:translateY(-1px)}
.iabtn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.iar{margin-top:14px;background:rgba(200,244,100,.05);border:1px solid rgba(200,244,100,.2);border-radius:10px;padding:16px;font-family:'DM Mono',monospace;font-size:12px;color:${S.dim};line-height:1.7;white-space:pre-wrap}
.dots{display:flex;gap:5px;align-items:center;padding:8px 0}
.dot{width:6px;height:6px;border-radius:50%;background:${S.accent};animation:blink 1.2s infinite}
.dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
@keyframes blink{0%,80%,100%{opacity:.2}40%{opacity:1}}
.ctr{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:55vh;gap:14px;text-align:center}
.spin{width:36px;height:36px;border:3px solid ${S.border};border-top-color:${S.accent};border-radius:50%;animation:sp .8s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}
.ebox{background:${S.card};border:1px solid ${S.danger}44;border-radius:14px;padding:22px;max-width:420px}
.etit{font-size:15px;font-weight:700;color:${S.danger};margin-bottom:8px}
.emsg{font-size:12px;font-family:'DM Mono',monospace;color:${S.dim};line-height:1.6}
.rtbtn{margin-top:12px;background:none;border:1px solid ${S.accent};color:${S.accent};border-radius:8px;padding:8px 16px;font-family:'Syne',sans-serif;font-weight:600;font-size:12px;cursor:pointer;transition:all .15s}
.rtbtn:hover{background:${S.accent};color:#07090F}
.tip{background:${S.card};border:1px solid ${S.border};border-radius:8px;padding:10px 14px;font-family:'DM Mono',monospace;font-size:11px;color:${S.text}}
`;

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────
const Tooltip_ = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="tip">
      <div style={{ color: S.accent, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>{p.name}: {Number(p.value).toLocaleString("fr-FR")}</div>
      ))}
    </div>
  );
};

function KPICard({ kpi }) {
  const t = kpi.tendance;
  const cls = t === null ? "fl" : t > 0 ? "up" : "dn";
  const arrow = t === null ? "·" : t > 0 ? "↑" : "↓";
  const pct = t === null ? "–" : `${Math.abs(t).toFixed(1)}%`;
  return (
    <div className="kc">
      <div className="kh">
        <span className="kl">{kpi.name}</span>
        <span className="ki">{kpi.icon}</span>
      </div>
      <div className="kv">{formatVal(kpi.currentVal, kpi.unit)}</div>
      <div className={`kt ${cls}`}>
        <span>{arrow}</span><span>{pct}</span>
        {t !== null && <span style={{ color: S.muted, fontSize: 10 }}>tendance</span>}
      </div>
    </div>
  );
}

function ChartSection({ kpis, periodCols }) {
  if (!kpis?.length || periodCols?.length < 2) {
    return (
      <div className="chart">
        <div className="ctit">Évolution</div>
        <div style={{ textAlign: "center", padding: 20, color: S.muted, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
          Données insuffisantes pour le graphique
        </div>
      </div>
    );
  }
  const series = kpis.slice(0, 3);
  const colors = [S.accent, "#6ee7f7", "#ff7eb9"];
  const data = periodCols.map((p, pi) => {
    const pt = { period: p.label };
    series.forEach((k) => { pt[k.name] = k.series[pi]?.value ?? 0; });
    return pt;
  });

  return (
    <div className="chart">
      <div className="ctit">{series.map((k) => k.name).join(" · ")}</div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            {series.map((k, i) => (
              <linearGradient key={k.name} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i]} stopOpacity={0.3} />
                <stop offset="95%" stopColor={colors[i]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a2040" vertical={false} />
          <XAxis dataKey="period" tick={{ fill: S.muted, fontSize: 9, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: S.muted, fontSize: 9, fontFamily: "'DM Mono',monospace" }} axisLine={false} tickLine={false} />
          <Tooltip content={<Tooltip_ />} />
          {series.map((k, i) => (
            <Area key={k.name} type="monotone" dataKey={k.name}
              stroke={colors[i]} strokeWidth={2} fill={`url(#g${i})`}
              dot={false} activeDot={{ r: 4, fill: colors[i] }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function IATab({ sections, clientName, periodMode }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = async () => {
    setLoading(true); setResult(""); setError("");
    const summary = Object.entries(sections).map(([tab, { kpis }]) => {
      const lines = kpis.map((k) =>
        `  - ${k.name}${k.unit ? ` (${k.unit})` : ""}: ${formatVal(k.currentVal, k.unit)} [tendance: ${k.tendance !== null ? k.tendance + "%" : "–"}]`
      ).join("\n");
      return `${tab.toUpperCase()} :\n${lines}`;
    }).join("\n\n");

    const prompt = `Tu es un expert en analyse de performance business pour assistantes virtuelles freelance.

Client : "${clientName}" — Vue : ${periodMode === "hebdo" ? "Hebdomadaire" : "Mensuelle"}

KPIs actuels :
${summary}

Fournis une analyse structurée en français :
1. 📊 Synthèse globale (3-4 phrases percutantes)
2. ✅ Points forts (2-3 éléments avec chiffres clés)
3. ⚠️ Points d'attention (2-3 éléments avec chiffres)
4. 🎯 3 recommandations concrètes et actionnables pour la prochaine période

Sois direct, professionnel, orienté action. Pas de blabla.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await res.json();
      if (data.content?.[0]?.text) setResult(data.content[0].text);
      else setError("Réponse inattendue de l'API Claude.");
    } catch (e) {
      setError("Erreur de connexion à l'API Claude. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ia">
      <div className="iac">
        <div className="iat">🤖 Analyse IA de tes KPIs</div>
        <div className="iad">
          Claude analyse tous tes KPIs ({periodMode === "hebdo" ? "vue hebdomadaire" : "vue mensuelle"}) et génère un diagnostic complet avec recommandations actionnables.
        </div>
        <button className="iabtn" onClick={analyze} disabled={loading}>
          {loading ? "Analyse en cours…" : "✨ Analyser mes KPIs"}
        </button>
        {loading && (
          <div className="dots">
            <div className="dot" /><div className="dot" /><div className="dot" />
            <span style={{ fontSize: 11, color: S.muted, fontFamily: "'DM Mono',monospace", marginLeft: 4 }}>
              Claude réfléchit…
            </span>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12, padding: 12, background: "rgba(255,77,109,.08)", border: "1px solid rgba(255,77,109,.25)", borderRadius: 8, color: S.danger, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>
            ⚠️ {error}
          </div>
        )}
        {result && <div className="iar">{result}</div>}
      </div>
      <div className="iac">
        <div className="iat">💡 Comment ça marche</div>
        <div className="iad">
          FlowBoard lit ton Google Sheet publié en CSV, parse chaque section (Ventes, Pub, Réseaux, Emails, Lancements) ligne par ligne et transmet un résumé structuré à Claude.{"\n\n"}
          L'analyse prend ~10-15 secondes. Switche entre Hebdo et Mensuel pour des insights adaptés à chaque granularité.
        </div>
      </div>
    </div>
  );
}

// ─── PERIODS ──────────────────────────────────────────────────────────────────
function getWeekNum(d) {
  const u = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = u.getUTCDay() || 7;
  u.setUTCDate(u.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(u.getUTCFullYear(), 0, 1));
  return Math.ceil(((u - y) / 86400000 + 1) / 7);
}

function getPeriodLabel(mode, offset) {
  const now = new Date();
  if (mode === "hebdo") {
    const d = new Date(now); d.setDate(d.getDate() - offset * 7);
    return `Sem. ${getWeekNum(d)} · ${d.getFullYear()}`;
  }
  const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
  return d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab]   = useState("ventes");
  const [periodMode, setPeriodMode] = useState("hebdo");
  const [offset, setOffset]         = useState(0);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [sections, setSections]     = useState({});
  const [clientName, setClientName] = useState("–");
  const [health, setHealth]         = useState(70);
  const [retry, setRetry]           = useState(0);

  const fetchSheet = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(sheetUrl(periodMode));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const rows = parseCSVToRows(text);

      // Nom client depuis row 1 : "Boutique e-commerce · Données de démo" → on prend row 0
      // Row 0 = "FlowBoard — Maison Soleil — Vue Hebdomadaire"
      const titleCell = (rows[0]?.[1] || rows[0]?.[0] || "").trim();
      // Extrait "Maison Soleil" entre les —
      const parts = titleCell.split("—");
      const name = parts.length >= 2 ? parts[1].trim() : titleCell.split("·")[0].trim();
      setClientName(name || "Mon Client");

      const parsed = {};
      for (const secId of ["ventes", "pub", "reseaux", "emails", "lancements"]) {
        parsed[secId] = extractSection(rows, secId);
      }
      setSections(parsed);
      setHealth(computeHealth(parsed));
    } catch (e) {
      setError(
        `Impossible de charger les données.\n\nVérifie que :\n• Le Google Sheet est publié en accès public\n  (Fichier → Partager → Publier sur le web → CSV)\n• L'ID du spreadsheet est correct\n• Le Sheet contient des données\n\nErreur technique : ${e.message}`
      );
    } finally {
      setLoading(false);
    }
  }, [periodMode, retry]);

  useEffect(() => { fetchSheet(); }, [fetchSheet]);

  const periodLabel = getPeriodLabel(periodMode, offset);
  const scoreColor  = health >= 75 ? S.accent : health >= 50 ? S.warning : S.danger;
  const sec         = sections[activeTab] || { kpis: [], periodCols: [] };

  return (
    <>
      <style>{css}</style>

      <header className="hdr">
        <div className="hdr-in">
          <div className="logo">Flow<span>Board</span></div>
          <div className="client">📌 {clientName}</div>

          <div className="hbadge">
            <div className="hdot" style={{ background: scoreColor, boxShadow: `0 0 8px ${scoreColor}` }} />
            <span className="hscore" style={{ color: scoreColor }}>{health}/100</span>
          </div>

          <div className="pnav">
            <button className={`pbtn ${periodMode === "hebdo" ? "on" : ""}`}
              onClick={() => { setPeriodMode("hebdo"); setOffset(0); }}>Hebdo</button>
            <button className={`pbtn ${periodMode === "mensuel" ? "on" : ""}`}
              onClick={() => { setPeriodMode("mensuel"); setOffset(0); }}>Mensuel</button>
            <button className="arr" onClick={() => setOffset((o) => o + 1)}>‹</button>
            <span className="plbl">{periodLabel}</span>
            <button className="arr" onClick={() => setOffset((o) => Math.max(0, o - 1))} disabled={offset === 0}>›</button>
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="tabs">
          {TAB_LABELS.map((t) => (
            <button key={t.id} className={`tbtn ${activeTab === t.id ? "on" : ""}`}
              onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {loading ? (
          <div className="ctr">
            <div className="spin" />
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: S.muted }}>
              Chargement du Google Sheet…
            </div>
          </div>
        ) : error ? (
          <div className="ctr">
            <div className="ebox">
              <div className="etit">⚠️ Erreur de chargement</div>
              <div className="emsg">{error}</div>
              <button className="rtbtn" onClick={() => setRetry((r) => r + 1)}>🔄 Réessayer</button>
            </div>
          </div>
        ) : activeTab === "ia" ? (
          <IATab sections={sections} clientName={clientName} periodMode={periodMode} />
        ) : (
          <>
            <div className="grid">
              {sec.kpis.map((kpi) => <KPICard key={kpi.name} kpi={kpi} />)}
              {sec.kpis.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", padding: 32, color: S.muted, fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                  Aucune donnée disponible
                </div>
              )}
            </div>
            <ChartSection kpis={sec.kpis} periodCols={sec.periodCols} />
          </>
        )}
      </div>
    </>
  );
}
