"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-provider";
import { StatCard } from "@/components/ui/stat-card";
import { RiskBadge } from "@/components/ui/risk-badge";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Search,
  Filter,
  Eye,
  AlertTriangle,
  FileSearch,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import {
  RISK_COLORS,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
} from "@/lib/chart-theme";

export default function RiskAnalysisPage() {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");

  useEffect(() => {
    async function fetchRiskData() {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/risk-analysis", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Risk analysis fetch error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchRiskData();
  }, [getAccessToken]);

  const riskScores = data?.riskScores || [
    {
      id: "rs-1",
      overallScore: 73,
      riskLevel: "HIGH",
      aiNarrative: "HIGH RISK: Active civil litigation CS-2025/881 linked. Potential title overlap in Hinjewadi phase 1.",
      property: { id: "prop-002", title: "Survey 118, Hinjewadi", surveyNumber: "S.No.299/12", status: "FLAGGED", price: 12500000 },
    },
    {
      id: "rs-2",
      overallScore: 68,
      riskLevel: "HIGH",
      aiNarrative: "HIGH RISK: Duplicate survey number relisting detected.",
      property: { id: "prop-dup-001", title: "Survey 118, Hinjawadi (Relisted)", surveyNumber: "S.No.299/12", status: "FLAGGED", price: 11800000 },
    },
    {
      id: "rs-3",
      overallScore: 55,
      riskLevel: "MODERATE",
      aiNarrative: "MODERATE RISK: 7/12 extract name mismatch requiring manual revenue audit.",
      property: { id: "prop-008", title: "Land parcel, Baramati", surveyNumber: "S.No.150/3", status: "LISTED", price: 5500000 },
    },
    {
      id: "rs-4",
      overallScore: 47,
      riskLevel: "MODERATE",
      aiNarrative: "MODERATE RISK: Pending encumbrance clearance certificate.",
      property: { id: "prop-003", title: "Flat 7B, Baner Road", surveyNumber: "387/12C", status: "UNDER_VERIFICATION", price: 8200000 },
    },
    {
      id: "rs-5",
      overallScore: 18,
      riskLevel: "LOW",
      aiNarrative: "LOW RISK: Clear title deed, zero litigation records.",
      property: { id: "prop-001", title: "Plot 42, Kharadi", surveyNumber: "42/3A", status: "VERIFIED", price: 4800000 },
    },
  ];

  const distributionData = [
    { name: "Minimal", value: data?.distribution?.MINIMAL || 38, key: "MINIMAL" },
    { name: "Low", value: data?.distribution?.LOW || 25, key: "LOW" },
    { name: "Moderate", value: data?.distribution?.MODERATE || 12, key: "MODERATE" },
    { name: "High", value: data?.distribution?.HIGH || 6, key: "HIGH" },
    { name: "Critical", value: data?.distribution?.CRITICAL || 3, key: "CRITICAL" },
  ];

  const riskFactors = [
    { name: "Title Dispute & Litigation", category: "Legal", weight: 0.35, activeCases: 6 },
    { name: "7/12 & Revenue Record Mismatch", category: "Revenue", weight: 0.25, activeCases: 12 },
    { name: "Encumbrance & Mortgage Status", category: "Financial", weight: 0.20, activeCases: 8 },
    { name: "Zoning & Development Restrictions", category: "Regulatory", weight: 0.20, activeCases: 4 },
  ];

  const filteredScores = riskScores.filter((r: any) => {
    if (search && !r.property?.title?.toLowerCase().includes(search.toLowerCase()) && !r.property?.surveyNumber?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (levelFilter !== "All" && r.riskLevel !== levelFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-extrabold text-platinum tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
            AI Risk Intelligence Portal
          </h1>
          <p className="text-xs text-platinum/45">
            Portfolio risk exposure, automated title audit, and high-risk property watchlist
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="High Risk Count"
          value={data?.highRiskCount || 9}
          icon={<ShieldX className="w-5 h-5 text-rose-400" />}
          subtitle="Critical or High Risk properties"
          badgeText="Action Needed"
          badgeVariant="error"
        />
        <StatCard
          title="Moderate Risk Count"
          value={data?.distribution?.MODERATE || 12}
          icon={<ShieldAlert className="w-5 h-5 text-amber-400" />}
          subtitle="Requires revenue verification"
          badgeText="Review"
          badgeVariant="warning"
        />
        <StatCard
          title="Minimal/Low Risk Rate"
          value="75%"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
          subtitle="Clean title verification rate"
          badgeText="Clean"
          badgeVariant="success"
        />
        <StatCard
          title="Scored Factors"
          value="4 Models"
          icon={<FileSearch className="w-5 h-5 text-[#7fb0ee]" />}
          subtitle="Litigation, 7/12, Encumbrance, Zoning"
          badgeText="Active AI"
          badgeVariant="brand"
        />
      </div>

      {/* Risk Distribution Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="pi-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="font-sora text-base font-bold text-platinum mb-1">
              Portfolio Risk Breakdown
            </h3>
            <p className="text-xs text-platinum/40 mb-4">
              Distribution across 5 risk severity levels
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {distributionData.map((entry) => (
                    <Cell key={entry.key} fill={RISK_COLORS[entry.key]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                  itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.08] text-xs">
            {distributionData.map((d) => (
              <div key={d.key} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium text-platinum/60">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_COLORS[d.key] }} />
                  {d.name}
                </span>
                <span className="font-sora font-extrabold text-platinum">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factor Weights */}
        <div className="pi-card lg:col-span-2 p-6 space-y-4">
          <h3 className="font-sora text-base font-bold text-platinum">
            AI Risk Factor Weights &amp; Detection Models
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {riskFactors.map((rf, idx) => (
              <div key={idx} className="pi-surface pi-surface-hover p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-platinum">{rf.name}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/[0.08] text-platinum/75 border border-white/[0.14]">
                    Weight: {(rf.weight * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-platinum/45">
                  <span>Category: {rf.category}</span>
                  <span className="font-semibold text-rose-400">{rf.activeCases} Flagged Properties</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filterable Risk Score Directory Table */}
      <div className="pi-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="font-sora text-base font-bold text-platinum">
            Property Risk Audits &amp; Narrative Logs
          </h3>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="pi-input relative flex-1 sm:w-64 flex items-center rounded-xl">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-platinum/35 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search risk records..."
                className="w-full pl-10 pr-4 py-2 text-xs bg-transparent text-platinum placeholder-platinum/30 focus:outline-none"
              />
            </div>

            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="pi-input rounded-xl px-3 py-2 text-xs bg-transparent text-platinum focus:outline-none"
            >
              <option value="All" className="bg-[#14151b]">All Risk Levels</option>
              <option value="MINIMAL" className="bg-[#14151b]">Minimal</option>
              <option value="LOW" className="bg-[#14151b]">Low</option>
              <option value="MODERATE" className="bg-[#14151b]">Moderate</option>
              <option value="HIGH" className="bg-[#14151b]">High</option>
              <option value="CRITICAL" className="bg-[#14151b]">Critical</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="pi-table w-full text-left text-xs">
            <thead>
              <tr>
                <th>Property Title</th>
                <th>Survey #</th>
                <th>Risk Level</th>
                <th>AI Narrative Excerpt</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredScores.map((r: any) => (
                <tr key={r.id}>
                  <td className="font-bold text-platinum">
                    {r.property?.title}
                  </td>
                  <td className="font-mono text-platinum/50">
                    {r.property?.surveyNumber || "N/A"}
                  </td>
                  <td>
                    <RiskBadge level={r.riskLevel} score={r.overallScore} size="sm" />
                  </td>
                  <td className="text-platinum/55 max-w-md truncate">
                    {r.aiNarrative || "Clean record evaluated by risk model."}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/properties/${r.property?.id || "prop-001"}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-platinum/75 hover:text-platinum font-bold transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
