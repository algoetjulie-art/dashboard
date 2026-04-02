import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ─────────────────────────────────────────────
   DESIGN TOKENS
   ───────────────────────────────────────────── */
const T = {
  bg: "#07090F",
  card: "#0D1120",
  cardHover: "#111730",
  accent: "#C8F464",
  accentDim: "rgba(200,244,100,.12)",
  text: "#E8EAF0",
  textDim: "#6B7190",
  red: "#FF6B6B",
  border: "rgba(200,244,100,.08)",
  radius: "14px",
  radiusSm: "10px",
  font: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', monospace",
};

/* ─────────────────────────────────────────────
   TAB DEFINITIONS & KPI MAPPING
   ───────────────────────────────────────────── */
const TABS = [
  { key: "ventes", label: "Ventes", icon: "💰" },
  { key: "pub", label: "Pub", icon: "📣" },
  { key: "reseaux", label: "Réseaux", icon: "📱" },
  { key: "emails", label: "Emails", icon: "📧" },
  { key: "lancements", label: "Lancements", icon: "🚀" },
];

const KPI_CONFIG = {
  ventes: [
    { id: "ca", label: "Chiffre d'affaires", prefix: "", suffix: "€", icon: "💶" },
    { id: "commandes", label: "Commandes", prefix: "", suffix: "", icon: "🛒" },
    { id: "panier_moyen", label: "Panier moyen", prefix: "", suffix: "€", icon: "🧺" },
    { id: "taux_conversion", label: "Taux conversion", prefix: "", suffix: "%", icon: "🎯" },
    { id: "clients_nouveaux", label: "Nouveaux clients", prefix: "", suffix: "", icon: "👤" },
    { id: "revenu_recurrent", label: "Revenu récurrent", prefix: "", suffix: "€", icon: "🔄" },
  ],
  pub: [
    { id: "depenses_pub", label: "Dépenses pub", prefix: "", suffix: "€", icon: "💸" },
    { id: "roas", label: "ROAS", prefix: "", suffix: "x", icon: "📈" },
    { id: "cpc", label: "CPC", prefix: "", suffix: "€", icon: "🖱️" },
    { id: "impressions", label: "Impressions", prefix: "", suffix: "", icon: "👁️" },
    { id: "clics", label: "Clics", prefix: "", suffix: "", icon: "🔗" },
    { id: "ctr", label: "CTR", prefix: "", suffix: "%", icon: "📊" },
  ],
  reseaux: [
    { id: "abonnes", label: "Abonnés", prefix: "", suffix: "", icon: "👥" },
    { id: "engagement", label: "Engagement", prefix: "", suffix: "%", icon: "❤️" },
    { id: "portee", label: "Portée", prefix: "", suffix: "", icon: "📡" },
    { id: "publications", label: "Publications", prefix: "", suffix: "", icon: "📝" },
    { id: "partages", label: "Partages", prefix: "", suffix: "", icon: "🔄" },
    { id: "commentaires", label: "Commentaires", prefix: "", suffix: "", icon: "💬" },
  ],
  emails: [
    { id: "envoyes", label: "Emails envoyés", prefix: "", suffix: "", icon: "📤" },
    { id: "taux_ouverture", label: "Taux ouverture", prefix: "", suffix: "%", icon: "📬" },
    { id: "taux_clic", label: "Taux de clic", prefix: "", suffix: "%", icon: "🔗" },
    { id: "desabonnements", label: "Désabonnements", prefix: "", suffix: "", icon: "🚪" },
    { id: "liste_contacts", label: "Liste contacts", prefix: "", suffix: "", icon: "📋" },
    { id: "revenu_email", label: "Revenu email", prefix: "", suffix: "€", icon: "💰" },
  ],
  lancements: [
    { id: "inscrits_lancement", label: "Inscrits", prefix: "", suffix: "", icon: "✍️" },
    { id: "ventes_lancement", label: "Ventes lancement", prefix: "", suffix: "", icon: "🎉" },
    { id: "ca_lancement", label: "CA lancement", prefix: "", suffix: "€", icon: "💶" },
    { id: "taux_conversion_lancement", label: "Taux conversion", prefix: "", suffix: "%", icon: "🎯" },
    { id: "pages_vues", label: "Pages vues", prefix: "", suffix: "", icon: "👁️" },
    { id: "leads", label: "Leads générés", prefix: "", suffix: "", icon: "🧲" },
  ],
};

/* Column name aliases — maps CSV header variants to internal KPI ids */
const COLUMN_ALIASES = {
  /* Ventes */
  "chiffre d'affaires": "ca", "chiffre_affaires": "ca", ca: "ca", revenue: "ca",
  commandes: "commandes", orders: "commandes",
  "panier moyen": "panier_moyen", panier_moyen: "panier_moyen", aov: "panier_moyen",
  "taux conversion": "taux_conversion", taux_conversion: "taux_conversion", "conversion rate": "taux_conversion",
  "nouveaux clients": "clients_nouveaux", clients_nouveaux: "clients_nouveaux", "new customers": "clients_nouveaux",
  "revenu récurrent": "revenu_recurrent", revenu_recurrent: "revenu_recurrent", mrr: "revenu_recurrent",
  /* Pub */
  "dépenses pub": "depenses_pub", depenses_pub: "depenses_pub", "ad spend": "depenses_pub",
  roas: "roas",
  cpc: "cpc",
  impressions: "impressions",
  clics: "clics", clicks: "clics",
  ctr: "ctr",
  /* Réseaux */
  abonnés: "abonnes", abonnes: "abonnes", followers: "abonnes",
  engagement: "engagement",
  portée: "portee", portee: "portee", reach: "portee",
  publications: "publications", posts: "publications",
  partages: "partages", shares: "partages",
  commentaires: "commentaires", comments: "commentaires",
  /* Emails */
  "emails envoyés": "envoyes", envoyes: "envoyes", "emails sent": "envoyes",
  "taux ouverture": "taux_ouverture", taux_ouverture: "taux_ouverture", "open rate": "taux_ouverture",
  "taux de clic": "taux_clic", taux_clic: "taux_clic", "click rate": "taux_clic",
  désabonnements: "desabonnements", desabonnements: "desabonnements", unsubscribes: "desabonnements",
  "liste contacts": "liste_contacts", liste_contacts: "liste_contacts", subscribers: "liste_contacts",
  "revenu email": "revenu_email", revenu_email: "revenu_email", "email revenue": "revenu_email",
  /* Lancements */
  inscrits: "inscrits_lancement", inscrits_lancement: "inscrits_lancement", signups: "inscrits_lancement",
  "ventes lancement": "ventes_lancement", ventes_lancement: "ventes_lancement",
  "ca lancement": "ca_lancement", ca_lancement: "ca_lancement",
  "taux conversion lancement": "taux_conversion_lancement", taux_conversion_lancement: "taux_conversion_lancement",
  "pages vues": "pages_vues", pages_vues: "pages_vues", pageviews: "pages_vues",
  leads: "leads", "leads générés": "leads", leads_generes: "leads",
  /* Meta */
  semaine: "_week", week: "_week", période: "_period", period: "_period", date: "_date", mois: "_month", month: "_month",
};

/* map KPI id → which tab it belongs to */
const KPI_TO_TAB = {};
Object.entries(KPI_CONFIG).forEach(([tab, kpis]) =>
  kpis.forEach((k) => { KPI_TO_TAB[k.id] = tab; })
);

/* ─────────────────────────────────────────────
   CSV PARSER
   ───────────────────────────────────────────── */
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row = {};
    headers.forEach((h, i) => {
      const key = COLUMN_ALIASES[h] || h;
      row[key] = vals[i] || "";
    });
    return row;
  });
}

/* ─────────────────────────────────────────────
   DEMO DATA (fallback when fetch fails in preview)
   ───────────────────────────────────────────── */
function generateDemoData() {
  const weeks = [];
  for (let w = 1; w <= 12; w++) {
    weeks.push({
      _week: `S${w}`,
      ca: (4200 + Math.random() * 3000).toFixed(0),
      commandes: (40 + Math.random() * 30).toFixed(0),
      panier_moyen: (85 + Math.random() * 40).toFixed(0),
      taux_conversion: (2.1 + Math.random() * 2.5).toFixed(1),
      clients_nouveaux: (12 + Math.random() * 20).toFixed(0),
      revenu_recurrent: (1200 + Math.random() * 800).toFixed(0),
      depenses_pub: (300 + Math.random() * 500).toFixed(0),
      roas: (2.5 + Math.random() * 3).toFixed(1),
      cpc: (0.3 + Math.random() * 0.8).toFixed(2),
      impressions: (8000 + Math.random() * 15000).toFixed(0),
      clics: (400 + Math.random() * 600).toFixed(0),
      ctr: (2 + Math.random() * 4).toFixed(1),
      abonnes: (1200 + w * 45 + Math.random() * 50).toFixed(0),
      engagement: (3 + Math.random() * 4).toFixed(1),
      portee: (3000 + Math.random() * 5000).toFixed(0),
      publications: (5 + Math.random() * 8).toFixed(0),
      partages: (20 + Math.random() * 40).toFixed(0),
      commentaires: (30 + Math.random() * 50).toFixed(0),
      envoyes: (800 + Math.random() * 400).toFixed(0),
      taux_ouverture: (22 + Math.random() * 15).toFixed(1),
      taux_clic: (3 + Math.random() * 4).toFixed(1),
      desabonnements: (2 + Math.random() * 8).toFixed(0),
      liste_contacts: (2400 + w * 30 + Math.random() * 50).toFixed(0),
      revenu_email: (600 + Math.random() * 900).toFixed(0),
      inscrits_lancement: (50 + Math.random() * 80).toFixed(0),
      ventes_lancement: (8 + Math.random() * 15).toFixed(0),
      ca_lancement: (1500 + Math.random() * 3000).toFixed(0),
      taux_conversion_lancement: (8 + Math.random() * 12).toFixed(1),
      pages_vues: (1200 + Math.random() * 2000).toFixed(0),
      leads: (30 + Math.random() * 60).toFixed(0),
    });
  }
  return weeks;
}

/* ─────────────────────────────────────────────
   FORMAT HELPERS
   ───────────────────────────────────────────── */
function fmt(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return val || "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 10_000) return (n / 1_000).toFixed(1) + "k";
  if (n >= 1_000) return n.toLocaleString("fr-FR");
  if (n % 1 !== 0) return n.toFixed(1);
  return String(n);
}

function trend(curr, prev) {
  const a = parseFloat(curr), b = parseFloat(prev);
  if (isNaN(a) || isNaN(b) || b === 0) return null;
  return (((a - b) / Math.abs(b)) * 100).toFixed(1);
}

/* ─────────────────────────────────────────────
   HEALTH SCORE
   ───────────────────────────────────────────── */
function computeHealth(row, prevRow) {
  if (!row || !prevRow) return 72;
  const checks = [
    { curr: row.ca, prev: prevRow.ca, w: 25 },
    { curr: row.taux_conversion, prev: prevRow.taux_conversion, w: 20 },
    { curr: row.engagement, prev: prevRow.engagement, w: 15 },
    { curr: row.taux_ouverture, prev: prevRow.taux_ouverture, w: 15 },
    { curr: row.roas, prev: prevRow.roas, w: 15 },
    { curr: row.abonnes, prev: prevRow.abonnes, w: 10 },
  ];
  let score = 50;
  checks.forEach(({ curr, prev, w }) => {
    const t = trend(curr, prev);
    if (t === null) return;
    const delta = parseFloat(t);
    score += Math.max(-w, Math.min(w, delta * (w / 10)));
  });
  return Math.max(0, Math.min(100, Math.round(score)));
}

/* ─────────────────────────────────────────────
   STYLES
   ───────────────────────────────────────────── */
const S = {
  app: {
    background: T.bg,
    minHeight: "100vh",
    fontFamily: T.font,
    color: T.text,
    maxWidth: 1200,
    margin: "0 auto",
    padding: "0 12px",
  },
  /* Header */
  header: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: `linear-gradient(180deg, ${T.bg} 85%, transparent)`,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  logo: {
    fontFamily: T.mono,
    fontSize: 18,
    fontWeight: 700,
    color: T.accent,
    letterSpacing: "-0.5px",
  },
  clientName: {
    fontSize: 13,
    color: T.textDim,
    fontWeight: 500,
  },
  healthBadge: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: T.accentDim,
    borderRadius: 20,
    padding: "6px 14px",
  },
  healthScore: {
    fontFamily: T.mono,
    fontSize: 20,
    fontWeight: 800,
    color: T.accent,
  },
  healthLabel: {
    fontSize: 10,
    color: T.textDim,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  /* Period nav */
  periodNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  arrowBtn: {
    background: "none",
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.textDim,
    fontSize: 16,
    width: 32,
    height: 32,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all .2s",
  },
  periodLabel: {
    fontFamily: T.mono,
    fontSize: 13,
    color: T.text,
    minWidth: 120,
    textAlign: "center",
  },
  modeToggle: {
    display: "flex",
    background: T.card,
    borderRadius: 8,
    overflow: "hidden",
    border: `1px solid ${T.border}`,
  },
  modeBtn: (active) => ({
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    background: active ? T.accent : "transparent",
    color: active ? T.bg : T.textDim,
    transition: "all .2s",
  }),
  /* Tabs */
  tabRow: {
    display: "flex",
    gap: 4,
    overflowX: "auto",
    paddingBottom: 6,
    marginBottom: 14,
    scrollbarWidth: "none",
  },
  tab: (active) => ({
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    background: active ? T.accent : T.card,
    color: active ? T.bg : T.textDim,
    transition: "all .25s",
    flexShrink: 0,
  }),
  /* KPI Cards */
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  card: {
    background: T.card,
    borderRadius: T.radius,
    padding: "16px 14px",
    border: `1px solid ${T.border}`,
    transition: "all .25s",
    position: "relative",
    overflow: "hidden",
  },
  cardIcon: {
    fontSize: 18,
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11,
    color: T.textDim,
    marginBottom: 4,
    fontWeight: 500,
  },
  cardValue: {
    fontFamily: T.mono,
    fontSize: 22,
    fontWeight: 800,
    color: T.text,
    lineHeight: 1.1,
  },
  cardTrend: (positive) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    marginTop: 6,
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: T.mono,
    background: positive ? "rgba(200,244,100,.12)" : "rgba(255,107,107,.12)",
    color: positive ? T.accent : T.red,
  }),
  /* Chart */
  chartWrap: {
    background: T.card,
    borderRadius: T.radius,
    padding: "16px 8px 8px",
    border: `1px solid ${T.border}`,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: T.textDim,
    marginBottom: 12,
    paddingLeft: 8,
  },
  /* AI tab */
  aiWrap: {
    background: T.card,
    borderRadius: T.radius,
    padding: 20,
    border: `1px solid ${T.border}`,
    marginBottom: 24,
  },
  aiBtn: (loading) => ({
    width: "100%",
    padding: "14px 0",
    borderRadius: 10,
    border: "none",
    cursor: loading ? "wait" : "pointer",
    background: loading ? T.textDim : T.accent,
    color: T.bg,
    fontFamily: T.font,
    fontSize: 15,
    fontWeight: 700,
    letterSpacing: "0.3px",
    transition: "all .2s",
    opacity: loading ? 0.7 : 1,
  }),
  aiResult: {
    marginTop: 16,
    padding: 16,
    background: T.bg,
    borderRadius: 10,
    fontSize: 13,
    lineHeight: 1.7,
    color: T.text,
    whiteSpace: "pre-wrap",
    maxHeight: 420,
    overflowY: "auto",
  },
  /* Loading & Error */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: `3px solid ${T.border}`,
    borderTopColor: T.accent,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "rgba(255,107,107,.08)",
    border: `1px solid rgba(255,107,107,.25)`,
    borderRadius: T.radius,
    padding: 24,
    textAlign: "center",
    margin: "40px 12px",
  },
};

/* inject keyframes + responsive overrides */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{background:${T.bg};overflow-x:hidden}
::-webkit-scrollbar{height:4px;width:4px}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
.card-anim{animation:fadeUp .4s ease both}
.card-anim:nth-child(2){animation-delay:.05s}
.card-anim:nth-child(3){animation-delay:.1s}
.card-anim:nth-child(4){animation-delay:.15s}
.card-anim:nth-child(5){animation-delay:.2s}
.card-anim:nth-child(6){animation-delay:.25s}
@media(min-width:640px){
  .card-grid-responsive{grid-template-columns:repeat(3,1fr)!important;gap:14px!important}
  .chart-responsive{padding:20px 16px 12px!important}
  .header-responsive{padding-top:20px!important}
}
@media(min-width:768px){
  .card-grid-responsive{gap:16px!important}
}
`;

/* ─────────────────────────────────────────────
   COMPONENTS
   ───────────────────────────────────────────── */

function HealthRing({ score }) {
  const r = 20, c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color = score >= 65 ? T.accent : score >= 40 ? "#FFBE5C" : T.red;
  return (
    <div style={S.healthBadge}>
      <svg width={52} height={52} viewBox="0 0 52 52">
        <circle cx={26} cy={26} r={r} fill="none" stroke={T.border} strokeWidth={4} />
        <circle
          cx={26} cy={26} r={r} fill="none" stroke={color} strokeWidth={4}
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 26 26)" style={{ transition: "stroke-dashoffset .8s ease" }}
        />
        <text x={26} y={28} textAnchor="middle" fill={color} fontSize={14}
          fontWeight={800} fontFamily={T.mono}>{score}</text>
      </svg>
      <div>
        <div style={{ ...S.healthLabel }}>Score</div>
        <div style={{ ...S.healthLabel }}>Santé</div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, suffix, prefix, trendVal }) {
  const t = trendVal !== null ? parseFloat(trendVal) : null;
  const pos = t !== null && t >= 0;
  return (
    <div className="card-anim" style={S.card}>
      <div style={S.cardIcon}>{icon}</div>
      <div style={S.cardLabel}>{label}</div>
      <div style={S.cardValue}>
        {prefix}{fmt(value)}{suffix && <span style={{ fontSize: 14, color: T.textDim }}> {suffix}</span>}
      </div>
      {t !== null && (
        <div style={S.cardTrend(pos)}>
          {pos ? "▲" : "▼"} {pos ? "+" : ""}{trendVal}%
        </div>
      )}
    </div>
  );
}

function ChartSection({ data, kpis, activeTab }) {
  const mainKpi = kpis[0];
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => ({
    name: d._week || d._period || d._date || d._month || "",
    value: parseFloat(d[mainKpi.id]) || 0,
  }));
  return (
    <div className="chart-responsive" style={S.chartWrap}>
      <div style={S.chartTitle}>Évolution · {mainKpi.label}</div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${activeTab}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={T.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={T.border} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{
              background: T.card, border: `1px solid ${T.border}`,
              borderRadius: 8, fontFamily: T.mono, fontSize: 12, color: T.text,
            }}
            labelStyle={{ color: T.textDim }}
          />
          <Area
            type="monotone" dataKey="value" stroke={T.accent} strokeWidth={2.5}
            fill={`url(#grad-${activeTab})`} dot={false} activeDot={{ r: 4, fill: T.accent }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function AITab({ data, periodIdx }) {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analyze = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    setResult("");

    const current = data[periodIdx];
    const previous = periodIdx > 0 ? data[periodIdx - 1] : null;
    const prompt = `Tu es un analyste e-commerce expert. Voici les KPIs de la période "${current._week || current._period || current._month || `Période ${periodIdx + 1}`}" :\n\n${JSON.stringify(current, null, 2)}\n\n${previous ? `Période précédente :\n${JSON.stringify(previous, null, 2)}\n\n` : ""}Fais une analyse courte et percutante en français :\n1. Points forts (max 3)\n2. Alertes (max 3)\n3. Actions recommandées (max 3)\n\nSois concis, utilise des emojis, et donne des chiffres précis.`;

    try {
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const json = await resp.json();
      const text = json.content?.map((b) => b.text || "").join("\n") || "Pas de réponse.";
      setResult(text);
    } catch (e) {
      setError("Erreur lors de l'appel à l'IA. Vérifie ta connexion ou réessaie.");
    } finally {
      setLoading(false);
    }
  }, [data, periodIdx, loading]);

  return (
    <div style={S.aiWrap}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>🤖</span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Analyse IA</div>
          <div style={{ fontSize: 12, color: T.textDim }}>Powered by Claude</div>
        </div>
      </div>
      <button style={S.aiBtn(loading)} onClick={analyze} disabled={loading}>
        {loading ? "⏳ Analyse en cours..." : "✨ Analyser cette période"}
      </button>
      {error && <div style={{ marginTop: 12, color: T.red, fontSize: 13 }}>{error}</div>}
      {result && <div style={S.aiResult}>{result}</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN APP
   ───────────────────────────────────────────── */
export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [activeTab, setActiveTab] = useState("ventes");
  const [mode, setMode] = useState("semaine"); // semaine | mois
  const [periodIdx, setPeriodIdx] = useState(0);
  const [clientName] = useState("Mon Client");

  /* Fetch CSV data */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url =
          "https://docs.google.com/spreadsheets/d/e/2PACX-1vRMYlJvBw-7oHxTO-ID3O7lT9KjQpLDsrb9hnmMPNxYsjriuvlly9oMfSESS7AxCQ/pub?output=csv";
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        const rows = parseCSV(text);
        if (!cancelled) {
          if (rows.length === 0) throw new Error("Aucune donnée trouvée dans le CSV.");
          setData(rows);
          setPeriodIdx(rows.length - 1);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("Fetch failed, using demo data:", e.message);
          const demo = generateDemoData();
          setData(demo);
          setPeriodIdx(demo.length - 1);
          setFetchError(
            "⚠️ Impossible de charger le Google Sheet. Données de démo affichées. Vérifie le lien du Google Sheet ou ta connexion réseau."
          );
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Inject global styles */
  useEffect(() => {
    const id = "flowboard-css";
    if (!document.getElementById(id)) {
      const tag = document.createElement("style");
      tag.id = id;
      tag.textContent = GLOBAL_CSS;
      document.head.appendChild(tag);
    }
  }, []);

  const current = data[periodIdx] || {};
  const prev = periodIdx > 0 ? data[periodIdx - 1] : null;
  const health = useMemo(() => computeHealth(current, prev), [current, prev]);

  const kpis = KPI_CONFIG[activeTab] || [];

  if (loading) {
    return (
      <div style={{ ...S.app, ...S.loadingWrap }}>
        <div style={S.spinner} />
        <div style={{ color: T.textDim, fontSize: 14 }}>Chargement des données…</div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      {/* ── HEADER ── */}
      <header className="header-responsive" style={S.header}>
        <div style={S.headerTop}>
          <div>
            <div style={S.logo}>FlowBoard</div>
            <div style={S.clientName}>{clientName}</div>
          </div>
          <HealthRing score={health} />
        </div>

        {/* Period navigation */}
        <div style={S.periodNav}>
          <button
            style={S.arrowBtn}
            onClick={() => setPeriodIdx((i) => Math.max(0, i - 1))}
            disabled={periodIdx === 0}
          >
            ◀
          </button>
          <div style={S.periodLabel}>
            {current._week || current._period || current._month || current._date || `Période ${periodIdx + 1}`}
          </div>
          <button
            style={S.arrowBtn}
            onClick={() => setPeriodIdx((i) => Math.min(data.length - 1, i + 1))}
            disabled={periodIdx === data.length - 1}
          >
            ▶
          </button>
          <div style={S.modeToggle}>
            <button style={S.modeBtn(mode === "semaine")} onClick={() => setMode("semaine")}>Semaine</button>
            <button style={S.modeBtn(mode === "mois")} onClick={() => setMode("mois")}>Mois</button>
          </div>
        </div>

        {/* Error banner */}
        {fetchError && (
          <div style={{
            background: "rgba(255,190,92,.1)", border: "1px solid rgba(255,190,92,.25)",
            borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#FFBE5C", marginBottom: 8,
          }}>
            {fetchError}
          </div>
        )}

        {/* Tabs */}
        <div style={S.tabRow}>
          {TABS.map((t) => (
            <button key={t.key} style={S.tab(activeTab === t.key)} onClick={() => setActiveTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
          <button style={S.tab(activeTab === "ia")} onClick={() => setActiveTab("ia")}>
            🤖 IA
          </button>
        </div>
      </header>

      {/* ── CONTENT ── */}
      {activeTab === "ia" ? (
        <AITab data={data} periodIdx={periodIdx} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="card-grid-responsive" style={S.cardGrid} key={`${activeTab}-${periodIdx}`}>
            {kpis.map((kpi) => (
              <KPICard
                key={kpi.id}
                icon={kpi.icon}
                label={kpi.label}
                value={current[kpi.id]}
                prefix={kpi.prefix}
                suffix={kpi.suffix}
                trendVal={prev ? trend(current[kpi.id], prev[kpi.id]) : null}
              />
            ))}
          </div>

          {/* Chart */}
          <ChartSection data={data} kpis={kpis} activeTab={activeTab} />
        </>
      )}

      {/* Footer */}
      <div style={{
        textAlign: "center", padding: "16px 0 32px", fontSize: 11,
        color: T.textDim, fontFamily: T.mono,
      }}>
        FlowBoard · Built with ♥ by Les Fées de l'IA
      </div>
    </div>
  );
}
