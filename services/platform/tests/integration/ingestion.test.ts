import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.pathname !== "/quizbee_v2_test" ||
  database.port !== "55439"
)
  throw new Error("Use the isolated QuizBee test database.");

test("local PostgreSQL upload, worker, private chunks and deletion complete with real persistence", async () => {
  const prior = {
    ALLOW_UNSCANNED_UPLOADS: process.env.ALLOW_UNSCANNED_UPLOADS,
    NODE_ENV: process.env.NODE_ENV,
  };
  process.env.ALLOW_UNSCANNED_UPLOADS = "true";
  Object.assign(process.env, { NODE_ENV: "test" });
  const { db } = await import("../../src/server/db");
  const api = await import("../../src/server/materials");
  const { runNextJob } = await import("../../src/server/jobs/worker");
  const { localStorage } = await import("../../src/server/ingestion/storage");
  const { drainStorageDeletions } =
    await import("../../src/server/storage-cleanup");
  const id = randomUUID();
  let userId: string | undefined;
  try {
    const user = await db.user.create({
      data: {
        name: "Ingestion integration fixture",
        email: `ingestion-${id}@example.invalid`,
        passwordHash: "not-a-login-credential",
      },
    });
    userId = user.id;
    const material = await api.uploadMaterial(
      user.id,
      new File(
        [
          "# Cells\nATP stores energy in cells.\n# Organelles\nMitochondria generate ATP.",
        ],
        "fixture.md",
        { type: "text/markdown" },
      ),
    );
    assert.equal(material.status, "queued");
    await assert.rejects(() => api.getChunks("different-user", material.id));
    for (let i = 0; i < 20; i++) {
      await runNextJob();
      if (
        (await db.studyMaterial.findUnique({ where: { id: material.id } }))
          ?.status === "ready"
      )
        break;
    }
    const ready = await db.studyMaterial.findUniqueOrThrow({
      where: { id: material.id },
    });
    assert.equal(ready.status, "ready");
    const chunks = await api.getChunks(user.id, material.id);
    assert.equal(chunks.length, 2);
    assert.match(chunks[0].text, /ATP stores energy/);
    const job = await db.aIJob.findFirstOrThrow({
      where: { ownerId: user.id, kind: "ingestion" },
    });
    assert.equal(job.status, "completed");
    assert.equal(job.progress, 100);
    await assert.rejects(() => api.getJob("different-user", job.id));
    await api.deleteMaterial(user.id, material.id);
    assert.equal(
      await db.materialChunk.count({ where: { materialId: material.id } }),
      0,
    );
    await drainStorageDeletions();
    await assert.rejects(() => localStorage.read(ready.storageKey));
  } finally {
    if (userId) {
      const leftovers = await db.studyMaterial.findMany({
        where: { ownerId: userId },
      });
      for (const item of leftovers) await localStorage.delete(item.storageKey);
      await db.user.delete({ where: { id: userId } });
    }
    await db.$disconnect();
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

async function waitForState(check: () => Promise<boolean>) {
  for (let i = 0; i < 200; i++) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected database concurrency state was not reached");
}

for (const scenario of [
  "stale lease",
  "deleted source",
  "malformed provider value",
  "publication race",
] as const) {
  test(
    `generation ${scenario} cannot publish a duplicate or revoked-source quiz`,
    { timeout: 20000 },
    async () => {
      const saved = {
        AI_BASE_URL: process.env.AI_BASE_URL,
        AI_API_KEY: process.env.AI_API_KEY,
        AI_MODEL: process.env.AI_MODEL,
      };
      const { db } = await import("../../src/server/db");
      const { enqueueGeneration, deleteMaterial } =
        await import("../../src/server/materials");
      const { runNextJob } = await import("../../src/server/jobs/worker");
      let firstResponse: ServerResponse | undefined,
        firstPayload = "";
      let arrived!: () => void;
      const firstArrived = new Promise<void>((resolve) => {
        arrived = resolve;
      });
      let requests = 0;
      const server = createServer(async (req, res) => {
        let raw = "";
        for await (const bytes of req) raw += bytes;
        const input = JSON.parse(raw),
          context = JSON.parse(input.messages[1].content).sourceChunks[0];
        const content = JSON.stringify({
          questions: [
            {
              id: "q1",
              type:
                scenario === "malformed provider value"
                  ? "SYNTHETIC_PRIVATE_MODEL_VALUE"
                  : "short_answer",
              prompt: "What stores energy?",
              choices: [],
              correctAnswer: "ATP",
              explanation: "ATP stores energy.",
              difficulty: "easy",
              topic: "Cells",
              points: 1,
              sourceRefs: [
                {
                  chunkId: context.id,
                  label: context.label,
                  quote: "ATP stores energy",
                },
              ],
              tags: [],
            },
          ],
        });
        const payload = JSON.stringify({
          choices: [{ message: { content }, finish_reason: "stop" }],
        });
        if (++requests === 1) {
          firstResponse = res;
          firstPayload = payload;
          arrived();
        } else {
          res.setHeader("content-type", "application/json");
          res.end(payload);
        }
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      let userId: string | undefined;
      let storageKey: string | undefined;
      let firstWork: Promise<boolean> | undefined;
      let unlockUser: (() => void) | undefined,
        locker: Promise<unknown> | undefined,
        deletion: Promise<unknown> | undefined;
      const originalLogger = console.error,
        logs: string[] = [];
      if (scenario === "malformed provider value")
        console.error = (...values: unknown[]) => {
          logs.push(values.join(" "));
        };
      try {
        process.env.AI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}/v1`;
        process.env.AI_API_KEY = "local-fixture-key";
        process.env.AI_MODEL = "fixture-model";
        const user = await db.user.create({
          data: {
            name: "Generation fixture",
            email: `generation-${randomUUID()}@example.invalid`,
            passwordHash: "not-a-login-credential",
          },
        });
        userId = user.id;
        storageKey = `${randomUUID()}.bin`;
        const material = await db.studyMaterial.create({
          data: {
            ownerId: user.id,
            name: "cells.txt",
            type: "txt",
            size: 25,
            storageKey,
            status: "ready",
            chunks: {
              create: {
                text: "ATP stores energy in cells.",
                label: "section 1",
                position: 0,
              },
            },
          },
        });
        const job = await enqueueGeneration(user.id, {
          materialIds: [material.id],
          title: "Cells",
          questionCount: 1,
          difficulty: "easy",
          questionTypes: ["short_answer"],
          durationMinutes: null,
        });
        firstWork = runNextJob();
        await firstArrived;
        if (scenario === "stale lease") {
          await db.aIJob.update({
            where: { id: job.id },
            data: { lockedAt: new Date(Date.now() - 6 * 60_000) },
          });
          await runNextJob();
        } else if (scenario === "deleted source")
          await deleteMaterial(user.id, material.id);
        if (scenario === "publication race") {
          let signalLocked!: () => void;
          const locked = new Promise<void>((resolve) => {
            signalLocked = resolve;
          });
          const release = new Promise<void>((resolve) => {
            unlockUser = resolve;
          });
          let lockerPid = 0;
          locker = db.$transaction(
            async (tx) => {
              await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
              const [{ pid }] = await tx.$queryRaw<
                { pid: number }[]
              >`SELECT pg_backend_pid() AS pid`;
              lockerPid = pid;
              signalLocked();
              await release;
            },
            { timeout: 15000 },
          );
          await locked;
          firstResponse!.setHeader("content-type", "application/json");
          firstResponse!.end(firstPayload);
          let publisherPid = 0;
          await waitForState(async () => {
            const rows = await db.$queryRaw<
              { pid: number }[]
            >`SELECT pid FROM pg_stat_activity WHERE ${lockerPid} = ANY(pg_blocking_pids(pid)) AND query LIKE '%INSERT INTO%Quiz%'`;
            publisherPid = rows[0]?.pid || 0;
            return publisherPid > 0;
          });
          let deleted = false;
          deletion = deleteMaterial(user.id, material.id).then(() => {
            deleted = true;
          });
          await waitForState(async () => {
            if (deleted) return true;
            const rows = await db.$queryRaw<
              { pid: number }[]
            >`SELECT pid FROM pg_stat_activity WHERE ${publisherPid} = ANY(pg_blocking_pids(pid))`;
            return rows.length > 0;
          });
          assert.equal(
            deleted,
            false,
            "deletion must wait for the transaction that validated the source",
          );
          unlockUser?.();
          await locker;
          await deletion;
        }
        if (!firstResponse!.writableEnded) {
          firstResponse!.setHeader("content-type", "application/json");
          firstResponse!.end(firstPayload);
        }
        await firstWork;
        const result = await db.aIJob.findUniqueOrThrow({
            where: { id: job.id },
          }),
          quizzes = await db.quiz.count({ where: { ownerId: user.id } });
        if (scenario === "stale lease" || scenario === "publication race") {
          assert.equal(result.status, "completed");
          assert.equal(result.attempts, scenario === "stale lease" ? 2 : 1);
          assert.ok(result.resultQuizId);
          assert.equal(quizzes, 1);
        } else {
          assert.notEqual(result.status, "completed");
          assert.equal(result.resultQuizId, null);
          assert.equal(quizzes, 0);
          if (scenario === "deleted source")
            assert.match(result.error || "", /Source materials changed/);
          else {
            assert.ok(result.error);
            assert.ok(logs.length);
            assert.equal(
              `${result.error} ${logs.join(" ")}`.includes(
                "SYNTHETIC_PRIVATE_MODEL_VALUE",
              ),
              false,
              "private invalid model fields must not enter persisted errors or logs",
            );
          }
        }
      } finally {
        unlockUser?.();
        await locker?.catch(() => {});
        await deletion?.catch(() => {});
        if (firstResponse && !firstResponse.writableEnded)
          firstResponse.end(firstPayload);
        await firstWork?.catch(() => {});
        console.error = originalLogger;
        await new Promise<void>((resolve) => server.close(() => resolve()));
        if (userId) await db.user.delete({ where: { id: userId } });
        if (storageKey)
          await db.storageDeletion.deleteMany({ where: { storageKey } });
        await db.$disconnect();
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
      }
    },
  );
}
