"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-provider";
import { StatCard } from "@/components/ui/stat-card";
import { BarChart3, TrendingUp, ShieldCheck, Scale, FileText, Download } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area, CartesianGrid } from "recharts";
import {
  CHART_SERIES,
  CHART_STATUS,
  CHART_INK,
  CHART_TOOLTIP_STYLE,
  CHART_TOOLTIP_LABEL_STYLE,
  CHART_TOOLTIP_ITEM_STYLE,
} from "@/lib/chart-theme";

export default function AnalyticsReportsPage() {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const token = getAccessToken();
        const res = await fetch("/api/analytics", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data);
        }
      } catch (err) {
        console.error("Analytics fetch error:", err);
      }
    }

    fetchAnalytics();
  }, [getAccessToken]);

  const monthlyReportData = [
    { month: "Jan", onboarding: 12, verifications: 10, riskAudits: 14 },
    { month: "Feb", onboarding: 19, verifications: 16, riskAudits: 22 },
    { month: "Mar", onboarding: 28, verifications: 24, riskAudits: 31 },
    { month: "Apr", onboarding: 42, verifications: 35, riskAudits: 48 },
    { month: "May", onboarding: 61, verifications: 52, riskAudits: 65 },
    { month: "Jun", onboarding: 84, verifications: 68, riskAudits: 92 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sora text-2xl font-extrabold text-platinum tracking-tight flex items-center gap-2.5">
            <span className="pi-icon-tile w-9 h-9 text-platinum/80">
              <BarChart3 className="w-5 h-5" />
            </span>
            System Intelligence Reports &amp; Portfolio Analytics
          </h1>
          <p className="text-xs text-platinum/45 mt-1">
            Executive reports on land verification efficiency, risk trends, and litigation alerts
          </p>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Avg Verification Time"
          value="1.2 Days"
          icon={<ShieldCheck className="w-5 h-5 text-emerald-400" />}
          subtitle="Down from 14 days manual"
          badgeText="91% Faster"
          badgeVariant="success"
        />
        <StatCard
          title="Total Title Audits"
          value="272 Runs"
          icon={<FileText className="w-5 h-5 text-[#7fb0ee]" />}
          subtitle="7/12 & mutation entries"
          badgeText="Automated"
          badgeVariant="brand"
        />
        <StatCard
          title="Litigation Intercepts"
          value="18 Cases"
          icon={<Scale className="w-5 h-5 text-rose-400" />}
          subtitle="Prevented disputed purchases"
          badgeText="Alert Active"
          badgeVariant="error"
        />
        <StatCard
          title="Portfolio Valuation"
          value="₹142.5 Cr"
          icon={<TrendingUp className="w-5 h-5 text-violet-400" />}
          subtitle="Across 84 Pune properties"
          badgeText="Scanned"
          badgeVariant="brand"
        />
      </div>

      {/* Analytics Chart */}
      <div className="pi-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-sora text-base font-bold text-platinum">
              6-Month Platform Intelligence Throughput
            </h3>
            <p className="text-xs text-platinum/45">
              Comparative volume of onboarded properties, OCR verifications, and AI risk audits
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[#7fb0ee]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_SERIES[0] }} />
              Onboarding
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_STATUS.good }} />
              Verifications
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_STATUS.critical }} />
              Risk Audits
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyReportData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_INK.grid} vertical={false} />
              <XAxis dataKey="month" stroke={CHART_INK.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHART_INK.axis }} />
              <YAxis stroke={CHART_INK.muted} fontSize={12} tickLine={false} axisLine={{ stroke: CHART_INK.axis }} />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelStyle={CHART_TOOLTIP_LABEL_STYLE}
                itemStyle={CHART_TOOLTIP_ITEM_STYLE}
                cursor={{ stroke: CHART_INK.axis }}
              />
              <Area type="monotone" dataKey="riskAudits" stroke={CHART_STATUS.critical} fill={CHART_STATUS.critical} fillOpacity={0.12} strokeWidth={2} />
              <Area type="monotone" dataKey="onboarding" stroke={CHART_SERIES[0]} fill={CHART_SERIES[0]} fillOpacity={0.15} strokeWidth={2} />
              <Area type="monotone" dataKey="verifications" stroke={CHART_STATUS.good} fill={CHART_STATUS.good} fillOpacity={0.18} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
