// src/modules/properties/property.service.ts

import { prisma } from "@/lib/db/client";
import type { CreatePropertyInput, UpdatePropertyInput, PropertySearchInput } from "@/lib/validation/property.schema";


// ─── Types ───

export interface PropertyListItem {
  id: string;
  title: string;
  status: string;
  price: number | null;
  areaSqft: number | null;
  surveyNumber: string | null;
  propertyType: { id: string; name: string };
  address: { city: string; district: string; latitude: number | null; longitude: number | null };
  owner: { id: string; firstName: string; lastName: string } | null;
  broker: { id: string; firstName: string; lastName: string } | null;
  riskScore: { overallScore: number; riskLevel: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyDetail extends PropertyListItem {
  description: string | null;
  khasraNumber: string | null;
  yearBuilt: number | null;
  listedAt: Date | null;
  address: {
    id: string; line1: string; line2: string | null; city: string; district: string;
    state: string; postalCode: string; latitude: number | null; longitude: number | null;
  };
  media: Array<{ id: string; fileUrl: string; mediaType: string; caption: string | null; isPrimary: boolean }>;
  documents: Array<{ id: string; originalName: string; mimeType: string; ocrStatus: string; documentType: { name: string }; createdAt: Date }>;
  verifications: Array<{ id: string; status: string; priority: string; createdAt: Date }>;
  courtPropertyLinks: Array<{ id: string; linkType: string; impactScore: number | null; courtCase: { caseNumber: string; caseStatus: string; title: string } }>;
  newspaperMentions: Array<{ id: string; relevanceScore: number; sentiment: string; article: { headline: string; publishedAt: Date } }>;
}

export interface PropertyStats {
  total: number;
  byStatus: Record<string, number>;
  byRisk: Record<string, number>;
  byType: Record<string, number>;
  avgPrice: number;
  totalArea: number;
}

// ─── Include relations ───

const LIST_INCLUDE = {
  propertyType: { select: { id: true, name: true } },
  address: { select: { city: true, district: true, latitude: true, longitude: true } },
  owner: { select: { id: true, firstName: true, lastName: true } },
  broker: { select: { id: true, firstName: true, lastName: true } },
  riskScore: { select: { overallScore: true, riskLevel: true } },
};

const DETAIL_INCLUDE = {
  ...LIST_INCLUDE,
  address: true,
  media: { orderBy: { sortOrder: "asc" as const } },
  documents: {
    include: { documentType: { select: { name: true } } },
    orderBy: { createdAt: "desc" as const },
    where: { deletedAt: null },
  },
  verifications: { orderBy: { createdAt: "desc" as const }, take: 5 },
  courtPropertyLinks: {
    include: {
      courtCase: { select: { caseNumber: true, caseStatus: true, title: true } },
    },
  },
  newspaperMentions: {
    include: {
      article: { select: { headline: true, publishedAt: true } },
    },
    orderBy: { relevanceScore: "desc" as const },
    take: 5,
  },
};

// ─── Service methods ───

export async function searchProperties(
  tenantId: string,
  input: PropertySearchInput,
): Promise<{ properties: PropertyListItem[]; total: number; page: number; totalPages: number }> {
  const where: Record<string, any> = { tenantId, deletedAt: null };

  // Text search across title, survey number, and address
  if (input.q) {
    const q = input.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { surveyNumber: { contains: q, mode: "insensitive" } },
      { khasraNumber: { contains: q, mode: "insensitive" } },
      { address: { line1: { contains: q, mode: "insensitive" } } },
      { address: { city: { contains: q, mode: "insensitive" } } },
      { owner: { OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName: { contains: q, mode: "insensitive" } },
      ]}},
    ];
  }

  if (input.status) where.status = input.status as any;
  if (input.propertyType) where.propertyTypeId = input.propertyType;
  if (input.district) where.address = { district: { equals: input.district, mode: "insensitive" } };
  if (input.brokerId) where.brokerId = input.brokerId;
  if (input.ownerId) where.ownerId = input.ownerId;
  if (input.priceMin || input.priceMax) {
    where.price = {};
    if (input.priceMin) where.price.gte = input.priceMin;
    if (input.priceMax) where.price.lte = input.priceMax;
  }
  if (input.areaMin || input.areaMax) {
    where.areaSqft = {};
    if (input.areaMin) where.areaSqft.gte = input.areaMin;
    if (input.areaMax) where.areaSqft.lte = input.areaMax;
  }
  if (input.riskLevel) {
    where.riskScore = { riskLevel: input.riskLevel as any };
  }

  // Filter by taluka/village from metadata JSONB
  if (input.taluka) {
    where.metadata = { path: ["taluka"], equals: input.taluka };
  }

  const skip = (input.page - 1) * input.limit;
  const orderBy: Record<string, any> = {
    [input.sort === "area_sqft" ? "areaSqft" : input.sort === "created_at" ? "createdAt" : input.sort === "updated_at" ? "updatedAt" : input.sort]: input.order,
  };

  const [properties, total] = await Promise.all([
    prisma.property.findMany({ where, include: LIST_INCLUDE, skip, take: input.limit, orderBy }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: properties as unknown as PropertyListItem[],
    total,
    page: input.page,
    totalPages: Math.ceil(total / input.limit),
  };
}

export async function getPropertyById(tenantId: string, id: string): Promise<PropertyDetail | null> {
  const property = await prisma.property.findFirst({
    where: { id, tenantId, deletedAt: null },
    include: DETAIL_INCLUDE,
  });
  return property as unknown as PropertyDetail | null;
}

export async function createProperty(
  tenantId: string,
  brokerId: string,
  input: CreatePropertyInput,
): Promise<PropertyDetail> {
  const { address: addressInput, metadata, ...propertyData } = input;

  const property = await prisma.property.create({
    data: {
      ...propertyData,
      tenantId,
      brokerId,
      status: "DRAFT",
      metadata: metadata || {},
      address: { create: { ...addressInput, country: addressInput.country || "IN" } },
    },
    include: DETAIL_INCLUDE,
  });

  return property as unknown as PropertyDetail;
}

export async function updateProperty(
  tenantId: string,
  id: string,
  input: UpdatePropertyInput,
): Promise<PropertyDetail> {
  const { address: addressInput, metadata, ...propertyData } = input;

  const existing = await prisma.property.findFirst({
    where: { id, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error("Property not found");

  const updateData: Record<string, any> = { ...propertyData };

  if (addressInput) {
    updateData.address = { update: addressInput };
  }
  if (metadata) {
    updateData.metadata = { ...(existing.metadata as object || {}), ...metadata };
  }
  if (input.status === "LISTED" && !existing.listedAt) {
    updateData.listedAt = new Date();
  }

  const property = await prisma.property.update({
    where: { id },
    data: updateData,
    include: DETAIL_INCLUDE,
  });

  return property as unknown as PropertyDetail;
}

export async function deleteProperty(tenantId: string, id: string): Promise<void> {
  await prisma.property.update({
    where: { id },
    data: { deletedAt: new Date(), status: "ARCHIVED" },
  });
}

export async function getPropertyStats(tenantId: string): Promise<PropertyStats> {
  const properties = await prisma.property.findMany({
    where: { tenantId, deletedAt: null },
    select: { status: true, price: true, areaSqft: true, propertyTypeId: true },
  });

  const riskScores = await prisma.riskScore.findMany({
    where: { tenantId },
    select: { riskLevel: true },
  });

  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let totalPrice = 0;
  let priceCount = 0;
  let totalArea = 0;

  for (const p of properties) {
    byStatus[p.status] = (byStatus[p.status] || 0) + 1;
    byType[p.propertyTypeId] = (byType[p.propertyTypeId] || 0) + 1;
    if (p.price) { totalPrice += Number(p.price); priceCount++; }
    if (p.areaSqft) totalArea += Number(p.areaSqft);
  }

  const byRisk: Record<string, number> = {};
  for (const r of riskScores) {
    byRisk[r.riskLevel] = (byRisk[r.riskLevel] || 0) + 1;
  }

  return {
    total: properties.length,
    byStatus,
    byRisk,
    byType,
    avgPrice: priceCount > 0 ? Math.round(totalPrice / priceCount) : 0,
    totalArea: Math.round(totalArea),
  };
}

export async function findDuplicates(tenantId: string, surveyNumber: string, excludeId?: string) {
  if (!surveyNumber) return [];
  const where: Record<string, any> = {
    tenantId,
    surveyNumber,
    deletedAt: null,
  };
  if (excludeId) where.id = { not: excludeId };
  return prisma.property.findMany({
    where,
    select: { id: true, title: true, surveyNumber: true, brokerId: true, price: true, status: true },
  });
}
