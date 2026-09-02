// src/components/analytics/analytics-dashboard.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import {
  Building2, CheckCircle2, AlertTriangle, Clock, Scale, Newspaper, GitMerge, Bell,
  Download, RefreshCw, Loader2, Bot, TrendingUp, Users, Activity, Zap, ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { CHART_SERIES, CHART_STATUS, RISK_COLORS, STATUS_COLORS } from "@/lib/chart-theme";

// ─── Counter hook ───
function useCounter(end: number, dur = 1800) {
  const [v, setV] = useState(0);
  const ref = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!end) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / dur, 1);
      setV(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current!);
  }, [end, dur]);
  return v;
}

// ─── Demo data ───
const TREND = [
  { period: "Jan", properties: 42, verified: 28, flagged: 4 },
  { period: "Feb", properties: 55, verified: 35, flagged: 5 },
  { period: "Mar", properties: 61, verified: 42, flagged: 3 },
  { period: "Apr", properties: 78, verified: 55, flagged: 6 },
  { period: "May", properties: 89, verified: 67, flagged: 4 },
  { period: "Jun", properties: 97, verified: 74, flagged: 7 },
  { period: "Jul", properties: 112, verified: 89, flagged: 5 },
];

const STATUS_DIST = [
  { label: "Verified", value: 20, color: STATUS_COLORS.VERIFIED },
  { label: "Listed", value: 23, color: STATUS_COLORS.LISTED },
  { label: "Under review", value: 20, color: STATUS_COLORS.UNDER_VERIFICATION },
  { label: "Flagged", value: 10, color: STATUS_COLORS.FLAGGED },
  { label: "Draft", value: 20, color: STATUS_COLORS.DRAFT },
  { label: "Archived", value: 7, color: STATUS_COLORS.DISPOSED },
];

const RISK_DIST = [
  { label: "Minimal", value: 20, color: RISK_COLORS.MINIMAL },
  { label: "Low", value: 30, color: RISK_COLORS.LOW },
  { label: "Moderate", value: 15, color: RISK_COLORS.MODERATE },
  { label: "High", value: 10, color: RISK_COLORS.HIGH },
  { label: "Critical", value: 5, color: RISK_COLORS.CRITICAL },
];

const PRICE_RANGES = [
  { label: "<50L", value: 8, color: CHART_SERIES[0] },
  { label: "50L-1Cr", value: 22, color: CHART_SERIES[0] },
  { label: "1-2Cr", value: 35, color: CHART_SERIES[0] },
  { label: "2-5Cr", value: 25, color: CHART_SERIES[0] },
  { label: "5Cr+", value: 10, color: CHART_SERIES[0] },
];

const AGENTS = [
  { agent: "OCR processor", tasks: 48, latency: "3.2s", success: 94, tokens: 0 },
  { agent: "Risk scoring", tasks: 80, latency: "1.8s", success: 98, tokens: 12400 },
  { agent: "News monitor", tasks: 14, latency: "4.5s", success: 91, tokens: 8200 },
  { agent: "Court scanner", tasks: 15, latency: "5.2s", success: 85, tokens: 5600 },
  { agent: "Matching engine", tasks: 80, latency: "2.1s", success: 97, tokens: 15800 },
  { agent: "Notification", tasks: 250, latency: "0.3s", success: 99, tokens: 0 },
];

const BROKERS = [
  { name: "Vinod Deshmukh", properties: 14, verified: 11 },
  { name: "Sachin More", properties: 12, verified: 9 },
  { name: "Rahul Joshi", properties: 10, verified: 6 },
  { name: "Amit Kumar", properties: 9, verified: 8 },
  { name: "Priya Joshi", properties: 8, verified: 7 },
];

const TALUKA = [
  { label: "Haveli", value: 35, color: CHART_SERIES[0] },
  { label: "Mulshi", value: 18, color: CHART_SERIES[1] },
  { label: "Maval", value: 12, color: CHART_SERIES[2] },
  { label: "Baramati", value: 8, color: CHART_SERIES[3] },
  { label: "Khed", value: 7, color: CHART_SERIES[4] },
  { label: "Shirur", value: 6, color: CHART_SERIES[5] },
  { label: "Other", value: 14, color: "rgba(244,246,250,0.25)" },
];

// ─── Custom tooltip ───
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "rgba(14,15,19,0.92)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 14px", boxShadow: "0 20px 44px -16px rgba(0,0,0,0.7)" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(244,246,250,0.62)", marginBottom: 4 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ fontSize: 12.5, fontWeight: 600, color: "#F4F6FA", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
}

// ─── Component ───
export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { setTimeout(() => setLoading(false), 1200); }, []);

  const propCount = useCounter(loading ? 0 : 147);
  const verifiedCount = useCounter(loading ? 0 : 89);
  const highRiskCount = useCounter(loading ? 0 : 7);
  const pendingCount = useCounter(loading ? 0 : 23);

  async function handleExport() {
    setExporting(true);
    await new Promise(r => setTimeout(r, 1500));
    setExporting(false);
    // In production: window.open("/api/analytics?export=csv")
    alert("CSV exported — propintel-analytics-2026-08-03.csv");
  }

  const grid = "rgba(244,246,250,0.07)";
  const tick = { fill: "rgba(244,246,250,0.38)", fontSize: 11 };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif", color: "#F4F6FA" }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .fade-up{animation:fadeUp 0.4s ease both}
        .skeleton{animation:pulse 1.8s ease-in-out infinite;background:rgba(255,255,255,0.05);border-radius:8px}
        .card{background:rgba(20,21,27,0.62);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,0.09);border-radius:18px;overflow:hidden;transition:border-color 0.2s, transform 0.2s;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px -28px rgba(0,0,0,0.75)}
        .card:hover{border-color:rgba(255,255,255,0.16)}
        .card-head{padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08);display:flex;justify-content:space-between;align-items:center}
        .card-head *{font-family:'Sora',sans-serif}
        .metric{background:rgba(20,21,27,0.62);backdrop-filter:blur(20px) saturate(140%);-webkit-backdrop-filter:blur(20px) saturate(140%);border:1px solid rgba(255,255,255,0.09);border-radius:18px;padding:20px;position:relative;overflow:hidden;transition:all 0.2s;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06), 0 20px 50px -28px rgba(0,0,0,0.75)}
        .metric:hover{border-color:rgba(255,255,255,0.18);transform:translateY(-2px)}
        .metric::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--ac),transparent);opacity:0;transition:opacity 0.3s}
        .metric:hover::after{opacity:0.6}
        .tbl{width:100%;border-collapse:separate;border-spacing:0}
        .tbl th{text-align:left;padding:10px 16px;font-size:10.5px;font-weight:700;color:rgba(244,246,250,0.4);border-bottom:1px solid rgba(255,255,255,0.08);text-transform:uppercase;letter-spacing:0.06em}
        .tbl td{padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.05);font-size:13px}
        .tbl tbody tr:hover{background:rgba(255,255,255,0.03)}
        .btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03);color:rgba(244,246,250,0.6);transition:all 0.15s}
        .btn:hover{background:rgba(255,255,255,0.07);color:#F4F6FA;border-color:rgba(255,255,255,0.2)}
        .spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, fontFamily: "'Sora',sans-serif", letterSpacing: "-0.02em" }}>Analytics</h1>
          <p style={{ fontSize: 13, color: "rgba(244,246,250,0.45)", margin: "4px 0 0" }}>Platform performance and property intelligence metrics</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 size={14} className="spin" /> Exporting...</> : <><Download size={14} /> Export CSV</>}
          </button>
          <button className="btn" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1200); }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Total properties", value: propCount, delta: "+12 this month", up: true, Icon: Building2, color: CHART_SERIES[0] },
          { label: "Verified", value: verifiedCount, delta: `${Math.round(89/147*100)}% rate`, up: true, Icon: CheckCircle2, color: CHART_STATUS.good },
          { label: "High risk", value: highRiskCount, delta: "3 new flags", up: false, Icon: AlertTriangle, color: CHART_STATUS.critical },
          { label: "Pending OCR", value: pendingCount, delta: "~4 min avg", up: null, Icon: Clock, color: CHART_STATUS.warning },
        ].map((m, i) => (
          <div key={i} className={`metric ${loading ? "" : "fade-up"}`} style={{ animationDelay: `${i * 0.1}s`, "--ac": m.color } as any}>
            {loading ? (
              <><div className="skeleton" style={{ width: 80, height: 12, marginBottom: 12 }} /><div className="skeleton" style={{ width: 60, height: 32, marginBottom: 8 }} /><div className="skeleton" style={{ width: 100, height: 14 }} /></>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, color: "rgba(244,246,250,0.5)", fontWeight: 600 }}>{m.label}</span>
                  <div style={{ width: 34, height: 34, borderRadius: 10, background: `${m.color}1f`, display: "flex", alignItems: "center", justifyContent: "center" }}><m.Icon size={17} color={m.color} /></div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, marginTop: 8, fontVariantNumeric: "tabular-nums", fontFamily: "'Sora',sans-serif" }}>{m.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 4, color: m.up === true ? CHART_STATUS.good : m.up === false ? CHART_STATUS.critical : "rgba(244,246,250,0.45)" }}>
                  {m.up === true && <ArrowUpRight size={14} />}{m.up === false && <ArrowDownRight size={14} />}{m.up === null && <Clock size={13} />} {m.delta}
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Charts row 1 */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <div className="card fade-up" style={{ animationDelay: "0.3s" }}>
          <div className="card-head">
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>Property growth</div><div style={{ fontSize: 12, color: "rgba(244,246,250,0.4)", marginTop: 2, fontFamily: "'Inter',sans-serif" }}>Listed vs verified over 7 months</div></div>
            <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(244,246,250,0.55)", fontFamily: "'Inter',sans-serif" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_SERIES[0] }} />Listed</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "rgba(244,246,250,0.55)", fontFamily: "'Inter',sans-serif" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: CHART_STATUS.good }} />Verified</span>
            </div>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {loading ? <div className="skeleton" style={{ height: 200 }} /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={TREND}>
                  <defs>
                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_SERIES[0]} stopOpacity={0.22} /><stop offset="95%" stopColor={CHART_SERIES[0]} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CHART_STATUS.good} stopOpacity={0.22} /><stop offset="95%" stopColor={CHART_STATUS.good} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid stroke={grid} strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={tick} />
                  <YAxis axisLine={false} tickLine={false} tick={tick} width={30} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="properties" stroke={CHART_SERIES[0]} strokeWidth={2} fill="url(#gP)" name="Listed" dot={false} />
                  <Area type="monotone" dataKey="verified" stroke={CHART_STATUS.good} strokeWidth={2} fill="url(#gG)" name="Verified" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card fade-up" style={{ animationDelay: "0.4s" }}>
          <div className="card-head"><div style={{ fontWeight: 700, fontSize: 15 }}>Risk distribution</div></div>
          <div style={{ padding: 16 }}>
            {loading ? <div className="skeleton" style={{ height: 150 }} /> : (
              <>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart><Pie data={RISK_DIST} innerRadius={40} outerRadius={60} dataKey="value" cx="50%" cy="50%" stroke="none">{RISK_DIST.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", justifyContent: "center", marginTop: 8 }}>
                  {RISK_DIST.map(r => <span key={r.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "rgba(244,246,250,0.55)" }}><span style={{ width: 8, height: 8, borderRadius: 2, background: r.color }} />{r.label} {r.value}</span>)}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Charts row 2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        {[
          { title: "By status", data: STATUS_DIST },
          { title: "Price ranges", data: PRICE_RANGES },
          { title: "By taluka", data: TALUKA },
        ].map((chart, ci) => (
          <div key={ci} className="card fade-up" style={{ animationDelay: `${0.5 + ci * 0.1}s` }}>
            <div className="card-head"><span style={{ fontWeight: 700, fontSize: 14 }}>{chart.title}</span></div>
            <div style={{ padding: 16 }}>
              {loading ? <div className="skeleton" style={{ height: 160 }} /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chart.data} layout="vertical">
                    <CartesianGrid stroke={grid} strokeDasharray="4 4" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={tick} />
                    <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={tick} width={70} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16} name="Count">
                      {chart.data.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tables row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Agent performance */}
        <div className="card fade-up" style={{ animationDelay: "0.7s" }}>
          <div className="card-head">
            <span style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}><Bot size={16} color="#F4F6FA" /> Agent performance</span>
          </div>
          <table className="tbl">
            <thead><tr><th>Agent</th><th>Tasks</th><th>Avg latency</th><th>Success</th><th>Tokens</th></tr></thead>
            <tbody>
              {loading ? Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: 14 }} /></td></tr>
              )) : AGENTS.map((a, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{a.agent}</td>
                  <td>{a.tasks}</td>
                  <td style={{ fontVariantNumeric: "tabular-nums" }}>{a.latency}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                        <div style={{ width: `${a.success}%`, height: "100%", background: a.success >= 95 ? CHART_STATUS.good : a.success >= 85 ? CHART_STATUS.warning : CHART_STATUS.critical, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 12, color: a.success >= 95 ? CHART_STATUS.good : a.success >= 85 ? CHART_STATUS.warning : CHART_STATUS.critical }}>{a.success}%</span>
                    </div>
                  </td>
                  <td style={{ color: "rgba(244,246,250,0.4)", fontVariantNumeric: "tabular-nums" }}>{a.tokens > 0 ? a.tokens.toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top brokers */}
        <div className="card fade-up" style={{ animationDelay: "0.8s" }}>
          <div className="card-head">
            <span style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}><Users size={16} color="#F4F6FA" /> Top brokers</span>
          </div>
          <div style={{ padding: 0 }}>
            {BROKERS.map((b, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < BROKERS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#ffffff,#c7ccd6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#0c0d11", flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: "rgba(244,246,250,0.4)" }}>{b.properties} properties · {b.verified} verified</div>
                </div>
                <div style={{ width: 50, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div style={{ width: `${(b.properties / BROKERS[0].properties) * 100}%`, height: "100%", background: "#F4F6FA", borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
