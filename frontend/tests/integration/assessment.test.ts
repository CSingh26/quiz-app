import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db";
import {
  createQuiz,
  listQuizzes,
  getQuiz,
  updateQuiz,
  deleteQuiz,
  startAttempt,
  getAttempt,
  saveAnswers,
  submitAttempt,
} from "../../src/server/assessment";
import { hashPassword } from "../../src/server/auth-core";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error(
    "Assessment tests require isolated localhost:55439/quizbee_v2_test",
  );
const payload = {
  title: "Assessment fixture",
  description: "Synthetic test content",
  questions: [
    {
      id: "q1",
      type: "single_choice",
      prompt: "FIFO structure?",
      choices: [
        { id: "a", text: "Queue" },
        { id: "b", text: "Stack" },
      ],
      correctAnswer: "a",
      explanation: "A queue is FIFO",
      topic: "Structures",
      difficulty: "easy",
      points: 2,
      sourceRefs: [{ chunkId: "synthetic", label: "Fixture", quote: "Queue" }],
      tags: [],
    },
  ],
  settings: {
    durationMinutes: 20,
    shuffleQuestions: true,
    shuffleOptions: true,
    mode: "practice",
    showExplanations: true,
  },
};
async function fixture() {
  const owner = await db.user.create({
    data: {
      name: "Fixture owner",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "not-a-real-login",
      role: "INSTRUCTOR",
    },
  });
  const student = await db.user.create({
    data: {
      name: "Fixture student",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "not-a-real-login",
    },
  });
  const quiz = await createQuiz(owner.id, payload);
  return {
    owner,
    student,
    quiz,
    async clean() {
      await db.user.deleteMany({
        where: { id: { in: [owner.id, student.id] } },
      });
    },
  };
}
test.after(async () => {
  await db.$disconnect();
});

test("private CRUD is scoped to owner and every edit creates an immutable version", async () => {
  const f = await fixture();
  try {
    assert.equal(
      (await listQuizzes(f.owner.id)).some((q) => q.id === f.quiz.id),
      true,
    );
    assert.equal(
      (await listQuizzes(f.student.id)).some((q) => q.id === f.quiz.id),
      false,
    );
    await assert.rejects(getQuiz(f.student.id, f.quiz.id), {
      code: "NOT_FOUND",
    });
    await assert.rejects(updateQuiz(f.student.id, f.quiz.id, payload), {
      code: "NOT_FOUND",
    });
    await assert.rejects(deleteQuiz(f.student.id, f.quiz.id), {
      code: "NOT_FOUND",
    });
    const edited = await updateQuiz(f.owner.id, f.quiz.id, {
      ...payload,
      title: "Revised",
    });
    assert.equal(edited.latestVersion, 2);
    assert.equal(
      await db.quizVersion.count({ where: { quizId: f.quiz.id } }),
      2,
    );
    await deleteQuiz(f.owner.id, f.quiz.id);
    await assert.rejects(getQuiz(f.owner.id, f.quiz.id), { code: "NOT_FOUND" });
  } finally {
    await f.clean();
  }
});

test("concurrent starts resume one attempt and edits cannot change its frozen questions or deadline", async () => {
  const f = await fixture();
  try {
    const attempts = await Promise.all(
      Array.from({ length: 6 }, () => startAttempt(f.owner.id, f.quiz.id, {})),
    );
    assert.equal(new Set(attempts.map((attempt) => attempt.id)).size, 1);
    const first = attempts[0];
    assert.equal("correctAnswer" in first.questions[0], false);
    assert.equal("sourceRefs" in first.questions[0], false);
    await updateQuiz(f.owner.id, f.quiz.id, {
      ...payload,
      questions: [{ ...payload.questions[0], prompt: "Changed prompt" }],
    });
    const resumed = await getAttempt(f.owner.id, first.id);
    assert.equal(resumed.questions[0].prompt, "FIFO structure?");
    assert.deepEqual(resumed.questions, first.questions);
    assert.equal(resumed.expiresAt, first.expiresAt);
    await assert.rejects(getAttempt(f.student.id, first.id), {
      code: "NOT_FOUND",
    });
    await assert.rejects(startAttempt(f.student.id, f.quiz.id, {}), {
      code: "NOT_FOUND",
    });
  } finally {
    await f.clean();
  }
});

test("compare-and-swap prevents lost saves and concurrent submission is idempotent", async () => {
  const f = await fixture();
  try {
    const attempt = await startAttempt(f.owner.id, f.quiz.id, {});
    const writes = await Promise.allSettled([
      saveAnswers(f.owner.id, attempt.id, {
        answers: { q1: "a" },
        revision: 0,
      }),
      saveAnswers(f.owner.id, attempt.id, {
        answers: { q1: "b" },
        revision: 0,
      }),
    ]);
    assert.equal(
      writes.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const rejected = writes.find((result) => result.status === "rejected");
    assert.equal(
      rejected?.status === "rejected" && rejected.reason.code,
      "REVISION_CONFLICT",
      rejected?.status === "rejected"
        ? JSON.stringify(rejected.reason)
        : "No rejected save",
    );
    const saved = await getAttempt(f.owner.id, attempt.id);
    assert.equal(saved.revision, 1);
    const results = await Promise.all([
      submitAttempt(f.owner.id, attempt.id),
      submitAttempt(f.owner.id, attempt.id),
    ]);
    assert.equal(results[0].score, saved.answers.q1 === "a" ? 2 : 0);
    assert.equal(results[0].submittedAt, results[1].submittedAt);
    assert.equal(results[0].revision, results[1].revision);
    assert.equal(results[0].review?.[0].correctAnswer, "a");
    await assert.rejects(
      saveAnswers(f.owner.id, attempt.id, {
        answers: {},
        revision: saved.revision,
      }),
      { code: "ATTEMPT_CLOSED" },
    );
  } finally {
    await f.clean();
  }
});

test("expiration commits saved grade while rejecting late answers and never extends the deadline", async () => {
  const f = await fixture();
  try {
    const attempt = await startAttempt(f.owner.id, f.quiz.id, {});
    await saveAnswers(f.owner.id, attempt.id, {
      answers: { q1: "a" },
      revision: 0,
    });
    const deadline = new Date(Date.now() - 1);
    await db.attempt.update({
      where: { id: attempt.id },
      data: { expiresAt: deadline },
    });
    await assert.rejects(
      saveAnswers(f.owner.id, attempt.id, {
        answers: { q1: "b" },
        revision: 1,
      }),
      { code: "ATTEMPT_EXPIRED" },
    );
    const expired = await getAttempt(f.owner.id, attempt.id);
    assert.equal(expired.status, "expired");
    assert.equal(expired.score, 2);
    assert.equal(expired.answers.q1, "a");
    assert.equal(expired.submittedAt, deadline.toISOString());
    assert.equal((await submitAttempt(f.owner.id, attempt.id)).score, 2);
  } finally {
    await f.clean();
  }
});

test("assignment membership, code, quota and exam review policies are enforced under concurrent starts", async (t) => {
  const f = await fixture();
  try {
    const course = await db.course.create({
      data: { ownerId: f.owner.id, name: "Fixture course", code: randomUUID() },
    });
    const version = await db.quizVersion.findFirstOrThrow({
      where: { quizId: f.quiz.id },
    });
    const assignment = await db.assignment.create({
      data: {
        courseId: course.id,
        quizId: f.quiz.id,
        versionId: version.id,
        title: "Exam fixture",
        startsAt: new Date(Date.now() - 10000),
        endsAt: new Date(Date.now() + 600000),
        durationMinutes: 5,
        attemptLimit: 1,
        accessCodeHash: await hashPassword("fixture-access"),
        allowBacktracking: true,
        integrityEnabled: true,
      },
    });
    await assert.rejects(
      startAttempt(f.student.id, f.quiz.id, {
        assignmentId: assignment.id,
        accessCode: "fixture-access",
      }),
      { code: "NOT_FOUND" },
    );
    await db.courseMembership.create({
      data: { courseId: course.id, userId: f.student.id },
    });
    await assert.rejects(
      startAttempt(f.student.id, f.quiz.id, {
        assignmentId: assignment.id,
        accessCode: "wrong",
      }),
      { code: "INVALID_ACCESS_CODE" },
    );
    const attempts = await Promise.all(
      Array.from({ length: 4 }, () =>
        startAttempt(f.student.id, f.quiz.id, {
          assignmentId: assignment.id,
          accessCode: "fixture-access",
        }),
      ),
    );
    assert.equal(new Set(attempts.map((attempt) => attempt.id)).size, 1);
    const attempt = attempts[0];
    assert.equal(attempt.mode, "exam");
    assert.equal(attempt.integrityEnabled, true);
    await saveAnswers(f.student.id, attempt.id, {
      answers: { q1: "a" },
      revision: 0,
    });
    const submitted = await submitAttempt(f.student.id, attempt.id);
    assert.equal(submitted.review, undefined);
    assert.equal(submitted.score, null);
    assert.equal(submitted.percentage, null);
    await assert.rejects(
      startAttempt(f.student.id, f.quiz.id, {
        assignmentId: assignment.id,
        accessCode: "fixture-access",
      }),
      { code: "ATTEMPT_LIMIT" },
    );
    t.mock.timers.enable({ apis: ["Date"], now: assignment.endsAt.getTime() });
    const released = await getAttempt(f.student.id, attempt.id);
    assert.equal(released.score, 2);
    assert.equal(released.percentage, 100);
    assert.equal(released.review?.[0].correctAnswer, "a");
    t.mock.timers.reset();
    await db.courseMembership.deleteMany({
      where: { courseId: course.id, userId: f.student.id },
    });
  } finally {
    await f.clean();
  }
});

test("quiz creation composes with job transactions and audit records follow committed mutations", async () => {
  const f = await fixture();
  try {
    const marker = randomUUID();
    await assert.rejects(
      db.$transaction(async (tx) => {
        await createQuiz(f.owner.id, { ...payload, title: marker }, tx);
        throw new Error("Injected job failure");
      }),
      /Injected job failure/,
    );
    assert.equal(
      await db.quiz.count({ where: { ownerId: f.owner.id, title: marker } }),
      0,
    );
    const attempt = await startAttempt(f.owner.id, f.quiz.id, {});
    await submitAttempt(f.owner.id, attempt.id);
    await submitAttempt(f.owner.id, attempt.id);
    await updateQuiz(f.owner.id, f.quiz.id, { ...payload, title: "Edited" });
    await deleteQuiz(f.owner.id, f.quiz.id);
    const logs = await db.auditLog.findMany({ where: { userId: f.owner.id } });
    for (const action of [
      "quiz.created",
      "quiz.updated",
      "quiz.deleted",
      "attempt.submitted",
    ])
      assert.equal(logs.filter((log) => log.action === action).length, 1);
  } finally {
    await f.clean();
  }
});

test("submitted essay remains explicitly pending with automatic score stored separately", async () => {
  const f = await fixture();
  try {
    await updateQuiz(f.owner.id, f.quiz.id, {
      ...payload,
      questions: [
        ...payload.questions,
        {
          ...payload.questions[0],
          id: "essay",
          type: "essay",
          choices: [],
          correctAnswer: "",
        },
      ],
    });
    const attempt = await startAttempt(f.owner.id, f.quiz.id, {});
    await saveAnswers(f.owner.id, attempt.id, {
      answers: { q1: "a", essay: "An answer requiring human review" },
      revision: 0,
    });
    const submitted = await submitAttempt(f.owner.id, attempt.id);
    assert.equal(submitted.pendingReview, true);
    assert.equal(submitted.score, null);
    assert.equal(
      submitted.review?.find((item) => item.questionId === "essay")?.earned,
      null,
    );
    const row = await db.attempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    assert.equal((row.grade as { autoScore: number }).autoScore, 2);
  } finally {
    await f.clean();
  }
});

test("no-backtracking cursor forbids previous or future answers while allowing forward navigation", async () => {
  const f = await fixture();
  try {
    const quiz = await updateQuiz(f.owner.id, f.quiz.id, {
      ...payload,
      questions: [
        {
          ...payload.questions[0],
          type: "matching",
          correctAnswer: { a: "Alpha", b: "Beta" },
        },
        { ...payload.questions[0], id: "q2" },
      ],
      settings: { ...payload.settings, shuffleQuestions: false },
    });
    const course = await db.course.create({
      data: {
        ownerId: f.owner.id,
        name: "Cursor fixture",
        code: randomUUID(),
        members: { create: { userId: f.student.id } },
      },
    });
    const version = await db.quizVersion.findFirstOrThrow({
      where: { quizId: quiz.id },
      orderBy: { number: "desc" },
    });
    const assignment = await db.assignment.create({
      data: {
        courseId: course.id,
        quizId: quiz.id,
        versionId: version.id,
        title: "Forward exam",
        startsAt: new Date(Date.now() - 10000),
        endsAt: new Date(Date.now() + 600000),
        durationMinutes: 5,
        attemptLimit: 1,
        allowBacktracking: false,
        integrityEnabled: false,
      },
    });
    const attempt = await startAttempt(f.student.id, quiz.id, {
      assignmentId: assignment.id,
    });
    await assert.rejects(
      saveAnswers(f.student.id, attempt.id, {
        answers: { q2: "a" },
        revision: 0,
      }),
      { code: "BACKTRACKING_DISABLED" },
    );
    const advanced = await saveAnswers(f.student.id, attempt.id, {
      answers: { q1: { a: "Alpha", b: "Beta" } },
      revision: 0,
      currentQuestionIndex: 1,
    });
    assert.equal(advanced.currentQuestionIndex, 1);
    await assert.rejects(
      saveAnswers(f.student.id, attempt.id, {
        answers: { q1: { a: "Beta", b: "Alpha" }, q2: "a" },
        revision: 1,
      }),
      { code: "BACKTRACKING_DISABLED" },
    );
    await assert.rejects(
      saveAnswers(f.student.id, attempt.id, {
        answers: { q1: { a: "Alpha", b: "Beta" } },
        revision: 1,
        currentQuestionIndex: 0,
      }),
      { code: "BACKTRACKING_DISABLED" },
    );
    assert.equal(
      (
        await saveAnswers(f.student.id, attempt.id, {
          answers: { q1: { b: "Beta", a: "Alpha" }, q2: "a" },
          revision: 1,
        })
      ).revision,
      2,
    );
  } finally {
    await f.clean();
  }
});
