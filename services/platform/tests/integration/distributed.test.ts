import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import { db } from "../../src/server/db";
import {
  createQuiz,
  startAttempt,
  saveAnswers,
  getAttempt,
} from "../../src/server/assessment";
import { authenticate, createSession, rateLimit } from "../../src/server/auth";
import { digestToken, newToken } from "../../src/server/auth-core";
import { verifyEmail } from "../../src/server/mail";
import * as worker from "../../src/server/jobs/worker";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error("Use the isolated QuizBee test database.");
test.after(() => db.$disconnect());
async function fixture() {
  return db.user.create({
    data: {
      name: "Distributed fixture",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "fixture-hash",
    },
  });
}
async function databaseNow() {
  const [row] = await db.$queryRaw<
    { now: Date }[]
  >`SELECT clock_timestamp() AS now`;
  return row.now;
}

test("attempt eligibility uses the database clock when API clocks run fast or slow", async (t) => {
  const user = await fixture();
  try {
    const quiz = await createQuiz(user.id, {
      title: "Clock test",
      description: "",
      questions: [
        {
          id: "q",
          type: "numeric",
          prompt: "One plus one",
          choices: [],
          correctAnswer: 2,
        },
      ],
      settings: {
        mode: "practice",
        durationMinutes: 5,
        shuffleQuestions: false,
        shuffleOptions: false,
        showExplanations: true,
      },
    });
    const real = await databaseNow();
    t.mock.timers.enable({ apis: ["Date"], now: real.getTime() + 86400000 });
    const attempt = await startAttempt(user.id, quiz.id, {});
    assert.ok(
      Math.abs(new Date(attempt.startedAt).getTime() - real.getTime()) < 10000,
      "a fast API clock must not create a future deadline",
    );
    t.mock.timers.setTime(real.getTime() - 86400000);
    await saveAnswers(user.id, attempt.id, { revision: 0, answers: { q: 2 } });
    await db.attempt.update({
      where: { id: attempt.id },
      data: { expiresAt: new Date(real.getTime() - 1000) },
    });
    await assert.rejects(
      saveAnswers(user.id, attempt.id, { revision: 1, answers: { q: 1 } }),
      { code: "ATTEMPT_EXPIRED" },
    );
    assert.equal((await getAttempt(user.id, attempt.id)).score, 1);
  } finally {
    t.mock.timers.reset();
    await db.user.delete({ where: { id: user.id } });
  }
});

test(
  "an answer waiting on a row lock must recheck the deadline after acquiring it",
  { timeout: 15000 },
  async () => {
    const user = await fixture();
    let release = () => {};
    let blocker: Promise<void> | undefined;
    try {
      const quiz = await createQuiz(user.id, {
        title: "Lock deadline test",
        description: "",
        questions: [
          {
            id: "q",
            type: "numeric",
            prompt: "One plus one",
            choices: [],
            correctAnswer: 2,
          },
        ],
        settings: {
          mode: "practice",
          durationMinutes: 5,
          shuffleQuestions: false,
          shuffleOptions: false,
          showExplanations: true,
        },
      });
      const attempt = await startAttempt(user.id, quiz.id, {});
      const deadline = new Date((await databaseNow()).getTime() + 2000);
      await db.attempt.update({
        where: { id: attempt.id },
        data: { expiresAt: deadline },
      });
      let signalLocked = () => {};
      const locked = new Promise<void>((resolve) => {
        signalLocked = resolve;
      });
      const released = new Promise<void>((resolve) => {
        release = resolve;
      });
      blocker = db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM "Attempt" WHERE id=${attempt.id} FOR UPDATE`;
          signalLocked();
          await released;
        },
        { timeout: 10000 },
      );
      await locked;
      const pending = saveAnswers(user.id, attempt.id, {
        revision: 0,
        answers: { q: 2 },
      }).then(
        () => null,
        (error: unknown) => error,
      );
      let waiting: { startedAt: Date } | undefined;
      for (let tries = 0; tries < 100 && !waiting; tries++) {
        [waiting] = await db.$queryRaw<{ startedAt: Date }[]>`
        SELECT query_start AS "startedAt" FROM pg_stat_activity
        WHERE datname=current_database() AND wait_event_type='Lock'
          AND query LIKE 'SELECT "id" FROM "Attempt"%'
        ORDER BY query_start DESC LIMIT 1`;
        if (!waiting) await delay(10);
      }
      assert.ok(
        waiting,
        "the answer request must actually wait on the held lock",
      );
      assert.ok(
        waiting.startedAt < deadline,
        "the request must begin before the deadline",
      );
      await db.$executeRaw`SELECT pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM (${deadline}::timestamptz - clock_timestamp()))) + 0.03)`;
      release();
      await blocker;
      const error = await pending;
      assert.equal(
        (error as { code?: string } | null)?.code,
        "ATTEMPT_EXPIRED",
      );
      assert.deepEqual(
        (await db.attempt.findUniqueOrThrow({ where: { id: attempt.id } }))
          .answers,
        {},
      );
    } finally {
      release();
      await blocker;
      await db.user.delete({ where: { id: user.id } });
    }
  },
);

test("session, recovery and rate-limit expiry ignore application clock skew", async (t) => {
  const user = await fixture(),
    key = `clock:${randomUUID()}`;
  try {
    const real = await databaseNow();
    const verifyToken = newToken();
    await db.verificationToken.create({
      data: {
        userId: user.id,
        type: "verify",
        tokenHash: digestToken(verifyToken),
        expiresAt: new Date(real.getTime() + 60000),
      },
    });
    t.mock.timers.enable({ apis: ["Date"], now: real.getTime() + 86400000 });
    const session = await createSession(user.id, user.passwordHash);
    assert.ok(
      Math.abs(session.expiresAt.getTime() - real.getTime() - 12 * 3600000) <
        10000,
    );
    assert.equal((await authenticate(session.token)).user.id, user.id);
    await verifyEmail({ token: verifyToken });
    await rateLimit(key, 1, 60000);
    t.mock.timers.setTime(real.getTime() + 2 * 86400000);
    await assert.rejects(rateLimit(key, 1, 60000), { code: "RATE_LIMITED" });
    await db.session.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(real.getTime() - 1000) },
    });
    t.mock.timers.setTime(real.getTime() - 86400000);
    await assert.rejects(authenticate(session.token), {
      code: "AUTH_REQUIRED",
    });
  } finally {
    t.mock.timers.reset();
    await db.user.delete({ where: { id: user.id } });
    await db.rateLimit.deleteMany({ where: { id: digestToken(key) } });
  }
});

test("role-specific concurrent workers do not claim other roles and retry on database time", async (t) => {
  const user = await fixture();
  try {
    const real = await databaseNow();
    const generation = await db.aIJob.create({
      data: { ownerId: user.id, kind: "generation", payload: {} },
    });
    const jobs = await Promise.all(
      [1, 2].map(() =>
        db.aIJob.create({
          data: {
            ownerId: user.id,
            kind: "ingestion",
            payload: { materialId: "removed" },
          },
        }),
      ),
    );
    t.mock.timers.enable({ apis: ["Date"], now: real.getTime() - 86400000 });
    const run = worker.runNextJob as (
      kinds: readonly string[],
    ) => Promise<boolean>;
    assert.deepEqual(
      await Promise.all([run(["ingestion"]), run(["ingestion"])]),
      [true, true],
    );
    assert.equal(
      (await db.aIJob.findUniqueOrThrow({ where: { id: generation.id } }))
        .attempts,
      0,
    );
    for (const job of jobs) {
      const saved = await db.aIJob.findUniqueOrThrow({ where: { id: job.id } });
      assert.equal(saved.attempts, 1);
      assert.equal(saved.status, "queued");
      assert.ok(saved.lockedAt && saved.lockedAt.getTime() > real.getTime());
    }
    assert.equal(
      await run(["ingestion"]),
      false,
      "backoff cannot be bypassed by a slow host clock",
    );
  } finally {
    t.mock.timers.reset();
    await db.user.delete({ where: { id: user.id } });
  }
});
