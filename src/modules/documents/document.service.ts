// src/modules/documents/document.service.ts

import { prisma } from "@/lib/db/client";
import { getStorageProvider } from "@/lib/storage/storage";
import { validateFileType, validateFileSize } from "@/lib/validation/document.schema";
import type { DocumentSearchInput } from "@/lib/validation/document.schema";


// ─── Types ───

export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface DocumentRecord {
  id: string;
  propertyId: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSizeBytes: bigint;
  ocrStatus: string;
  checksumSha256: string;
  documentType: { id: string; name: string; requiresOcr: boolean };
  uploader: { id: string; firstName: string; lastName: string };
  processedAt: Date | null;
  createdAt: Date;
}

// ─── Service ───

export async function uploadDocument(
  tenantId: string,
  userId: string,
  propertyId: string,
  documentTypeId: string,
  file: UploadedFile,
): Promise<DocumentRecord> {
  // Validate file
  if (!validateFileType(file.mimeType)) {
    throw new Error(`File type ${file.mimeType} is not allowed. Accepted: PDF, JPEG, PNG, TIFF, WebP`);
  }
  if (!validateFileSize(file.size)) {
    throw new Error("File exceeds the 25 MB size limit");
  }

  // Verify property exists and belongs to tenant
  const property = await prisma.property.findFirst({
    where: { id: propertyId, tenantId, deletedAt: null },
  });
  if (!property) throw new Error("Property not found");

  // Verify document type exists
  const docType = await prisma.documentType.findUnique({
    where: { id: documentTypeId },
  });
  if (!docType) throw new Error("Invalid document type");

  // Upload to storage
  const storage = getStorageProvider();
  const result = await storage.upload(file.buffer, file.originalName, file.mimeType);

  // Check for duplicate by checksum
  const existing = await prisma.document.findFirst({
    where: { propertyId, checksumSha256: result.checksum, deletedAt: null },
  });
  if (existing) {
    // Delete the just-uploaded file since it's a duplicate
    await storage.delete(result.fileUrl);
    throw new Error(`This exact file has already been uploaded (${existing.originalName})`);
  }

  // Create database record
  const document = await prisma.document.create({
    data: {
      propertyId,
      uploadedBy: userId,
      documentTypeId,
      originalName: file.originalName,
      fileUrl: result.fileUrl,
      mimeType: file.mimeType,
      fileSizeBytes: BigInt(result.sizeBytes),
      ocrStatus: docType.requiresOcr ? "PENDING" : "COMPLETED",
      checksumSha256: result.checksum,
    },
    include: {
      documentType: { select: { id: true, name: true, requiresOcr: true } },
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return document as unknown as DocumentRecord;
}

export async function getDocumentsByProperty(
  tenantId: string,
  propertyId: string,
): Promise<DocumentRecord[]> {
  // Verify property belongs to tenant
  const property = await prisma.property.findFirst({
    where: { id: propertyId, tenantId, deletedAt: null },
  });
  if (!property) throw new Error("Property not found");

  const documents = await prisma.document.findMany({
    where: { propertyId, deletedAt: null },
    include: {
      documentType: { select: { id: true, name: true, requiresOcr: true } },
      uploader: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return documents as unknown as DocumentRecord[];
}

export async function searchDocuments(
  tenantId: string,
  input: DocumentSearchInput,
): Promise<{ documents: DocumentRecord[]; total: number }> {
  const where: Record<string, any> = { deletedAt: null };

  if (input.propertyId) {
    where.propertyId = input.propertyId;
    // Verify tenant access
    const property = await prisma.property.findFirst({
      where: { id: input.propertyId, tenantId, deletedAt: null },
    });
    if (!property) throw new Error("Property not found");
  }
  if (input.documentTypeId) where.documentTypeId = input.documentTypeId;
  if (input.ocrStatus) where.ocrStatus = input.ocrStatus;

  const skip = (input.page - 1) * input.limit;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        documentType: { select: { id: true, name: true, requiresOcr: true } },
        uploader: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: input.limit,
    }),
    prisma.document.count({ where }),
  ]);

  return { documents: documents as unknown as DocumentRecord[], total };
}

export async function getDocumentById(
  tenantId: string,
  id: string,
): Promise<DocumentRecord | null> {
  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      documentType: { select: { id: true, name: true, requiresOcr: true } },
      uploader: { select: { id: true, firstName: true, lastName: true } },
      property: { select: { tenantId: true } },
    },
  });

  if (!document) return null;
  if ((document as any).property.tenantId !== tenantId) return null;

  return document as unknown as DocumentRecord;
}

export async function deleteDocument(tenantId: string, id: string): Promise<void> {
  const document = await getDocumentById(tenantId, id);
  if (!document) throw new Error("Document not found");

  // Soft delete in database
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Delete from storage
  const storage = getStorageProvider();
  await storage.delete(document.fileUrl);
}

export async function triggerOcr(tenantId: string, documentId: string): Promise<void> {
  const document = await getDocumentById(tenantId, documentId);
  if (!document) throw new Error("Document not found");

  // Update status
  await prisma.document.update({
    where: { id: documentId },
    data: { ocrStatus: "PROCESSING" },
  });

  // In production: queue OCR job via BullMQ
  // For prototype: simulated OCR runs synchronously or via setTimeout
  // await ocrQueue.add("process", { documentId, fileUrl: document.fileUrl });
}

export async function getPropertyDocumentCompleteness(
  tenantId: string,
  propertyId: string,
): Promise<{
  total: number;
  uploaded: number;
  mandatory: { name: string; uploaded: boolean }[];
  completeness: number;
}> {
  const allTypes = await prisma.documentType.findMany();
  const uploaded = await prisma.document.findMany({
    where: { propertyId, deletedAt: null },
    select: { documentTypeId: true },
  });

  const uploadedTypeIds = new Set(uploaded.map((d: any) => d.documentTypeId));
  const mandatory = allTypes
    .filter((t: any) => t.isMandatory)
    .map((t: any) => ({ name: t.name, uploaded: uploadedTypeIds.has(t.id) }));

  const mandatoryUploaded = mandatory.filter((m: any) => m.uploaded).length;

  return {
    total: allTypes.length,
    uploaded: uploaded.length,
    mandatory,
    completeness: mandatory.length > 0 ? Math.round((mandatoryUploaded / mandatory.length) * 100) : 100,
  };
}
