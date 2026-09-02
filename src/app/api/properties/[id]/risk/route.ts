import { NextRequest } from "next/server";
import { authenticate, apiSuccess, apiError } from "@/lib/auth/middleware";
import { prisma } from "@/lib/db/client";

interface Params { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const auth = authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  try {
    const risk = await prisma.riskScore.findUnique({
      where: { propertyId: id },
      include: { factors: { include: { factorDef: true } } },
    });

    if (!risk) return apiSuccess({ risk: null, factors: [] });

    return apiSuccess({
      risk: {
        overallScore: risk.overallScore,
        riskLevel: risk.riskLevel,
        aiNarrative: risk.aiNarrative,
        computedAt: risk.computedAt,
      },
      factors: risk.factors.map((f: any) => ({
        name: f.factorDef.name,
        category: f.factorDef.category,
        score: f.factorScore,
        weight: f.weight,
        explanation: f.explanation,
      })),
    });
  } catch (error: any) {
    return apiError(error.message || "Failed to fetch risk data", 500);
  }
}
