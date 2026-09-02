// src/modules/matching/matching.algorithms.ts
//
// Zero-dependency matching algorithms
// No ML, no embeddings, no paid APIs
// Production upgrade: add vector similarity via pgvector

// ─── Levenshtein distance ───

export function levenshtein(a: string, b: string): number {
  const la = a.length, lb = b.length;
  if (la === 0) return lb;
  if (lb === 0) return la;

  const matrix: number[][] = [];
  for (let i = 0; i <= la; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= lb; j++) { matrix[0][j] = j; }

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,       // deletion
        matrix[i][j - 1] + 1,       // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return matrix[la][lb];
}

export function similarityScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const al = a.toLowerCase().trim();
  const bl = b.toLowerCase().trim();
  if (al === bl) return 1.0;
  const maxLen = Math.max(al.length, bl.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(al, bl) / maxLen;
}

// ─── Survey number normalization ───
// Handles: "118/2A", "S.No.118/2A", "S.No. 118/2A", "Survey 118/2A", "Sno118/2A"

export function normalizeSurveyNumber(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toUpperCase()
    .replace(/S\.?\s*NO\.?\s*/gi, "")  // Remove "S.No.", "Sno", "S No."
    .replace(/SURVEY\s*/gi, "")         // Remove "Survey"
    .replace(/GUT\s*NO\.?\s*/gi, "")    // Remove "Gut No."
    .replace(/CTS\s*/gi, "")            // Remove "CTS"
    .replace(/\s+/g, "")               // Remove whitespace
    .replace(/^0+/, "");                // Remove leading zeros
}

export function matchSurveyNumber(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeSurveyNumber(a);
  const nb = normalizeSurveyNumber(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Partial match: "118/2A" contains "118/2"
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  // Fuzzy match for OCR errors: "118/2A" vs "l18/2A" (l instead of 1)
  const sim = similarityScore(na, nb);
  return sim >= 0.8 ? sim : 0;
}

// ─── Owner name matching ───
// Handles: name ordering, middle names, initials, titles

export function normalizeOwnerName(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b(shri|smt|mr|mrs|ms|dr|prof)\b\.?\s*/gi, "") // Remove titles
    .replace(/\b(s\/o|d\/o|w\/o|c\/o)\b\s*/gi, "")           // Remove relation prefixes
    .replace(/[^a-z\s]/g, "")                                  // Remove non-alpha
    .replace(/\s+/g, " ")                                      // Normalize whitespace
    .trim();
}

export function matchOwnerName(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeOwnerName(a);
  const nb = normalizeOwnerName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;

  // Split into name parts and compare
  const partsA = na.split(" ").sort();
  const partsB = nb.split(" ").sort();

  // Exact match with different ordering: "rajesh mehta" === "mehta rajesh"
  if (partsA.join(" ") === partsB.join(" ")) return 0.95;

  // Subset match: "rajesh mehta" matches "rajesh suresh mehta" (middle name missing)
  const shorter = partsA.length <= partsB.length ? partsA : partsB;
  const longer = partsA.length <= partsB.length ? partsB : partsA;
  const matched = shorter.filter(p => longer.some(q => similarityScore(p, q) >= 0.85));
  if (matched.length === shorter.length && shorter.length >= 2) return 0.85;

  // Last name match with first initial: "R. Mehta" matches "Rajesh Mehta"
  const lastA = partsA[partsA.length - 1];
  const lastB = partsB[partsB.length - 1];
  if (similarityScore(lastA, lastB) >= 0.9) return 0.7;

  // General fuzzy
  return similarityScore(na, nb);
}

// ─── Address / Village matching ───

export function normalizeVillage(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b(budruk|khurd|tal|dist|village|v\/)\b\.?\s*/gi, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchVillage(a: string | null | undefined, b: string | null | undefined): number {
  const na = normalizeVillage(a);
  const nb = normalizeVillage(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1.0;
  // "Hinjewadi" vs "Hinjawadi" — common spelling variations
  return similarityScore(na, nb);
}

// ─── Area matching (within tolerance) ───

export function matchArea(a: number | null | undefined, b: number | null | undefined, tolerancePercent = 5): number {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  const pctDiff = (diff / avg) * 100;
  if (pctDiff <= 1) return 1.0;      // Nearly identical
  if (pctDiff <= tolerancePercent) return 0.8;  // Within tolerance
  if (pctDiff <= tolerancePercent * 2) return 0.5;
  return 0;
}

// ─── Price matching (within tolerance) ───

export function matchPrice(a: number | null | undefined, b: number | null | undefined, tolerancePercent = 10): number {
  if (!a || !b) return 0;
  const diff = Math.abs(a - b);
  const avg = (a + b) / 2;
  const pctDiff = (diff / avg) * 100;
  if (pctDiff <= 3) return 1.0;
  if (pctDiff <= tolerancePercent) return 0.7;
  if (pctDiff <= tolerancePercent * 2) return 0.4;
  return 0;
}

// ─── Coordinate proximity ───

export function matchCoordinates(
  latA: number | null, lngA: number | null,
  latB: number | null, lngB: number | null,
  thresholdMeters = 100,
): number {
  if (!latA || !lngA || !latB || !lngB) return 0;
  // Haversine distance in meters
  const R = 6371000;
  const dLat = (latB - latA) * Math.PI / 180;
  const dLng = (lngB - lngA) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(latA * Math.PI / 180) * Math.cos(latB * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  if (distance <= thresholdMeters) return 1.0;
  if (distance <= thresholdMeters * 3) return 0.7;
  if (distance <= thresholdMeters * 10) return 0.3;
  return 0;
}

// ─── Composite match score ───

export interface MatchWeights {
  surveyNumber: number;
  ownerName: number;
  village: number;
  area: number;
  price: number;
  coordinates: number;
}

export const DEFAULT_WEIGHTS: MatchWeights = {
  surveyNumber: 0.35,
  ownerName: 0.25,
  village: 0.15,
  area: 0.10,
  price: 0.05,
  coordinates: 0.10,
};

export interface MatchResult {
  overallScore: number;
  factors: {
    name: string;
    score: number;
    weight: number;
    weighted: number;
    detail: string;
  }[];
  matchType: "exact_duplicate" | "likely_duplicate" | "possible_match" | "conflict" | "no_match";
  confidence: string;
}

export function computeMatchScore(
  a: {
    surveyNumber?: string | null;
    ownerName?: string | null;
    village?: string | null;
    area?: number | null;
    price?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  b: typeof a,
  weights: MatchWeights = DEFAULT_WEIGHTS,
): MatchResult {
  const factors = [
    {
      name: "Survey number",
      score: matchSurveyNumber(a.surveyNumber, b.surveyNumber),
      weight: weights.surveyNumber,
      detail: `"${a.surveyNumber || "—"}" vs "${b.surveyNumber || "—"}"`,
    },
    {
      name: "Owner name",
      score: matchOwnerName(a.ownerName, b.ownerName),
      weight: weights.ownerName,
      detail: `"${a.ownerName || "—"}" vs "${b.ownerName || "—"}"`,
    },
    {
      name: "Village",
      score: matchVillage(a.village, b.village),
      weight: weights.village,
      detail: `"${a.village || "—"}" vs "${b.village || "—"}"`,
    },
    {
      name: "Area",
      score: matchArea(a.area, b.area),
      weight: weights.area,
      detail: `${a.area || "—"} vs ${b.area || "—"} sq ft`,
    },
    {
      name: "Price",
      score: matchPrice(a.price, b.price),
      weight: weights.price,
      detail: `₹${a.price?.toLocaleString() || "—"} vs ₹${b.price?.toLocaleString() || "—"}`,
    },
    {
      name: "Coordinates",
      score: matchCoordinates(a.latitude ?? null, a.longitude ?? null, b.latitude ?? null, b.longitude ?? null),
      weight: weights.coordinates,
      detail: a.latitude && b.latitude ? `(${a.latitude},${a.longitude}) vs (${b.latitude},${b.longitude})` : "No coordinates",
    },
  ].map(f => ({ ...f, weighted: f.score * f.weight }));

  const overallScore = Math.round(factors.reduce((sum, f) => sum + f.weighted, 0) * 100);

  let matchType: MatchResult["matchType"];
  if (overallScore >= 90) matchType = "exact_duplicate";
  else if (overallScore >= 70) matchType = "likely_duplicate";
  else if (overallScore >= 45) matchType = "possible_match";
  else if (factors[0].score > 0.8 && factors[1].score < 0.3) matchType = "conflict"; // Same survey, different owner
  else matchType = "no_match";

  const confidence = overallScore >= 80 ? "high" : overallScore >= 50 ? "medium" : "low";

  return { overallScore, factors, matchType, confidence };
}
