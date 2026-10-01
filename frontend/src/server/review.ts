import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "./db";
import { AppError, requireValue } from "./errors";
import { createQuiz, getAttempt } from "./assessment";
import type { AttemptSnapshot, Grade, Answers } from "../domain/assessment";

async function reviewRecord(
  userId: string,
  id: string,
  client: Prisma.TransactionClient = db,
  allowActive = false,
) {
  const attempt = requireValue(
    await client.attempt.findFirst({
      where: {
        id,
        OR: [
          { assignment: { course: { ownerId: userId } } },
          { userId, assignmentId: null, quiz: { ownerId: userId } },
        ],
      },
      include: { user: { select: { name: true } } },
    }),
    "Attempt not found.",
  );
  const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
  if (!attempt.assignmentId && snapshot.settings.mode !== "practice")
    throw new AppError(
      "FORBIDDEN",
      "Self review is available only for practice quizzes.",
      403,
    );
  if (attempt.status === "in_progress" && !allowActive)
    throw new AppError(
      "ATTEMPT_ACTIVE",
      "Submit this attempt before reviewing its grade.",
      409,
    );
  return attempt;
}

export async function getReview(userId: string, id: string) {
  await prepareReview(userId, id);
  const attempt = await reviewRecord(userId, id);
  const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
  const grade = attempt.grade as unknown as Grade;
  return {
    id,
    title: snapshot.title,
    studentName: attempt.user.name,
    selfReview: !attempt.assignmentId,
    score: attempt.score,
    maxScore: attempt.maxScore,
    questions: snapshot.questions,
    answers: attempt.answers as Answers,
    scores: grade.items,
  };
}

async function prepareReview(userId: string, id: string) {
  const attempt = await reviewRecord(userId, id, db, true);
  if (
    attempt.status === "in_progress" &&
    attempt.expiresAt &&
    attempt.expiresAt <= new Date()
  )
    await getAttempt(attempt.userId, id);
}

const gradeInput = z
  .object({
    scores: z
      .array(
        z
          .object({
            questionId: z.string().min(1).max(100),
            earned: z.number().finite().min(0),
          })
          .strict(),
      )
      .min(1)
      .max(100),
    reason: z.string().trim().min(8).max(1000),
  })
  .strict();
export async function gradeReview(userId: string, id: string, input: unknown) {
  const body = gradeInput.parse(input);
  await prepareReview(userId, id);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Attempt" WHERE "id" = ${id} FOR UPDATE`;
    const attempt = await reviewRecord(userId, id, tx);
    const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
    const grade = attempt.grade as unknown as Grade;
    if (
      body.scores.length !== snapshot.questions.length ||
      new Set(body.scores.map((item) => item.questionId)).size !==
        body.scores.length
    )
      throw new AppError(
        "VALIDATION_ERROR",
        "Provide one grade for every question.",
      );
    const items = snapshot.questions.map((question) => {
      const item = body.scores.find((item) => item.questionId === question.id);
      if (!item || item.earned > question.points)
        throw new AppError(
          "VALIDATION_ERROR",
          "A grade must be between zero and the question's possible points.",
        );
      return {
        questionId: question.id,
        earned: item.earned,
        points: question.points,
      };
    });
    const score = items.reduce((sum, item) => sum + item.earned, 0);
    const nextGrade = {
      ...grade,
      items,
      score,
      pendingReview: false,
      provenance: attempt.assignmentId ? "manually_graded" : "self_reviewed",
      reviewedBy: userId,
      reviewedAt: new Date().toISOString(),
      reason: body.reason,
    };
    await tx.attempt.update({
      where: { id },
      data: {
        score,
        grade: JSON.parse(JSON.stringify(nextGrade)),
        revision: { increment: 1 },
      },
    });
    await tx.auditLog.create({
      data: { userId, action: "grade.reviewed", resourceId: id },
    });
  });
  return getReview(userId, id);
}

export async function retryMistakes(userId: string, id: string) {
  const attempt = requireValue(
    await db.attempt.findFirst({ where: { id, userId } }),
    "Attempt not found.",
  );
  const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
  if (attempt.status === "in_progress" || snapshot.settings.mode !== "practice")
    throw new AppError(
      "FORBIDDEN",
      "Retrying mistakes is available after completing a practice quiz.",
      403,
    );
  const grade = attempt.grade as unknown as Grade;
  if (grade.pendingReview)
    throw new AppError(
      "REVIEW_REQUIRED",
      "Review written answers before creating a revision quiz.",
      409,
    );
  const questions = snapshot.questions.filter(
    (question) =>
      (grade.items.find((item) => item.questionId === question.id)?.earned ??
        0) < question.points,
  );
  if (!questions.length)
    throw new AppError(
      "NO_MISTAKES",
      "You answered every question correctly. Try another quiz.",
    );
  return createQuiz(userId, {
    title: `${snapshot.title.slice(0, 170)} — revision`,
    description: "Questions to revisit from your completed practice attempt.",
    questions,
    settings: { ...snapshot.settings, mode: "practice", durationMinutes: 10 },
  });
}
