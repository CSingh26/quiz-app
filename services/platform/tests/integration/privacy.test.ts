import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { db } from "../../src/server/db";
import { register } from "../../src/server/auth";
import { deleteAccount } from "../../src/server/account";
import { drainStorageDeletions } from "../../src/server/storage-cleanup";
import { localStorage } from "../../src/server/ingestion/storage";
import {
  createQuiz,
  startAttempt,
  saveAnswers,
} from "../../src/server/assessment";
import { dashboard } from "../../src/server/dashboard";
import { finalizeDueAttempts } from "../../src/server/maintenance";
import { getReview } from "../../src/server/review";
const url = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/quizbee_v2_test" ||
  url.port !== "55439"
)
  throw new Error("Use the isolated QuizBee test database.");
test.after(() => db.$disconnect());

test("account deletion removes stored files and deletion outbox retries failed storage", async () => {
  const account = await register({
    name: "Privacy test",
    email: `${randomUUID()}@example.invalid`,
    password: "Long private test password",
  });
  const key = await localStorage.put(Buffer.from("private test content"));
  const queuedKey = await localStorage.put(
    Buffer.from("retry private content"),
  );
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { id: account.user.id },
    });
    await db.studyMaterial.create({
      data: {
        ownerId: user.id,
        name: "test.txt",
        type: "txt",
        size: 20,
        storageKey: key,
      },
    });
    await deleteAccount(user.id, user.passwordHash);
    assert.equal(await db.user.findUnique({ where: { id: user.id } }), null);
    assert.equal(
      (await localStorage.read(key)).toString(),
      "private test content",
    );
    assert.ok(
      await db.storageDeletion.findUnique({ where: { storageKey: key } }),
    );
    await drainStorageDeletions();
    await assert.rejects(localStorage.read(key));
    const pending = await db.storageDeletion.create({
      data: { storageKey: queuedKey },
    });
    await drainStorageDeletions({
      ...localStorage,
      async delete() {
        throw new Error("storage temporarily unavailable");
      },
    });
    assert.equal(
      (
        await db.storageDeletion.findUniqueOrThrow({
          where: { id: pending.id },
        })
      ).attempts,
      1,
    );
    assert.equal(
      (await localStorage.read(queuedKey)).toString(),
      "retry private content",
    );
    await drainStorageDeletions();
    assert.equal(
      await db.storageDeletion.findUnique({ where: { id: pending.id } }),
      null,
    );
    await assert.rejects(localStorage.read(queuedKey));
  } finally {
    await db.user.deleteMany({ where: { id: account.user.id } });
    await db.storageDeletion.deleteMany({
      where: { storageKey: { in: [key, queuedKey] } },
    });
    await Promise.all([
      localStorage.delete(key),
      localStorage.delete(queuedKey),
    ]);
  }
});

test("dashboard and human review finalize abandoned deadlines using saved responses", async () => {
  const user = await db.user.create({
    data: {
      name: "Expiry fixture",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "test",
    },
  });
  try {
    const quiz = await createQuiz(user.id, {
      title: "Expiry test",
      description: "",
      questions: [
        {
          id: "q",
          type: "numeric",
          prompt: "1+1",
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
    const first = await startAttempt(user.id, quiz.id, {});
    await saveAnswers(user.id, first.id, { answers: { q: 2 }, revision: 0 });
    const deadline = new Date(Date.now() - 1);
    await db.attempt.update({
      where: { id: first.id },
      data: { expiresAt: deadline },
    });
    const home = await dashboard(user.id);
    assert.equal(home.attempts[0].status, "expired");
    assert.equal(home.attempts[0].score, 1);
    assert.equal(home.attempts[0].submittedAt?.getTime(), deadline.getTime());
    const second = await startAttempt(user.id, quiz.id, {});
    await db.attempt.update({
      where: { id: second.id },
      data: { expiresAt: deadline },
    });
    assert.equal((await getReview(user.id, second.id)).score, 0);
  } finally {
    await db.user.delete({ where: { id: user.id } });
  }
});

test("expiry sweep tolerates account deletion after listing due attempts", async () => {
  const originalFind = db.attempt.findMany;
  const user = await db.user.create({
    data: {
      name: "Deleted fixture",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "test",
    },
  });
  try {
    const quiz = await createQuiz(user.id, {
      title: "Delete race",
      description: "",
      questions: [
        {
          id: "q",
          type: "numeric",
          prompt: "1+1",
          choices: [],
          correctAnswer: 2,
        },
      ],
      settings: {
        mode: "practice",
        durationMinutes: 1,
        shuffleQuestions: false,
        shuffleOptions: false,
        showExplanations: true,
      },
    });
    const attempt = await startAttempt(user.id, quiz.id, {});
    await db.attempt.update({
      where: { id: attempt.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    db.attempt.findMany = new Proxy(originalFind, {
      async apply(target, self, args) {
        const rows = await Reflect.apply(target, self, args);
        await db.user.delete({ where: { id: user.id } });
        return rows;
      },
    });
    assert.equal(await finalizeDueAttempts(user.id), 1);
    db.attempt.findMany = originalFind;
    const failure = new Error("database unavailable");
    db.attempt.findMany = new Proxy(originalFind, {
      apply() {
        throw failure;
      },
    });
    await assert.rejects(finalizeDueAttempts(user.id), failure);
  } finally {
    db.attempt.findMany = originalFind;
    await db.user.deleteMany({ where: { id: user.id } });
  }
});
