// src/modules/matching/matching.service.ts

import { prisma } from "@/lib/db/client";
import { computeMatchScore, type MatchResult, type MatchWeights, DEFAULT_WEIGHTS } from "./matching.algorithms";

// ─── Types ───

export interface MatchRecord {
  id: string;
  propertyAId: string;
  propertyBId: string;
  propertyA: { id: string; title: string; surveyNumber: string | null; status: string };
  propertyB: { id: string; title: string; surveyNumber: string | null; status: string };
  overallScore: number;
  matchType: string;
  confidence: string;
  factors: MatchResult["factors"];
  status: "pending" | "confirmed" | "dismissed" | "resolved";
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export interface MatchSummary {
  totalMatches: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  highConfidence: number;
  pendingReview: number;
}

// ─── In-memory match store (prototype) ───
// Production: dedicated matches table in PostgreSQL

let matchStore: MatchRecord[] = [];
let matchIdCounter = 1;

function generateMatchId(): string {
  return `match-${String(matchIdCounter++).padStart(4, "0")}`;
}

// ─── Core matching ───

export async function runPropertyMatching(
  tenantId: string,
  targetPropertyId?: string,
  weights: MatchWeights = DEFAULT_WEIGHTS,
): Promise<{ matches: MatchRecord[]; scanned: number; duration: number }> {
  const start = Date.now();

  // Load properties
  const properties = await prisma.property.findMany({
    where: { tenantId, deletedAt: null },
    select: {
      id: true,
      title: true,
      surveyNumber: true,
      khasraNumber: true,
      price: true,
      areaSqft: true,
      status: true,
      metadata: true,
      address: { select: { city: true, district: true, latitude: true, longitude: true } },
      owner: { select: { firstName: true, lastName: true } },
    },
  });

  const newMatches: MatchRecord[] = [];
  const candidates = targetPropertyId
    ? properties.filter((p: any) => p.id === targetPropertyId)
    : properties;

  const comparisons = targetPropertyId
    ? properties.filter((p: any) => p.id !== targetPropertyId)
    : properties;

  // Compare each candidate against all other properties
  for (const propA of candidates) {
    for (const propB of comparisons) {
      if (propA.id >= propB.id) continue; // Avoid duplicate pairs (A-B and B-A)

      const meta = (field: string, prop: typeof propA) =>
        (prop.metadata as Record<string, unknown>)?.[field] as string | undefined;

      const result = computeMatchScore(
        {
          surveyNumber: propA.surveyNumber,
          ownerName: propA.owner ? `${propA.owner.firstName} ${propA.owner.lastName}` : undefined,
          village: meta("village", propA),
          area: propA.areaSqft ? Number(propA.areaSqft) : undefined,
          price: propA.price ? Number(propA.price) : undefined,
          latitude: propA.address?.latitude ? Number(propA.address.latitude) : undefined,
          longitude: propA.address?.longitude ? Number(propA.address.longitude) : undefined,
        },
        {
          surveyNumber: propB.surveyNumber,
          ownerName: propB.owner ? `${propB.owner.firstName} ${propB.owner.lastName}` : undefined,
          village: meta("village", propB),
          area: propB.areaSqft ? Number(propB.areaSqft) : undefined,
          price: propB.price ? Number(propB.price) : undefined,
          latitude: propB.address?.latitude ? Number(propB.address.latitude) : undefined,
          longitude: propB.address?.longitude ? Number(propB.address.longitude) : undefined,
        },
        weights,
      );

      // Only store matches above threshold
      if (result.matchType !== "no_match") {
        // Check if match already exists
        const existing = matchStore.find(
          m => (m.propertyAId === propA.id && m.propertyBId === propB.id) ||
               (m.propertyAId === propB.id && m.propertyBId === propA.id)
        );

        if (!existing) {
          const match: MatchRecord = {
            id: generateMatchId(),
            propertyAId: propA.id,
            propertyBId: propB.id,
            propertyA: { id: propA.id, title: propA.title, surveyNumber: propA.surveyNumber, status: propA.status },
            propertyB: { id: propB.id, title: propB.title, surveyNumber: propB.surveyNumber, status: propB.status },
            overallScore: result.overallScore,
            matchType: result.matchType,
            confidence: result.confidence,
            factors: result.factors,
            status: "pending",
            resolvedBy: null,
            resolvedAt: null,
            createdAt: new Date(),
          };
          matchStore.push(match);
          newMatches.push(match);
        }
      }
    }
  }

  return {
    matches: newMatches,
    scanned: candidates.length * comparisons.length,
    duration: Date.now() - start,
  };
}

// ─── Query matches ───

export async function getMatches(
  tenantId: string,
  filters: {
    matchType?: string;
    status?: string;
    minScore?: number;
    propertyId?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<{ matches: MatchRecord[]; total: number }> {
  let results = [...matchStore];

  if (filters.matchType) results = results.filter(m => m.matchType === filters.matchType);
  if (filters.status) results = results.filter(m => m.status === filters.status);
  if (filters.minScore!) results = results.filter(m => m.overallScore >= filters.minScore!);
  if (filters.propertyId) {
    results = results.filter(m => m.propertyAId === filters.propertyId || m.propertyBId === filters.propertyId);
  }

  // Sort by score descending
  results.sort((a, b) => b.overallScore - a.overallScore);

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const total = results.length;
  const paginated = results.slice((page - 1) * limit, page * limit);

  return { matches: paginated, total };
}

export async function getMatchById(matchId: string): Promise<MatchRecord | null> {
  return matchStore.find(m => m.id === matchId) || null;
}

export async function resolveMatch(
  matchId: string,
  userId: string,
  action: "confirmed" | "dismissed",
): Promise<MatchRecord | null> {
  const match = matchStore.find(m => m.id === matchId);
  if (!match) return null;

  match.status = action === "confirmed" ? "confirmed" : "dismissed";
  match.resolvedBy = userId;
  match.resolvedAt = new Date();

  return match;
}

export async function getMatchSummary(tenantId: string): Promise<MatchSummary> {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let highConfidence = 0;
  let pendingReview = 0;

  for (const m of matchStore) {
    byType[m.matchType] = (byType[m.matchType] || 0) + 1;
    byStatus[m.status] = (byStatus[m.status] || 0) + 1;
    if (m.confidence === "high") highConfidence++;
    if (m.status === "pending") pendingReview++;
  }

  return {
    totalMatches: matchStore.length,
    byType,
    byStatus,
    highConfidence,
    pendingReview,
  };
}

// ─── Seed demo matches ───
// Call this on startup to populate with realistic matches

export function seedDemoMatches(): void {
  if (matchStore.length > 0) return; // Already seeded

  matchStore = [
    {
      id: "match-0001", propertyAId: "prop-002", propertyBId: "prop-dup-001",
      propertyA: { id: "prop-002", title: "Survey 118, Hinjewadi", surveyNumber: "S.No.299/12", status: "FLAGGED" },
      propertyB: { id: "prop-dup-001", title: "Survey 118, Hinjawadi (Relisted)", surveyNumber: "S.No.299/12", status: "FLAGGED" },
      overallScore: 92, matchType: "exact_duplicate", confidence: "high",
      factors: [
        { name: "Survey number", score: 1.0, weight: 0.35, weighted: 0.35, detail: '"S.No.299/12" vs "S.No.299/12"' },
        { name: "Owner name", score: 0.0, weight: 0.25, weighted: 0.0, detail: '"Sunil Deshmukh" vs "Unknown"' },
        { name: "Village", score: 0.92, weight: 0.15, weighted: 0.138, detail: '"Hinjewadi" vs "Hinjawadi"' },
        { name: "Area", score: 1.0, weight: 0.10, weighted: 0.10, detail: "5200 vs 5200 sq ft" },
        { name: "Price", score: 0.7, weight: 0.05, weighted: 0.035, detail: "₹1,25,00,000 vs ₹1,18,00,000" },
        { name: "Coordinates", score: 1.0, weight: 0.10, weighted: 0.10, detail: "~12m apart" },
      ],
      status: "pending", resolvedBy: null, resolvedAt: null, createdAt: new Date("2026-07-15"),
    },
    {
      id: "match-0002", propertyAId: "prop-001", propertyBId: "prop-006",
      propertyA: { id: "prop-001", title: "Plot 42, Kharadi", surveyNumber: "42/3A", status: "VERIFIED" },
      propertyB: { id: "prop-006", title: "Row House 12, Undri", surveyNumber: "496/2C", status: "DRAFT" },
      overallScore: 52, matchType: "possible_match", confidence: "medium",
      factors: [
        { name: "Survey number", score: 0.0, weight: 0.35, weighted: 0.0, detail: '"42/3A" vs "496/2C"' },
        { name: "Owner name", score: 0.7, weight: 0.25, weighted: 0.175, detail: '"Amit Patil" vs "Savita Jadhav"' },
        { name: "Village", score: 0.0, weight: 0.15, weighted: 0.0, detail: '"Kharadi" vs "Undri"' },
        { name: "Area", score: 0.5, weight: 0.10, weighted: 0.05, detail: "2400 vs 1800 sq ft" },
        { name: "Price", score: 0.4, weight: 0.05, weighted: 0.02, detail: "₹48L vs ₹95L" },
        { name: "Coordinates", score: 0.7, weight: 0.10, weighted: 0.07, detail: "~6km apart" },
      ],
      status: "dismissed", resolvedBy: "user-admin-001", resolvedAt: new Date("2026-07-20"), createdAt: new Date("2026-07-15"),
    },
    {
      id: "match-0003", propertyAId: "prop-004", propertyBId: "prop-008",
      propertyA: { id: "prop-004", title: "Farm Plot, Mulshi", surveyNumber: "118/2A", status: "LISTED" },
      propertyB: { id: "prop-008", title: "Land parcel, Baramati", surveyNumber: "S.No.150/3", status: "LISTED" },
      overallScore: 48, matchType: "possible_match", confidence: "medium",
      factors: [
        { name: "Survey number", score: 0.0, weight: 0.35, weighted: 0.0, detail: '"118/2A" vs "S.No.150/3"' },
        { name: "Owner name", score: 0.0, weight: 0.25, weighted: 0.0, detail: '"Vitthal Pawar" vs "Shankar Thorat"' },
        { name: "Village", score: 0.0, weight: 0.15, weighted: 0.0, detail: '"Pirangut" vs "Morgaon"' },
        { name: "Area", score: 0.0, weight: 0.10, weighted: 0.0, detail: "43560 vs 12000 sq ft" },
        { name: "Price", score: 0.0, weight: 0.05, weighted: 0.0, detail: "₹2.1Cr vs ₹55L" },
        { name: "Coordinates", score: 0.3, weight: 0.10, weighted: 0.03, detail: "~35km apart" },
      ],
      status: "pending", resolvedBy: null, resolvedAt: null, createdAt: new Date("2026-07-18"),
    },
    {
      id: "match-0004", propertyAId: "prop-002", propertyBId: "prop-004",
      propertyA: { id: "prop-002", title: "Survey 118, Hinjewadi", surveyNumber: "S.No.299/12", status: "FLAGGED" },
      propertyB: { id: "prop-004", title: "Farm Plot, Mulshi", surveyNumber: "118/2A", status: "LISTED" },
      overallScore: 58, matchType: "conflict", confidence: "medium",
      factors: [
        { name: "Survey number", score: 0.85, weight: 0.35, weighted: 0.30, detail: '"S.No.299/12" vs "118/2A" — partial match on "118"' },
        { name: "Owner name", score: 0.0, weight: 0.25, weighted: 0.0, detail: '"Sunil Deshmukh" vs "Vitthal Pawar"' },
        { name: "Village", score: 0.0, weight: 0.15, weighted: 0.0, detail: '"Hinjewadi" vs "Pirangut"' },
        { name: "Area", score: 0.0, weight: 0.10, weighted: 0.0, detail: "5200 vs 43560 sq ft" },
        { name: "Price", score: 0.0, weight: 0.05, weighted: 0.0, detail: "₹1.25Cr vs ₹2.1Cr" },
        { name: "Coordinates", score: 0.3, weight: 0.10, weighted: 0.03, detail: "~15km apart" },
      ],
      status: "pending", resolvedBy: null, resolvedAt: null, createdAt: new Date("2026-07-22"),
    },
  ];
}

// Auto-seed on import
seedDemoMatches();
