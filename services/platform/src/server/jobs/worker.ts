import { Prisma, type AIJob } from "@prisma/client";
import { ZodError } from "zod";
import { db } from "../db";
import { databaseNow } from "../clock";
import { createQuiz } from "../assessment";
import { extractStoredMaterial } from "../ingestion/staging";
import {
  parseGenerationInput,
  selectContext,
  type SourceChunk,
} from "../ai/validation";
import { OpenAICompatibleProvider } from "../ai/provider";

const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 3;
export type WorkerKind = "ingestion" | "generation";
export function parseWorkerKinds(
  value: string = "ingestion,generation",
): WorkerKind[] {
  const kinds = value.split(",").map((kind) => kind.trim());
  if (
    !kinds.length ||
    new Set(kinds).size !== kinds.length ||
    kinds.some((kind) => kind !== "ingestion" && kind !== "generation")
  )
    throw new Error(
      "WORKER_KINDS must contain ingestion, generation, or both exactly once.",
    );
  return kinds as WorkerKind[];
}
function publicFailure(error: unknown) {
  // Validation errors can contain raw model values. Only fixed allowlisted
  // messages cross this boundary; no arbitrary exception text is stored/logged.
  if (error instanceof ZodError)
    return "The generated quiz or job input did not match the required schema.";
  const message = error instanceof Error ? error.message : "";
  const allowed = new Set([
    "Material was removed before processing",
    "Material was removed during processing",
    "Source materials were removed or are no longer ready",
    "Source materials changed during generation",
    "Source materials have no readable chunks",
    "AI generation is not configured",
    "AI provider did not return a complete quiz",
    "AI provider returned invalid JSON",
    "AI quiz was not valid JSON",
    "AI response exceeded 1 MB",
    "AI source references must quote the supplied material exactly",
    "Every generated question must cite source material",
    "AI returned a different question count than requested",
    "AI returned a question type that was not requested",
    "AI returned the wrong difficulty",
    "AI omitted a requested question type",
    "Archive contains more than 100 entries",
    "Archive actual decompression limit exceeded",
    "Archive decompression limit exceeded",
    "Unsafe archive path",
    "Encrypted archives are unsupported",
    "Nested ZIP archives are forbidden",
    "Office entities and external relationships are forbidden",
    "Office macros and embedded executable content are forbidden",
    "No readable text found. Scanned images require OCR, which is not configured.",
    "Malware scan rejected the file or the scanner was unavailable",
    "Document extraction exceeded resource limits or failed.",
  ]);
  if (allowed.has(message)) return message;
  if (/^AI provider request failed with status \d{3}$/.test(message))
    return "The AI provider rejected the request. Check provider availability and configuration.";
  return "Processing failed. Check the file format and worker configuration, then try again.";
}
async function claimJob(kinds: readonly WorkerKind[]): Promise<AIJob | null> {
  const now = await databaseNow();
  const exhausted = await db.aIJob.findMany({
    where: {
      kind: { in: [...kinds] },
      status: "running",
      attempts: { gte: MAX_ATTEMPTS },
      lockedAt: { lt: new Date(now.getTime() - LEASE_MS) },
    },
    take: 100,
  });
  for (const job of exhausted) {
    await db.$transaction(async (tx) => {
      const changed = await tx.aIJob.updateMany({
        where: {
          id: job.id,
          status: "running",
          attempts: job.attempts,
          lockedAt: job.lockedAt,
        },
        data: {
          status: "failed",
          error: "Worker lease expired after the maximum retries.",
          lockedAt: null,
        },
      });
      const materialId = (job.payload as { materialId?: string })?.materialId;
      if (changed.count && job.kind === "ingestion" && materialId)
        await tx.studyMaterial.updateMany({
          where: { id: materialId, ownerId: job.ownerId },
          data: {
            status: "failed",
            error:
              "Processing worker stopped. Upload the material again to retry.",
          },
        });
    });
  }
  return db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "AIJob"
      WHERE kind IN (${Prisma.join(kinds)}) AND attempts < ${MAX_ATTEMPTS} AND (
        (status = 'queued' AND ("lockedAt" IS NULL OR "lockedAt" <= clock_timestamp())) OR
        (status = 'running' AND "lockedAt" < clock_timestamp() - INTERVAL '5 minutes')
      ) ORDER BY "createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!rows[0]) return null;
    return tx.aIJob.update({
      where: { id: rows[0].id },
      data: {
        status: "running",
        lockedAt: await databaseNow(tx),
        attempts: { increment: 1 },
        progress: 5,
        error: null,
      },
    });
  });
}
async function withLease<T>(
  job: AIJob,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return db.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT id FROM "AIJob" WHERE id=${job.id} FOR UPDATE`;
      const current = await tx.aIJob.findUnique({ where: { id: job.id } });
      if (
        !current ||
        current.status !== "running" ||
        current.attempts !== job.attempts
      )
        throw new Error("Worker lease was superseded");
      return work(tx);
    },
    { timeout: 20000 },
  );
}
async function ingest(job: AIJob) {
  const materialId = (job.payload as { materialId?: string })?.materialId;
  if (typeof materialId !== "string")
    throw new Error("Malformed ingestion job");
  const material = await db.studyMaterial.findFirst({
    where: { id: materialId, ownerId: job.ownerId },
  });
  if (!material) throw new Error("Material was removed before processing");
  await withLease(job, async (tx) => {
    await tx.studyMaterial.update({
      where: { id: material.id },
      data: { status: "processing", error: null },
    });
  });
  const { scanResult, chunks } = await extractStoredMaterial(
    material.storageKey,
    material.name,
  );
  await withLease(job, async (tx) => {
    const present = await tx.studyMaterial.findFirst({
      where: { id: material.id, ownerId: job.ownerId },
    });
    if (!present) throw new Error("Material was removed during processing");
    await tx.materialChunk.deleteMany({ where: { materialId: material.id } });
    await tx.materialChunk.createMany({
      data: chunks.map((chunk) => ({ ...chunk, materialId: material.id })),
    });
    await tx.studyMaterial.update({
      where: { id: material.id },
      data: { status: "ready", error: null },
    });
    await tx.auditLog.create({
      data: {
        userId: job.ownerId,
        resourceId: material.id,
        action:
          scanResult === "development_bypass"
            ? "material.ingested.unscanned_development"
            : "material.ingested.scanned",
      },
    });
    await tx.aIJob.update({
      where: { id: job.id },
      data: { status: "completed", progress: 100, lockedAt: null, error: null },
    });
  });
}
async function generate(job: AIJob) {
  const input = parseGenerationInput(job.payload);
  const materials = await db.studyMaterial.findMany({
    where: {
      id: { in: input.materialIds },
      ownerId: job.ownerId,
      status: "ready",
    },
    select: { id: true, name: true },
  });
  if (materials.length !== input.materialIds.length)
    throw new Error("Source materials were removed or are no longer ready");
  // Bound DB retrieval, then lexical context ranking. It is not vector/semantic search.
  const chunks: SourceChunk[] = await db.materialChunk.findMany({
    where: {
      material: { id: { in: input.materialIds }, ownerId: job.ownerId },
    },
    select: { id: true, text: true, label: true },
    orderBy: [{ materialId: "asc" }, { position: "asc" }],
    take: 4000,
  });
  const context = selectContext(chunks, input.topics || input.title);
  if (!context.length)
    throw new Error("Source materials have no readable chunks");
  await db.aIJob.updateMany({
    where: { id: job.id, status: "running", attempts: job.attempts },
    data: { progress: 25 },
  });
  const questions = await new OpenAICompatibleProvider().generate(
    input,
    context,
  );
  await withLease(job, async (tx) => {
    // Recheck ownership/existence after the provider round trip. Account/material
    // deletion never produces a quiz from a revoked source.
    await tx.$queryRaw`SELECT id FROM "StudyMaterial" WHERE "ownerId"=${job.ownerId} AND id IN (${Prisma.join(input.materialIds)}) ORDER BY id FOR UPDATE`;
    const count = await tx.studyMaterial.count({
      where: {
        id: { in: input.materialIds },
        ownerId: job.ownerId,
        status: "ready",
      },
    });
    if (count !== input.materialIds.length)
      throw new Error("Source materials changed during generation");
    const quiz = await createQuiz(
      job.ownerId,
      {
        title: input.title,
        description: `Generated from ${materials.map((m) => m.name).join(", ")}. Check source citations before assigning.`,
        questions,
        settings: {
          durationMinutes: input.durationMinutes,
          shuffleQuestions: false,
          shuffleOptions: false,
          mode: "practice",
          showExplanations: true,
        },
      },
      tx,
    );
    await tx.aIJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        progress: 100,
        resultQuizId: quiz.id,
        lockedAt: null,
        error: null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: job.ownerId,
        resourceId: quiz.id,
        action: "quiz.generated",
      },
    });
  });
}
export async function runNextJob(
  kinds: readonly WorkerKind[] = ["ingestion", "generation"],
): Promise<boolean> {
  const allowed = parseWorkerKinds(kinds.join(","));
  const job = await claimJob(allowed);
  if (!job) return false;
  const heartbeat = setInterval(() => {
    void db.$executeRaw`UPDATE "AIJob" SET "lockedAt"=clock_timestamp() WHERE id=${job.id} AND status='running' AND attempts=${job.attempts}`.catch(
      () => {
        /* Lease expires safely if database is unavailable. */
      },
    );
  }, 30000);
  heartbeat.unref();
  try {
    if (job.kind === "ingestion") await ingest(job);
    else if (job.kind === "generation") await generate(job);
    else throw new Error("Unsupported job type");
  } catch (error) {
    const terminal = job.attempts >= MAX_ATTEMPTS,
      message = publicFailure(error);
    const recorded = await withLease(job, async (tx) => {
      const now = await databaseNow(tx);
      await tx.aIJob.update({
        where: { id: job.id },
        data: {
          status: terminal ? "failed" : "queued",
          error: message,
          lockedAt: terminal
            ? null
            : new Date(
                now.getTime() + Math.min(60000, 5000 * 2 ** (job.attempts - 1)),
              ),
        },
      });
      const materialId = (job.payload as { materialId?: string })?.materialId;
      if (job.kind === "ingestion" && materialId)
        await tx.studyMaterial.updateMany({
          where: { id: materialId, ownerId: job.ownerId },
          data: { status: terminal ? "failed" : "queued", error: message },
        });
      return true;
    }).catch(() => false); // Deleted/reclaimed jobs must not be overwritten.
    if (recorded)
      console.error(
        `Job ${job.id} ${terminal ? "failed" : "will retry"}: ${message}`,
      );
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
