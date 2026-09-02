// src/components/matching/matching-dashboard.tsx
"use client";

import { useState } from "react";
import {
  GitMerge, AlertTriangle, CheckCircle2, XCircle, Clock,
  ChevronRight, Loader2, RefreshCw, Eye, Shield, ArrowRight, Check, X,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { RISK_COLORS, STATUS_COLORS, CHART_STATUS, CHART_SERIES } from "@/lib/chart-theme";

// ─── Demo data ───

const DEMO_MATCHES = [
  {
    id: "match-0001", score: 92, type: "exact_duplicate", confidence: "high", status: "pending",
    propertyA: { id: "prop-002", title: "Survey 118, Hinjewadi", survey: "S.No.299/12", status: "FLAGGED", price: 12500000, area: 5200, village: "Hinjewadi", owner: "Sunil Deshmukh", broker: "Rahul Joshi" },
    propertyB: { id: "prop-dup-001", title: "Survey 118, Hinjawadi (Relisted)", survey: "S.No.299/12", status: "FLAGGED", price: 11800000, area: 5200, village: "Hinjawadi", owner: "Unknown", broker: "Nitin Kale" },
    factors: [
      { name: "Survey number", score: 100, detail: "Exact match — S.No.299/12" },
      { name: "Village", score: 92, detail: '"Hinjewadi" ≈ "Hinjawadi" — spelling variant' },
      { name: "Area", score: 100, detail: "5,200 sq ft — identical" },
      { name: "Coordinates", score: 100, detail: "12 meters apart" },
      { name: "Price", score: 70, detail: "₹1.25 Cr vs ₹1.18 Cr — Δ5.8%" },
      { name: "Owner", score: 0, detail: '"Sunil Deshmukh" vs "Unknown" — no match' },
    ],
    createdAt: "15 Jul 2026",
  },
  {
    id: "match-0004", score: 58, type: "conflict", confidence: "medium", status: "pending",
    propertyA: { id: "prop-002", title: "Survey 118, Hinjewadi", survey: "S.No.299/12", status: "FLAGGED", price: 12500000, area: 5200, village: "Hinjewadi", owner: "Sunil Deshmukh", broker: "Rahul Joshi" },
    propertyB: { id: "prop-004", title: "Farm Plot, Mulshi", survey: "118/2A", status: "LISTED", price: 21000000, area: 43560, village: "Pirangut", owner: "Vitthal Pawar", broker: "Sachin More" },
    factors: [
      { name: "Survey number", score: 85, detail: '"299/12" vs "118/2A" — partial match on "118"' },
      { name: "Owner", score: 0, detail: "Different owners — possible ownership conflict" },
      { name: "Village", score: 0, detail: "Different villages (Hinjewadi vs Pirangut)" },
      { name: "Area", score: 0, detail: "5,200 vs 43,560 sq ft — major discrepancy" },
      { name: "Price", score: 0, detail: "₹1.25 Cr vs ₹2.1 Cr" },
      { name: "Coordinates", score: 30, detail: "~15 km apart" },
    ],
    createdAt: "22 Jul 2026",
  },
  {
    id: "match-0002", score: 52, type: "possible_match", confidence: "medium", status: "dismissed",
    propertyA: { id: "prop-001", title: "Plot 42, Kharadi", survey: "42/3A", status: "VERIFIED", price: 4800000, area: 2400, village: "Kharadi", owner: "Amit Patil", broker: "Vinod Deshmukh" },
    propertyB: { id: "prop-006", title: "Row House 12, Undri", survey: "496/2C", status: "DRAFT", price: 9500000, area: 1800, village: "Undri", owner: "Savita Jadhav", broker: "Nitin Kale" },
    factors: [
      { name: "Survey number", score: 0, detail: "No match" },
      { name: "Owner", score: 70, detail: "Partial last name similarity" },
      { name: "Village", score: 0, detail: "Different villages" },
      { name: "Area", score: 50, detail: "2,400 vs 1,800 sq ft" },
      { name: "Price", score: 40, detail: "₹48L vs ₹95L" },
      { name: "Coordinates", score: 70, detail: "~6 km apart" },
    ],
    createdAt: "15 Jul 2026",
  },
];

// ─── Config — colors reused verbatim from the chart-theme design system ───

const MUTED = "rgba(244,246,250,0.35)";

const TYPE_CFG: Record<string, { label: string; color: string; icon: any }> = {
  exact_duplicate: { label: "Exact duplicate", color: RISK_COLORS.CRITICAL, icon: AlertTriangle },
  likely_duplicate: { label: "Likely duplicate", color: RISK_COLORS.HIGH, icon: AlertTriangle },
  possible_match: { label: "Possible match", color: RISK_COLORS.MODERATE, icon: Eye },
  conflict: { label: "Ownership conflict", color: CHART_SERIES[6], icon: Shield },
  no_match: { label: "No match", color: MUTED, icon: Check },
};

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending review", color: STATUS_COLORS.PENDING },
  confirmed: { label: "Confirmed", color: STATUS_COLORS.FLAGGED },
  dismissed: { label: "Dismissed", color: MUTED },
  resolved: { label: "Resolved", color: STATUS_COLORS.VERIFIED },
};

const formatPrice = (n: number) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(0)} L`);

// Overall match score reads like a risk score: a high score means these two
// listings are very likely the same property (duplicate/conflict risk).
function matchScoreColor(score: number) {
  if (score >= 80) return RISK_COLORS.CRITICAL;
  if (score >= 50) return RISK_COLORS.HIGH;
  return RISK_COLORS.LOW;
}

// Per-factor score reads like a confidence score: a high score means strong
// agreement between the two records on that specific attribute.
function factorScoreColor(score: number) {
  if (score >= 80) return CHART_STATUS.good;
  if (score >= 50) return CHART_STATUS.warning;
  if (score > 0) return CHART_STATUS.serious;
  return MUTED;
}

// Applies alpha to either a "#rrggbb" hex color or an existing rgba(...) string.
function withAlpha(color: string, alpha: number) {
  if (color.startsWith("rgba")) return color.replace(/[\d.]+\)$/, `${alpha})`);
  if (color.startsWith("#") && color.length === 7) {
    const a = Math.round(alpha * 255).toString(16).padStart(2, "0");
    return `${color}${a}`;
  }
  return color;
}

// ─── Component ───

export default function MatchingDashboard() {
  const [matches, setMatches] = useState(DEMO_MATCHES);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [filter, setFilter] = useState("all");
  const [scanResult, setScanResult] = useState<{ count: number; time: number } | null>(null);

  async function runScan() {
    setScanning(true);
    setScanResult(null);
    // Simulate matching scan
    await new Promise((r) => setTimeout(r, 2500));
    setScanResult({ count: 4, time: 2.3 });
    setScanning(false);
  }

  function resolveMatch(matchId: string, action: "confirmed" | "dismissed") {
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, status: action } : m)));
    setExpanded(null);
  }

  const filtered = filter === "all" ? matches : matches.filter((m) => (filter === "pending" ? m.status === "pending" : m.type === filter));
  const pendingCount = matches.filter((m) => m.status === "pending").length;

  const filterChips = [
    { key: "all", label: `All (${matches.length})` },
    { key: "pending", label: `Pending (${pendingCount})` },
    { key: "exact_duplicate", label: "Duplicates" },
    { key: "conflict", label: "Conflicts" },
    { key: "possible_match", label: "Possible" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-extrabold text-platinum tracking-tight flex items-center gap-2.5">
            <span className="pi-icon-tile w-9 h-9 text-platinum/80">
              <GitMerge className="w-5 h-5" />
            </span>
            Matching Engine
          </h1>
          <p className="text-xs text-platinum/45 mt-1">
            Cross-reference properties · Detect duplicates · Flag conflicts
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="pi-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-sora font-bold text-xs uppercase tracking-wider disabled:opacity-60"
        >
          {scanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Run Full Scan
            </>
          )}
        </button>
      </div>

      {/* Scan result banner */}
      {scanResult && (
        <div className="pi-fade-up flex items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 text-xs">
          <span className="text-emerald-300 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            Scan complete — {scanResult.count} matches found across all properties in {scanResult.time}s
          </span>
          <button
            onClick={() => setScanResult(null)}
            aria-label="Dismiss scan result"
            className="pi-icon-btn p-1 rounded-lg text-platinum/40 flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Matches"
          value={matches.length}
          icon={<GitMerge className="w-5 h-5 text-platinum/80" />}
          subtitle="Across scanned properties"
          badgeText="All"
          badgeVariant="brand"
        />
        <StatCard
          title="Pending Review"
          value={pendingCount}
          icon={<Clock className="w-5 h-5 text-amber-400" />}
          subtitle="Awaiting admin action"
          badgeText="Pending"
          badgeVariant="warning"
        />
        <StatCard
          title="Exact Duplicates"
          value={matches.filter((m) => m.type === "exact_duplicate").length}
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
          subtitle="High-confidence duplicates"
          badgeText="Critical"
          badgeVariant="error"
        />
        <StatCard
          title="Conflicts"
          value={matches.filter((m) => m.type === "conflict").length}
          icon={<Shield className="w-5 h-5 text-violet-400" />}
          subtitle="Ownership disputes"
          badgeText="Legal"
          badgeVariant="brand"
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-150 ${
              filter === f.key
                ? "bg-white/[0.12] text-platinum border-white/[0.2]"
                : "bg-transparent text-platinum/45 border-white/[0.08] hover:text-platinum/80 hover:border-white/[0.16]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Match list */}
      <div className="space-y-3">
        {filtered.map((match, i) => {
          const tcfg = TYPE_CFG[match.type] || TYPE_CFG.no_match;
          const scfg = STATUS_CFG[match.status] || STATUS_CFG.pending;
          const isExpanded = expanded === match.id;
          const mColor = matchScoreColor(match.score);

          return (
            <div
              key={match.id}
              className="pi-card pi-card-interactive pi-fade-up overflow-hidden"
              style={{
                animationDelay: `${i * 0.05}s`,
                borderColor: isExpanded ? "rgba(255,255,255,0.2)" : undefined,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                onClick={() => setExpanded(isExpanded ? null : match.id)}
              >
                {/* Score circle */}
                <div
                  className="w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: mColor, background: withAlpha(mColor, 0.12) }}
                >
                  <span className="font-sora text-base font-extrabold" style={{ color: mColor }}>
                    {match.score}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                      className="pi-pill text-[10.5px] px-2.5 py-0.5 border-transparent"
                      style={{ background: withAlpha(tcfg.color, 0.14), color: tcfg.color }}
                    >
                      <tcfg.icon className="w-3 h-3" /> {tcfg.label}
                    </span>
                    <span
                      className="pi-pill text-[10.5px] px-2.5 py-0.5 border-transparent"
                      style={{ background: withAlpha(scfg.color, 0.14), color: scfg.color }}
                    >
                      {scfg.label}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-platinum flex items-center gap-2 flex-wrap">
                    <span className="truncate">{match.propertyA.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-platinum/30 flex-shrink-0" />
                    <span className="truncate">{match.propertyB.title}</span>
                  </div>
                  <div className="text-[11px] font-mono text-platinum/35 mt-1.5">
                    S.No. {match.propertyA.survey} vs {match.propertyB.survey} · Found {match.createdAt}
                  </div>
                </div>

                <ChevronRight
                  className={`w-4 h-4 text-platinum/35 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                />
              </div>

              {/* Expanded: comparison + factors */}
              {isExpanded && (
                <div className="pi-fade-up border-t border-white/[0.08]">
                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] border-b border-white/[0.08]">
                    <div className="p-5">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-platinum/35 mb-2">
                        Property A
                      </div>
                      <div className="font-sora font-bold text-platinum mb-2">{match.propertyA.title}</div>
                      {(
                        [
                          ["Survey", match.propertyA.survey],
                          ["Owner", match.propertyA.owner],
                          ["Village", match.propertyA.village],
                          ["Area", `${match.propertyA.area.toLocaleString()} sq ft`],
                          ["Price", formatPrice(match.propertyA.price)],
                          ["Broker", match.propertyA.broker],
                        ] as const
                      ).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 text-xs">
                          <span className="text-platinum/40">{k}</span>
                          <span className="text-platinum/80 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="hidden sm:flex items-center justify-center px-2">
                      <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-platinum/50">
                        VS
                      </span>
                    </div>
                    <div className="p-5 border-t sm:border-t-0 sm:border-l border-white/[0.08]">
                      <div className="text-[10.5px] font-bold uppercase tracking-wider text-platinum/35 mb-2">
                        Property B
                      </div>
                      <div className="font-sora font-bold text-platinum mb-2">{match.propertyB.title}</div>
                      {(
                        [
                          ["Survey", match.propertyB.survey],
                          ["Owner", match.propertyB.owner],
                          ["Village", match.propertyB.village],
                          ["Area", `${match.propertyB.area.toLocaleString()} sq ft`],
                          ["Price", formatPrice(match.propertyB.price)],
                          ["Broker", match.propertyB.broker],
                        ] as const
                      ).map(([k, v]) => (
                        <div key={k} className="flex justify-between py-1 text-xs">
                          <span className="text-platinum/40">{k}</span>
                          <span className="text-platinum/80 font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Factor breakdown */}
                  <div className="p-5">
                    <div className="text-xs font-bold uppercase tracking-wider text-platinum/50 mb-3.5">
                      Match Factors
                    </div>
                    {match.factors.map((f, fi) => {
                      const fColor = factorScoreColor(f.score);
                      return (
                        <div key={fi} className="mb-3.5 last:mb-0">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-platinum/55">{f.name}</span>
                            <span className="font-mono font-bold" style={{ color: fColor }}>
                              {f.score}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-500"
                              style={{ width: `${f.score}%`, background: fColor }}
                            />
                          </div>
                          <div className="text-[11px] text-platinum/35 mt-1.5">{f.detail}</div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  {match.status === "pending" && (
                    <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-t border-white/[0.08] flex-wrap">
                      <div className="text-xs text-platinum/45 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        {match.type === "exact_duplicate"
                          ? "This property appears to be listed twice by different brokers"
                          : match.type === "conflict"
                            ? "Same survey number with different owners — possible ownership conflict"
                            : "Review the factors above to determine if this is a genuine match"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveMatch(match.id, "dismissed");
                          }}
                          className="pi-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-platinum/65"
                        >
                          <X className="w-3.5 h-3.5" /> Dismiss
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveMatch(match.id, "confirmed");
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:brightness-110"
                          style={{
                            background: withAlpha(RISK_COLORS.CRITICAL, 0.12),
                            color: "#ef8a8a",
                            borderColor: withAlpha(RISK_COLORS.CRITICAL, 0.3),
                          }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Confirm Match
                        </button>
                      </div>
                    </div>
                  )}

                  {match.status !== "pending" && (
                    <div className="flex items-center gap-2 px-5 py-3 border-t border-white/[0.08] text-xs text-platinum/40">
                      {match.status === "dismissed" ? (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Dismissed by admin
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" /> Confirmed as duplicate — flagged for review
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-500/[0.05] border border-amber-500/20 text-xs text-platinum/55 leading-relaxed">
        <strong className="text-amber-400 font-semibold">Important:</strong> Matches are algorithmic suggestions, not
        legal determinations. The system identifies <em>potential</em> matches for human review. It never claims
        ownership or makes legal assertions. All matches should be verified through official channels before taking
        action.
      </div>
    </div>
  );
}
