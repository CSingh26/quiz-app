import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { db } from "../../src/server/db";
import {
  createQuiz,
  startAttempt,
  saveAnswers,
  submitAttempt,
  getAttempt,
} from "../../src/server/assessment";
import { getReview, gradeReview, retryMistakes } from "../../src/server/review";
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

test("manual review has bounded points, owner authorization, provenance and no grade before submission", async () => {
  const owner = await db.user.create({
    data: {
      name: "Review fixture",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "test",
    },
  });
  const outsider = await db.user.create({
    data: {
      name: "Outsider",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "test",
    },
  });
  try {
    const quiz = await createQuiz(owner.id, {
      title: "Written practice",
      description: "",
      questions: [
        {
          id: "essay",
          type: "essay",
          prompt: "Explain a queue",
          choices: [],
          correctAnswer: "FIFO explanation",
          points: 5,
        },
      ],
      settings: {
        mode: "practice",
        durationMinutes: null,
        shuffleQuestions: false,
        shuffleOptions: false,
        showExplanations: true,
      },
    });
    const attempt = await startAttempt(owner.id, quiz.id, {});
    await assert.rejects(getReview(owner.id, attempt.id), {
      code: "ATTEMPT_ACTIVE",
    });
    await saveAnswers(owner.id, attempt.id, {
      answers: { essay: "First in, first out" },
      revision: 0,
    });
    assert.equal(
      (await submitAttempt(owner.id, attempt.id)).pendingReview,
      true,
    );
    await assert.rejects(getReview(outsider.id, attempt.id), {
      code: "RESOURCE_NOT_FOUND",
    });
    await assert.rejects(
      gradeReview(owner.id, attempt.id, {
        scores: [{ questionId: "essay", earned: 6 }],
        reason: "Self assessment",
      }),
      { code: "VALIDATION_ERROR" },
    );
    await gradeReview(owner.id, attempt.id, {
      scores: [{ questionId: "essay", earned: 4 }],
      reason: "Self assessment based on rubric",
    });
    const result = await getAttempt(owner.id, attempt.id);
    assert.equal(result.score, 4);
    assert.equal(result.pendingReview, false);
    const record = await db.attempt.findUniqueOrThrow({
      where: { id: attempt.id },
    });
    assert.equal(
      (record.grade as Record<string, unknown>).provenance,
      "self_reviewed",
    );
    assert.equal(
      await db.auditLog.count({
        where: { resourceId: attempt.id, action: "grade.reviewed" },
      }),
      1,
    );
    const retry = await retryMistakes(owner.id, attempt.id);
    assert.equal(retry.questionCount, 1);
  } finally {
    await db.user.deleteMany({
      where: { id: { in: [owner.id, outsider.id] } },
    });
  }
});
