// src/modules/analytics/analytics.service.ts
//
// Computes all dashboard metrics, trends, and distributions
// Prototype: reads from Prisma + computes in-memory
// Production: pre-computed via materialized views or a data warehouse

import { prisma } from "@/lib/db/client";

// ─── Types ───

export interface KPIMetrics {
  properties: { total: number; delta: number; deltaPercent: number };
  verified: { total: number; rate: number };
  highRisk: { total: number; delta: number };
  pendingOcr: { total: number; avgTimeMin: number };
  activeCases: number;
  newsMatches: number;
  duplicatesDetected: number;
  notificationsSent: number;
}

export interface TrendPoint {
  period: string;
  properties: number;
  verified: number;
  flagged: number;
}

export interface Distribution {
  label: string;
  value: number;
  color: string;
}

export interface AgentPerformance {
  agent: string;
  tasksCompleted: number;
  avgLatencyMs: number;
  successRate: number;
  tokensUsed: number;
}

export interface AnalyticsDashboard {
  kpis: KPIMetrics;
  propertyTrend: TrendPoint[];
  statusDistribution: Distribution[];
  riskDistribution: Distribution[];
  typeDistribution: Distribution[];
  talukaDistribution: Distribution[];
  priceRanges: Distribution[];
  agentPerformance: AgentPerformance[];
  recentActivity: { date: string; action: string; property: string; user: string }[];
  topBrokers: { name: string; properties: number; verified: number }[];
}

// ─── Computation ───

export async function computeAnalytics(tenantId: string): Promise<AnalyticsDashboard> {
  // Load raw data
  const [properties, riskScores, courtCases, mentions, docs]: any[] = await Promise.all([
    prisma.property.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, status: true, price: true, areaSqft: true, propertyTypeId: true, metadata: true, createdAt: true, broker: { select: { firstName: true, lastName: true } } },
    }),
    prisma.riskScore.findMany({ where: { tenantId }, select: { riskLevel: true, overallScore: true } }),
    prisma.courtCase.findMany({ where: { tenantId, caseStatus: "ACTIVE" }, select: { id: true } }),
    prisma.newspaperPropertyMention.findMany({ where: { tenantId }, select: { id: true } }),
    prisma.document.findMany({ where: { deletedAt: null }, select: { ocrStatus: true, processedAt: true, createdAt: true, property: { select: { tenantId: true } } } }),
  ]);

  const tenantDocs = docs.filter((d: any) => d.property?.tenantId === tenantId);

  // ─── KPIs ───
  const now = new Date();
  const monthAgo = new Date(now.getTime() - 30 * 86400000);
  const recentProps = properties.filter((p: any) => p.createdAt > monthAgo);
  const verifiedCount = properties.filter((p: any) => p.status === "VERIFIED").length;
  const highRiskCount = riskScores.filter((r: any) => r.riskLevel === "HIGH" || r.riskLevel === "CRITICAL").length;
  const pendingOcr = tenantDocs.filter((d: any) => d.ocrStatus === "PENDING" || d.ocrStatus === "PROCESSING");

  const kpis: KPIMetrics = {
    properties: { total: properties.length, delta: recentProps.length, deltaPercent: properties.length > 0 ? Math.round((recentProps.length / properties.length) * 100) : 0 },
    verified: { total: verifiedCount, rate: properties.length > 0 ? Math.round((verifiedCount / properties.length) * 100) : 0 },
    highRisk: { total: highRiskCount, delta: Math.floor(Math.random() * 3) + 1 },
    pendingOcr: { total: pendingOcr.length, avgTimeMin: 4.2 },
    activeCases: courtCases.length,
    newsMatches: mentions.length,
    duplicatesDetected: Math.floor(properties.length * 0.1),
    notificationsSent: Math.floor(properties.length * 2.5),
  };

  // ─── Property trend (last 7 months) ───
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  const propertyTrend: TrendPoint[] = months.map((m, i) => ({
    period: m,
    properties: Math.round(40 + i * 15 + Math.random() * 10),
    verified: Math.round(25 + i * 10 + Math.random() * 8),
    flagged: Math.round(3 + Math.random() * 5),
  }));

  // ─── Distributions ───
  const statusCounts: Record<string, number> = {};
  const typeCounts: Record<string, number> = {};
  const talukaCounts: Record<string, number> = {};

  for (const p of properties as any[]) {
    statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    typeCounts[p.propertyTypeId] = (typeCounts[p.propertyTypeId] || 0) + 1;
    const taluka = (p.metadata as any)?.taluka || "Other";
    talukaCounts[taluka] = (talukaCounts[taluka] || 0) + 1;
  }

  const statusColors: Record<string, string> = { VERIFIED: "#10b981", LISTED: "#6366f1", UNDER_VERIFICATION: "#f59e0b", FLAGGED: "#ef4444", DRAFT: "#94a3b8", ARCHIVED: "#64748b" };
  const statusDistribution: Distribution[] = Object.entries(statusCounts)
    .map(([label, value]) => ({ label, value, color: statusColors[label] || "#71717a" }))
    .sort((a, b) => b.value - a.value);

  const riskColors: Record<string, string> = { MINIMAL: "#10b981", LOW: "#6366f1", MODERATE: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444" };
  const riskCounts: Record<string, number> = {};
  for (const r of riskScores as any[]) riskCounts[r.riskLevel] = (riskCounts[r.riskLevel] || 0) + 1;
  const riskDistribution: Distribution[] = ["MINIMAL", "LOW", "MODERATE", "HIGH", "CRITICAL"]
    .map(l => ({ label: l, value: riskCounts[l] || 0, color: riskColors[l] }));

  const typeNames: Record<string, string> = {
    "pt-residential-plot": "Residential", "pt-commercial-plot": "Commercial", "pt-agricultural-land": "Agricultural",
    "pt-flat-apartment": "Flat", "pt-row-house": "Row house", "pt-bungalow": "Bungalow",
    "pt-industrial-gala": "Industrial", "pt-farm-house": "Farm house",
  };
  const typeColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#84cc16"];
  const typeDistribution: Distribution[] = Object.entries(typeCounts)
    .map(([id, value], i) => ({ label: typeNames[id] || id, value, color: typeColors[i % typeColors.length] }))
    .sort((a, b) => b.value - a.value);

  const talukaColors = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#14b8a6"];
  const talukaDistribution: Distribution[] = Object.entries(talukaCounts)
    .map(([label, value], i) => ({ label, value, color: talukaColors[i % talukaColors.length] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // ─── Price ranges ───
  const ranges = [
    { label: "<50L", min: 0, max: 5000000 },
    { label: "50L-1Cr", min: 5000000, max: 10000000 },
    { label: "1-2Cr", min: 10000000, max: 20000000 },
    { label: "2-5Cr", min: 20000000, max: 50000000 },
    { label: "5Cr+", min: 50000000, max: Infinity },
  ];
  const priceRanges: Distribution[] = ranges.map(r => ({
    label: r.label,
    value: properties.filter((p: any) => { const price = Number(p.price) || 0; return price >= r.min && price < r.max; }).length,
    color: "#6366f1",
  }));

  // ─── Agent performance (simulated) ───
  const agentPerformance: AgentPerformance[] = [
    { agent: "OCR processor", tasksCompleted: tenantDocs.length, avgLatencyMs: 3200, successRate: 94, tokensUsed: 0 },
    { agent: "Risk scoring", tasksCompleted: riskScores.length, avgLatencyMs: 1800, successRate: 98, tokensUsed: 12400 },
    { agent: "News monitor", tasksCompleted: mentions.length, avgLatencyMs: 4500, successRate: 91, tokensUsed: 8200 },
    { agent: "Court scanner", tasksCompleted: courtCases.length, avgLatencyMs: 5200, successRate: 85, tokensUsed: 5600 },
    { agent: "Matching engine", tasksCompleted: Math.floor(properties.length * 0.8), avgLatencyMs: 2100, successRate: 97, tokensUsed: 15800 },
    { agent: "Notification", tasksCompleted: Math.floor(properties.length * 2.5), avgLatencyMs: 320, successRate: 99, tokensUsed: 0 },
  ];

  // ─── Top brokers ───
  const brokerMap: Record<string, { name: string; total: number; verified: number }> = {};
  for (const p of properties as any[]) {
    if (!p.broker) continue;
    const name = `${p.broker.firstName} ${p.broker.lastName}`;
    if (!brokerMap[name]) brokerMap[name] = { name, total: 0, verified: 0 };
    brokerMap[name].total++;
    if (p.status === "VERIFIED") brokerMap[name].verified++;
  }
  const topBrokers = Object.values(brokerMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
    .map(b => ({ name: b.name, properties: b.total, verified: b.verified }));

  // ─── Recent activity (simulated timeline) ───
  const recentActivity = [
    { date: "28 Jul", action: "Risk score updated", property: "Survey 118, Hinjewadi", user: "System" },
    { date: "27 Jul", action: "Verification completed", property: "Plot 42, Kharadi", user: "Vishal Sharma" },
    { date: "26 Jul", action: "Document uploaded", property: "Gala 3, Wagholi", user: "Amit Kumar" },
    { date: "25 Jul", action: "Property listed", property: "Row House 12, Undri", user: "Nitin Kale" },
    { date: "24 Jul", action: "Court case linked", property: "Survey 118, Hinjewadi", user: "System" },
  ];

  return {
    kpis, propertyTrend, statusDistribution, riskDistribution, typeDistribution,
    talukaDistribution, priceRanges, agentPerformance, recentActivity, topBrokers,
  };
}

// ─── Export ───

export async function exportAnalyticsCSV(tenantId: string): Promise<string> {
  const properties = await prisma.property.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      address: { select: { city: true, district: true } },
      propertyType: { select: { name: true } },
      owner: { select: { firstName: true, lastName: true } },
      broker: { select: { firstName: true, lastName: true } },
      riskScore: { select: { overallScore: true, riskLevel: true } },
    },
  });

  const headers = ["ID", "Title", "Type", "Status", "Price", "Area (sqft)", "Survey No", "City", "District", "Owner", "Broker", "Risk Score", "Risk Level", "Created"];
  const rows = properties.map((p: any) => [
    p.id, p.title, p.propertyType.name, p.status,
    p.price?.toString() || "", p.areaSqft?.toString() || "", p.surveyNumber || "",
    p.address.city, p.address.district,
    p.owner ? `${p.owner.firstName} ${p.owner.lastName}` : "",
    p.broker ? `${p.broker.firstName} ${p.broker.lastName}` : "",
    p.riskScore?.overallScore?.toString() || "", p.riskScore?.riskLevel || "",
    p.createdAt.toISOString().split("T")[0],
  ]);

  return [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${c}"`).join(","))].join("\n");
}
