import path from "node:path";
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import { localStorage, scanPolicy } from "./ingestion/storage";
import { MAX_FILE_BYTES } from "./ingestion/archive";
import { SUPPORTED_EXTENSIONS } from "./ingestion/extract";
import { parseGenerationInput } from "./ai/validation";
import { providerConfiguration } from "./ai/provider";
import { drainStorageDeletions } from "./storage-cleanup";

const materialSelection = {
  id: true,
  name: true,
  type: true,
  size: true,
  status: true,
  error: true,
  createdAt: true,
  _count: { select: { chunks: true } },
} as const;
function view(material: {
  id: string;
  name: string;
  type: string;
  size: number;
  status: string;
  error: string | null;
  createdAt: Date;
  _count: { chunks: number };
}) {
  return {
    id: material.id,
    name: material.name,
    type: material.type,
    size: material.size,
    status: material.status,
    error: material.error,
    createdAt: material.createdAt.toISOString(),
    chunkCount: material._count.chunks,
  };
}
export async function listMaterials(userId: string) {
  return (
    await db.studyMaterial.findMany({
      where: { ownerId: userId },
      select: materialSelection,
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  ).map(view);
}
export async function uploadMaterial(userId: string, file: File) {
  if (
    !file ||
    typeof file.arrayBuffer !== "function" ||
    file.size < 1 ||
    file.size > MAX_FILE_BYTES
  )
    throw new AppError(
      "INVALID_FILE",
      "Upload one file between 1 byte and 10 MB.",
      400,
    );
  const name = path
      .basename(file.name)
      .replace(/[\u0000-\u001f]/g, "")
      .slice(0, 200),
    extension = path.extname(name).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(extension))
    throw new AppError(
      "UNSUPPORTED_FILE",
      "Supported files: PDF, DOCX, TXT, MD, CSV, XLSX, PPTX and ZIP.",
      400,
    );
  try {
    scanPolicy();
  } catch (error) {
    throw new AppError("SCANNER_UNAVAILABLE", (error as Error).message, 503);
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length !== file.size || bytes.length > MAX_FILE_BYTES)
    throw new AppError(
      "INVALID_FILE",
      "File size does not match its contents.",
      400,
    );
  const storageKey = await localStorage.put(bytes);
  try {
    return await db.$transaction(async (tx) => {
      // Serialize per-user quotas, preventing concurrent uploads from bypassing them.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
      const aggregate = await tx.studyMaterial.aggregate({
        where: { ownerId: userId },
        _sum: { size: true },
        _count: true,
      });
      if (
        aggregate._count >= 100 ||
        (aggregate._sum.size || 0) + bytes.length > 100 * 1024 * 1024
      )
        throw new AppError(
          "MATERIAL_QUOTA",
          "Your library is limited to 100 files and 100 MB.",
          409,
        );
      const material = await tx.studyMaterial.create({
        data: {
          ownerId: userId,
          name,
          type: extension.slice(1),
          size: bytes.length,
          storageKey,
          status: "queued",
        },
        select: materialSelection,
      });
      await tx.aIJob.create({
        data: {
          ownerId: userId,
          kind: "ingestion",
          payload: { materialId: material.id },
        },
      });
      return view(material);
    });
  } catch (error) {
    await localStorage.delete(storageKey);
    throw error;
  }
}
export async function deleteMaterial(userId: string, id: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StudyMaterial" WHERE id=${id} FOR UPDATE`;
    const material = await tx.studyMaterial.findFirst({
      where: { id, ownerId: userId },
    });
    if (!material)
      throw new AppError("RESOURCE_NOT_FOUND", "Material not found.", 404);
    await tx.storageDeletion.upsert({
      where: { storageKey: material.storageKey },
      create: { storageKey: material.storageKey },
      update: {},
    });
    await tx.studyMaterial.delete({ where: { id: material.id } });
  });
  await drainStorageDeletions();
  return { ok: true };
}
export async function getChunks(userId: string, id: string) {
  const material = await db.studyMaterial.findFirst({
    where: { id, ownerId: userId },
    select: { id: true },
  });
  if (!material)
    throw new AppError("RESOURCE_NOT_FOUND", "Material not found.", 404);
  return db.materialChunk.findMany({
    where: { materialId: id },
    select: { id: true, text: true, label: true },
    orderBy: { position: "asc" },
    take: 100,
  });
}
export function generationConfig() {
  return providerConfiguration();
}
export async function enqueueGeneration(userId: string, body: unknown) {
  const input = parseGenerationInput(body);
  if (!generationConfig().configured)
    throw new AppError(
      "AI_UNCONFIGURED",
      "Add AI provider settings to enable generation.",
      503,
    );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR UPDATE`;
    const materials = await tx.studyMaterial.findMany({
      where: {
        id: { in: input.materialIds },
        ownerId: userId,
        status: "ready",
      },
      select: { id: true },
    });
    if (materials.length !== input.materialIds.length)
      throw new AppError(
        "MATERIAL_NOT_READY",
        "Choose only your successfully processed materials.",
        400,
      );
    const pending = await tx.aIJob.count({
      where: {
        ownerId: userId,
        kind: "generation",
        status: { in: ["queued", "running"] },
      },
    });
    if (pending >= 3)
      throw new AppError(
        "GENERATION_LIMIT",
        "Wait for a pending generation job to finish.",
        429,
      );
    const job = await tx.aIJob.create({
      data: {
        ownerId: userId,
        kind: "generation",
        payload: input as Prisma.InputJsonValue,
      },
    });
    return { id: job.id, status: job.status };
  });
}
export async function getJob(userId: string, id: string) {
  const job = await db.aIJob.findFirst({
    where: { id, ownerId: userId },
    select: {
      id: true,
      status: true,
      progress: true,
      error: true,
      resultQuizId: true,
    },
  });
  if (!job) throw new AppError("RESOURCE_NOT_FOUND", "Job not found.", 404);
  return job;
}
