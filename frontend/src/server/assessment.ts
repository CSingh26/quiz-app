import {
  Prisma,
  type Attempt,
  type Quiz,
  type QuizVersion,
} from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import { verifyPassword } from "./auth-core";
import { isDeepStrictEqual } from "node:util";
import {
  buildSnapshot,
  gradeQuestions,
  parseInput,
  presentedQuestions,
  QuizInputSchema,
  SafeIdSchema,
  SaveAnswersSchema,
  StartAttemptSchema,
  validateAnswers,
  type Answers,
  type AttemptSnapshot,
  type Grade,
  type Question,
  type Settings,
} from "../domain/assessment";

type Transaction = Prisma.TransactionClient;
type VersionedQuiz = Quiz & { versions: QuizVersion[] };
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
const notFound = () =>
  new AppError("NOT_FOUND", "This item was not found", 404);

// Serializable retries are bounded; row locks make quota and revision decisions
// one operation even when multiple browser tabs submit at the same time.
async function transaction<T>(
  work: (tx: Transaction) => Promise<T>,
): Promise<T> {
  for (let tries = 0; ; tries++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" ||
          (error.code === "P2010" &&
            ["40001", "40P01"].includes(String(error.meta?.code))));
      if (retryable && tries < 6) continue;
      throw error;
    }
  }
}
const latest = { versions: { orderBy: { number: "desc" as const }, take: 1 } };
function quizSummary(quiz: VersionedQuiz) {
  const version = quiz.versions[0];
  if (!version)
    throw new AppError("INVALID_QUIZ", "Quiz has no published version", 409);
  const settings = version.settings as unknown as Settings;
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    mode: settings.mode,
    questionCount: (version.questions as unknown as Question[]).length,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
    latestVersion: version.number,
  };
}
function quizDetail(quiz: VersionedQuiz) {
  return {
    ...quizSummary(quiz),
    questions: quiz.versions[0].questions as unknown as Question[],
    settings: quiz.versions[0].settings as unknown as Settings,
  };
}
export async function listQuizzes(userId: string) {
  const quizzes = await db.quiz.findMany({
    where: { ownerId: userId, deletedAt: null },
    include: latest,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return quizzes.map(quizSummary);
}
export async function createQuiz(
  userId: string,
  body: unknown,
  tx?: Transaction,
) {
  const input = parseInput(QuizInputSchema, body);
  const work = async (database: Transaction) => {
    const quiz = await database.quiz.create({
      data: {
        ownerId: userId,
        title: input.title,
        description: input.description,
        versions: {
          create: {
            number: 1,
            questions: json(input.questions),
            settings: json(input.settings),
          },
        },
      },
      include: latest,
    });
    await database.auditLog.create({
      data: { userId, action: "quiz.created", resourceId: quiz.id },
    });
    return quizDetail(quiz);
  };
  return tx ? work(tx) : transaction(work);
}
export async function getQuiz(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  const quiz = await db.quiz.findFirst({
    where: { id, ownerId: userId, deletedAt: null },
    include: latest,
  });
  if (!quiz) throw notFound();
  return quizDetail(quiz);
}
export async function updateQuiz(userId: string, id: string, body: unknown) {
  parseInput(SafeIdSchema, id);
  const input = parseInput(QuizInputSchema, body);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${id} FOR UPDATE`;
    const current = await tx.quiz.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
      include: latest,
    });
    if (!current) throw notFound();
    const updated = await tx.quiz.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        versions: {
          create: {
            number: current.versions[0].number + 1,
            questions: json(input.questions),
            settings: json(input.settings),
          },
        },
      },
      include: latest,
    });
    await tx.auditLog.create({
      data: { userId, action: "quiz.updated", resourceId: id },
    });
    return quizDetail(updated);
  });
}
export async function deleteQuiz(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  await transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${id} FOR UPDATE`;
    const quiz = await tx.quiz.findFirst({
      where: { id, ownerId: userId, deletedAt: null },
    });
    if (!quiz) throw notFound();
    await tx.quiz.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.auditLog.create({
      data: { userId, action: "quiz.deleted", resourceId: id },
    });
  });
  return { ok: true };
}

function attemptView(attempt: Attempt, now: Date) {
  const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
  const grade = attempt.grade as unknown as Grade | null;
  const answers = attempt.answers as Answers;
  const canReview =
    attempt.status !== "in_progress" &&
    (!snapshot.reviewAfter ||
      now.getTime() >= new Date(snapshot.reviewAfter).getTime());
  const releasedScore = canReview ? attempt.score : null;
  return {
    id: attempt.id,
    quizId: attempt.quizId,
    title: snapshot.title,
    status: attempt.status as "in_progress" | "submitted" | "expired",
    mode: snapshot.settings.mode,
    questions: presentedQuestions(snapshot.questions),
    answers,
    flagged: attempt.flagged as string[],
    revision: attempt.revision,
    currentQuestionIndex: attempt.currentQuestionIndex,
    startedAt: attempt.startedAt.toISOString(),
    expiresAt: attempt.expiresAt?.toISOString() ?? null,
    serverNow: now.toISOString(),
    score: releasedScore,
    maxScore: attempt.maxScore,
    percentage:
      releasedScore === null
        ? null
        : Number(((100 * releasedScore) / attempt.maxScore).toFixed(2)),
    submittedAt: attempt.submittedAt?.toISOString() ?? null,
    pendingReview: grade?.pendingReview ?? false,
    allowBacktracking: snapshot.allowBacktracking,
    integrityEnabled: snapshot.integrityEnabled,
    ...(canReview && grade
      ? {
          review: snapshot.questions.map((question) => ({
            questionId: question.id,
            prompt: question.prompt,
            answer: answers[question.id] ?? null,
            correctAnswer: question.correctAnswer,
            explanation: snapshot.settings.showExplanations
              ? question.explanation
              : "",
            topic: question.topic,
            earned:
              grade.items.find((item) => item.questionId === question.id)
                ?.earned ??
              (question.type === "essay" && answers[question.id] ? null : 0),
            points: question.points,
            sourceRefs: snapshot.settings.showExplanations
              ? question.sourceRefs
              : [],
          })),
        }
      : {}),
  };
}
export type AttemptView = ReturnType<typeof attemptView>;
async function finalize(
  tx: Transaction,
  attempt: Attempt,
  now: Date,
  status: "submitted" | "expired",
): Promise<Attempt> {
  if (attempt.status !== "in_progress") return attempt;
  const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
  const grade = gradeQuestions(snapshot.questions, attempt.answers);
  const completed = await tx.attempt.update({
    where: { id: attempt.id },
    data: {
      status,
      score: grade.score,
      grade: json(grade),
      submittedAt: status === "expired" ? (attempt.expiresAt ?? now) : now,
      revision: { increment: 1 },
    },
  });
  await tx.auditLog.create({
    data: {
      userId: attempt.userId,
      action: status === "expired" ? "attempt.expired" : "attempt.submitted",
      resourceId: attempt.id,
    },
  });
  return completed;
}
async function expire(tx: Transaction, attempt: Attempt, now: Date) {
  return attempt.status === "in_progress" &&
    attempt.expiresAt &&
    now >= attempt.expiresAt
    ? finalize(tx, attempt, now, "expired")
    : attempt;
}
async function lockedAttempt(tx: Transaction, userId: string, id: string) {
  await tx.$queryRaw`SELECT "id" FROM "Attempt" WHERE "id" = ${id} FOR UPDATE`;
  const attempt = await tx.attempt.findFirst({ where: { id, userId } });
  if (!attempt) throw notFound();
  return attempt;
}

export async function startAttempt(
  userId: string,
  quizId: string,
  body: unknown,
) {
  parseInput(SafeIdSchema, quizId);
  const input = parseInput(StartAttemptSchema, body);
  return transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Quiz" WHERE "id" = ${quizId} FOR UPDATE`;
    const quiz = await tx.quiz.findFirst({
      where: { id: quizId, deletedAt: null },
      include: latest,
    });
    if (!quiz) throw notFound();
    if (input.assignmentId)
      await tx.$queryRaw`SELECT "id" FROM "Assignment" WHERE "id" = ${input.assignmentId} FOR UPDATE`;
    const assignment = input.assignmentId
      ? await tx.assignment.findFirst({
          where: { id: input.assignmentId, quizId },
          include: {
            version: true,
            course: { include: { members: { where: { userId }, take: 1 } } },
          },
        })
      : null;
    if (input.assignmentId) {
      if (
        !assignment ||
        (assignment.course.ownerId !== userId &&
          assignment.course.members.length === 0)
      )
        throw notFound();
      if (
        assignment.accessCodeHash &&
        (!input.accessCode ||
          !(await verifyPassword(input.accessCode, assignment.accessCodeHash)))
      )
        throw new AppError(
          "INVALID_ACCESS_CODE",
          "The access code is incorrect",
          403,
        );
    } else if (quiz.ownerId !== userId) throw notFound();
    const now = new Date();
    const existing = await tx.attempt.findFirst({
      where: {
        userId,
        quizId,
        assignmentId: assignment?.id ?? null,
        status: "in_progress",
      },
      orderBy: { startedAt: "desc" },
    });
    if (existing) {
      const locked = await lockedAttempt(tx, userId, existing.id);
      return attemptView(await expire(tx, locked, now), now);
    }
    if (assignment && (now < assignment.startsAt || now >= assignment.endsAt))
      throw new AppError(
        "ASSIGNMENT_CLOSED",
        "This assignment is outside its available time window",
        409,
      );
    if (
      assignment &&
      (await tx.attempt.count({
        where: { userId, assignmentId: assignment.id },
      })) >= assignment.attemptLimit
    )
      throw new AppError(
        "ATTEMPT_LIMIT",
        "You have used all attempts for this assignment",
        409,
      );
    const version = assignment?.version ?? quiz.versions[0];
    if (!version)
      throw new AppError("INVALID_QUIZ", "Quiz has no available version", 409);
    const settings = {
      ...(version.settings as unknown as Settings),
      ...(assignment
        ? { mode: "exam" as const, durationMinutes: assignment.durationMinutes }
        : {}),
    };
    let expiresAt =
      settings.durationMinutes === null
        ? null
        : new Date(now.getTime() + settings.durationMinutes * 60000);
    if (assignment && (!expiresAt || assignment.endsAt < expiresAt))
      expiresAt = assignment.endsAt;
    const snapshot = buildSnapshot(
      assignment?.title ?? quiz.title,
      version.questions as unknown as Question[],
      settings,
      {
        allowBacktracking: assignment?.allowBacktracking ?? true,
        integrityEnabled: assignment?.integrityEnabled ?? false,
        reviewAfter:
          settings.mode === "exam"
            ? ((assignment?.endsAt ?? expiresAt)?.toISOString() ?? null)
            : null,
      },
    );
    const attempt = await tx.attempt.create({
      data: {
        userId,
        quizId,
        versionId: version.id,
        assignmentId: assignment?.id,
        snapshot: json(snapshot),
        maxScore: snapshot.questions.reduce(
          (sum, question) => sum + question.points,
          0,
        ),
        startedAt: now,
        expiresAt,
      },
    });
    return attemptView(attempt, now);
  });
}
export async function getAttempt(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  return transaction(async (tx) => {
    const attempt = await lockedAttempt(tx, userId, id);
    const now = new Date();
    return attemptView(await expire(tx, attempt, now), now);
  });
}
export async function saveAnswers(userId: string, id: string, body: unknown) {
  parseInput(SafeIdSchema, id);
  const input = parseInput(SaveAnswersSchema, body);
  const outcome = await transaction(async (tx) => {
    const locked = await lockedAttempt(tx, userId, id);
    const now = new Date();
    const attempt = await expire(tx, locked, now);
    // Return the error out of the transaction so an expired attempt's final grade
    // commits even though this particular late answer write is refused.
    if (attempt.status !== "in_progress")
      return {
        error: new AppError(
          attempt.status === "expired" ? "ATTEMPT_EXPIRED" : "ATTEMPT_CLOSED",
          "This attempt no longer accepts answers",
          409,
        ),
      };
    if (attempt.revision !== input.revision)
      throw new AppError(
        "REVISION_CONFLICT",
        "Answers changed in another request. Refresh before saving again.",
        409,
      );
    const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
    const answers = validateAnswers(snapshot.questions, input.answers);
    const flagged = input.flagged ?? (attempt.flagged as string[]);
    if (
      new Set(flagged).size !== flagged.length ||
      flagged.some(
        (id) => !snapshot.questions.some((question) => question.id === id),
      )
    )
      throw new AppError(
        "INVALID_INPUT",
        "Flagged questions must belong to this attempt",
        400,
      );
    const cursor = input.currentQuestionIndex ?? attempt.currentQuestionIndex;
    if (cursor >= snapshot.questions.length)
      throw new AppError(
        "INVALID_INPUT",
        "Question position is outside this attempt",
        400,
      );
    if (!snapshot.allowBacktracking) {
      if (cursor < attempt.currentQuestionIndex)
        throw new AppError(
          "BACKTRACKING_DISABLED",
          "This assessment only allows forward navigation",
          409,
        );
      const previous = attempt.answers as Answers;
      const changedRestricted = snapshot.questions.some(
        (question, index) =>
          index !== attempt.currentQuestionIndex &&
          !isDeepStrictEqual(previous[question.id], answers[question.id]),
      );
      if (changedRestricted)
        throw new AppError(
          "BACKTRACKING_DISABLED",
          "Only the current question may be changed",
          409,
        );
    }
    const saved = await tx.attempt.update({
      where: { id },
      data: {
        answers: json(answers),
        flagged: json(flagged),
        currentQuestionIndex: cursor,
        revision: { increment: 1 },
      },
    });
    return { value: attemptView(saved, now) };
  });
  if (outcome.error) throw outcome.error;
  return outcome.value!;
}
export async function submitAttempt(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  return transaction(async (tx) => {
    const attempt = await lockedAttempt(tx, userId, id);
    const now = new Date();
    const checked = await expire(tx, attempt, now);
    return attemptView(await finalize(tx, checked, now, "submitted"), now);
  });
}
