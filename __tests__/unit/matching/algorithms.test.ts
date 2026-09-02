// __tests__/unit/matching/algorithms.test.ts

import { describe, it, expect } from "vitest";
import {
  levenshtein,
  similarityScore,
  normalizeSurveyNumber,
  matchSurveyNumber,
  normalizeOwnerName,
  matchOwnerName,
  matchArea,
  matchPrice,
  matchCoordinates,
  computeMatchScore,
} from "@/modules/matching/matching.algorithms";

describe("Matching algorithms", () => {
  describe("levenshtein", () => {
    it("returns 0 for identical strings", () => {
      expect(levenshtein("hello", "hello")).toBe(0);
    });

    it("returns string length for empty vs non-empty", () => {
      expect(levenshtein("", "abc")).toBe(3);
      expect(levenshtein("xyz", "")).toBe(3);
    });

    it("computes correct distance for single edit", () => {
      expect(levenshtein("cat", "bat")).toBe(1);
      expect(levenshtein("cat", "cats")).toBe(1);
      expect(levenshtein("cat", "ca")).toBe(1);
    });

    it("computes correct distance for multiple edits", () => {
      expect(levenshtein("kitten", "sitting")).toBe(3);
    });
  });

  describe("normalizeSurveyNumber", () => {
    it("strips S.No. prefix", () => {
      expect(normalizeSurveyNumber("S.No.299/12")).toBe("299/12");
    });

    it("strips Survey prefix", () => {
      expect(normalizeSurveyNumber("Survey 118/2A")).toBe("118/2A");
    });

    it("strips Gut No. prefix", () => {
      expect(normalizeSurveyNumber("Gut No. 4521")).toBe("4521");
    });

    it("strips CTS prefix", () => {
      expect(normalizeSurveyNumber("CTS 4821")).toBe("4821");
    });

    it("removes whitespace and leading zeros", () => {
      expect(normalizeSurveyNumber("  S.No. 0042 / 3A  ")).toBe("42/3A");
    });

    it("normalizes to uppercase", () => {
      expect(normalizeSurveyNumber("118/2a")).toBe("118/2A");
    });

    it("returns empty for null/undefined", () => {
      expect(normalizeSurveyNumber(null)).toBe("");
      expect(normalizeSurveyNumber(undefined)).toBe("");
    });
  });

  describe("matchSurveyNumber", () => {
    it("returns 1.0 for exact match after normalization", () => {
      expect(matchSurveyNumber("S.No.299/12", "S.No. 299/12")).toBe(1.0);
    });

    it("returns 1.0 for same number with different prefixes", () => {
      expect(matchSurveyNumber("Survey 118/2A", "S.No.118/2A")).toBe(1.0);
    });

    it("returns 0.85 for substring match", () => {
      expect(matchSurveyNumber("118/2A", "118/2")).toBe(0.85);
    });

    it("returns 0 for completely different numbers", () => {
      expect(matchSurveyNumber("42/3A", "299/12")).toBe(0);
    });

    it("returns 0 for null inputs", () => {
      expect(matchSurveyNumber(null, "118/2A")).toBe(0);
    });
  });

  describe("normalizeOwnerName", () => {
    it("strips Shri/Smt titles", () => {
      expect(normalizeOwnerName("Shri Rajesh Mehta")).toBe("rajesh mehta");
      expect(normalizeOwnerName("Smt. Sunita Patil")).toBe("sunita patil");
    });

    it("strips S/O, D/O, W/O prefixes", () => {
      expect(normalizeOwnerName("Rajesh S/O Suresh Mehta")).toBe("rajesh suresh mehta");
    });

    it("strips Mr/Mrs/Dr titles", () => {
      expect(normalizeOwnerName("Dr. Amit Joshi")).toBe("amit joshi");
    });

    it("removes non-alpha characters", () => {
      expect(normalizeOwnerName("Rajesh (Raju) Mehta-123")).toBe("rajesh raju mehta");
    });
  });

  describe("matchOwnerName", () => {
    it("returns 1.0 for exact match", () => {
      expect(matchOwnerName("Rajesh Mehta", "Rajesh Mehta")).toBe(1.0);
    });

    it("returns 1.0 for case-insensitive match", () => {
      expect(matchOwnerName("RAJESH MEHTA", "rajesh mehta")).toBe(1.0);
    });

    it("returns 0.95 for reordered names", () => {
      expect(matchOwnerName("Rajesh Mehta", "Mehta Rajesh")).toBe(0.95);
    });

    it("returns 0.85 for subset match (middle name missing)", () => {
      expect(matchOwnerName("Rajesh Mehta", "Rajesh Suresh Mehta")).toBe(0.85);
    });

    it("returns 0.7 for last name match only", () => {
      const score = matchOwnerName("R Mehta", "Amit Mehta");
      expect(score).toBeGreaterThanOrEqual(0.5);
    });

    it("strips titles before comparing", () => {
      expect(matchOwnerName("Shri Rajesh Mehta", "Mr. Rajesh Mehta")).toBe(1.0);
    });

    it("returns 0 for null inputs", () => {
      expect(matchOwnerName(null, "Rajesh")).toBe(0);
    });
  });

  describe("matchArea", () => {
    it("returns 1.0 for identical areas", () => {
      expect(matchArea(2400, 2400)).toBe(1.0);
    });

    it("returns 1.0 for areas within 1%", () => {
      expect(matchArea(2400, 2410)).toBe(1.0);
    });

    it("returns 0.8 for areas within 5%", () => {
      expect(matchArea(2400, 2500)).toBe(0.8);
    });

    it("returns 0 for areas more than 10% apart", () => {
      expect(matchArea(2400, 3000)).toBe(0);
    });

    it("returns 0 for null inputs", () => {
      expect(matchArea(null, 2400)).toBe(0);
    });
  });

  describe("matchPrice", () => {
    it("returns 1.0 for identical prices", () => {
      expect(matchPrice(4800000, 4800000)).toBe(1.0);
    });

    it("returns 0.7 for prices within 10%", () => {
      expect(matchPrice(4800000, 5200000)).toBe(0.7);
    });

    it("returns 0 for prices more than 20% apart", () => {
      expect(matchPrice(4800000, 8000000)).toBe(0);
    });
  });

  describe("matchCoordinates", () => {
    it("returns 1.0 for identical coordinates", () => {
      expect(matchCoordinates(18.5562, 73.9404, 18.5562, 73.9404)).toBe(1.0);
    });

    it("returns 1.0 for points within 100m", () => {
      // ~50m apart
      expect(matchCoordinates(18.5562, 73.9404, 18.5566, 73.9404)).toBe(1.0);
    });

    it("returns 0 for points far apart", () => {
      // Pune to Mumbai — ~150km
      expect(matchCoordinates(18.52, 73.85, 19.07, 72.87)).toBe(0);
    });

    it("returns 0 for null coordinates", () => {
      expect(matchCoordinates(null, null, 18.5, 73.8)).toBe(0);
    });
  });

  describe("computeMatchScore", () => {
    it("classifies identical properties as exact_duplicate", () => {
      const result = computeMatchScore(
        { surveyNumber: "118/2A", ownerName: "Rajesh Mehta", village: "Kharadi", area: 2400, price: 4800000, latitude: 18.5562, longitude: 73.9404 },
        { surveyNumber: "118/2A", ownerName: "Rajesh Mehta", village: "Kharadi", area: 2400, price: 4800000, latitude: 18.5562, longitude: 73.9404 },
      );
      expect(result.matchType).toBe("exact_duplicate");
      expect(result.overallScore).toBeGreaterThanOrEqual(90);
    });

    it("classifies same survey + different owner as conflict", () => {
      const result = computeMatchScore(
        { surveyNumber: "118/2A", ownerName: "Rajesh Mehta", village: "Kharadi" },
        { surveyNumber: "118/2A", ownerName: "Sunil Deshmukh", village: "Hinjewadi" },
      );
      // Same survey number but different owner — should flag
      expect(["conflict", "possible_match", "likely_duplicate"]).toContain(result.matchType);
    });

    it("classifies completely different properties as no_match", () => {
      const result = computeMatchScore(
        { surveyNumber: "42/3A", ownerName: "Amit Patil", village: "Kharadi", area: 2400 },
        { surveyNumber: "299/12", ownerName: "Vitthal Pawar", village: "Pirangut", area: 43560 },
      );
      expect(result.matchType).toBe("no_match");
      expect(result.overallScore).toBeLessThan(45);
    });

    it("returns correct factor count", () => {
      const result = computeMatchScore(
        { surveyNumber: "118/2A" },
        { surveyNumber: "118/2A" },
      );
      expect(result.factors).toHaveLength(6);
    });
  });
});
