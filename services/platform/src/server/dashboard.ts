import { db } from "./db";
import { databaseNow } from "./clock";
import { listQuizzes } from "./assessment";
import { listCourses } from "./courses";
import type { AttemptSnapshot, Grade } from "../domain/assessment";
import { finalizeDueAttempts } from "./maintenance";

export async function dashboard(userId: string) {
  await finalizeDueAttempts(userId);
  const [quizzes, attempts, courses] = await Promise.all([
    listQuizzes(userId),
    db.attempt.findMany({
      where: { userId },
      include: {
        quiz: { select: { title: true } },
        assignment: { select: { endsAt: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 100,
    }),
    listCourses(userId),
  ]);
  const now = await databaseNow();
  const completed = attempts.filter(
    (attempt) => attempt.status !== "in_progress",
  );
  // Exam scores stay private until the same release window used by attempt review.
  const reviewAllowed = (attempt: (typeof attempts)[number]) => {
    const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
    return (
      attempt.status !== "in_progress" &&
      (!snapshot.reviewAfter || new Date(snapshot.reviewAfter) <= now)
    );
  };
  const released = completed.filter(reviewAllowed);
  const percentages = released.flatMap((attempt) =>
    attempt.score === null
      ? []
      : [(attempt.score / Math.max(1, attempt.maxScore)) * 100],
  );
  const topics = new Map<
    string,
    { topic: string; correct: number; total: number }
  >();
  for (const attempt of released) {
    const grade = attempt.grade as unknown as Grade | null;
    const snapshot = attempt.snapshot as unknown as AttemptSnapshot;
    for (const item of grade?.items ?? []) {
      if (item.earned === null) continue;
      const topic =
        snapshot.questions.find((question) => question.id === item.questionId)
          ?.topic ?? "General";
      const value = topics.get(topic) ?? { topic, correct: 0, total: 0 };
      value.correct += item.earned;
      value.total += item.points;
      topics.set(topic, value);
    }
  }
  return {
    quizzes,
    courses,
    attempts: attempts.map((attempt) => {
      const canReview = reviewAllowed(attempt);
      const score = canReview ? attempt.score : null;
      return {
        id: attempt.id,
        quizId: attempt.quizId,
        title: attempt.quiz.title,
        status: attempt.status,
        score,
        maxScore: attempt.maxScore,
        percentage:
          score === null
            ? null
            : Math.round((score / Math.max(1, attempt.maxScore)) * 100),
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
      };
    }),
    stats: {
      completed: completed.length,
      averageScore: percentages.length
        ? Math.round(
            percentages.reduce((sum, value) => sum + value, 0) /
              percentages.length,
          )
        : 0,
      studyMinutes: Math.round(
        completed.reduce(
          (sum, attempt) =>
            sum +
            Math.max(
              0,
              (attempt.submittedAt?.getTime() ?? attempt.startedAt.getTime()) -
                attempt.startedAt.getTime(),
            ),
          0,
        ) / 60000,
      ),
    },
    topics: Array.from(topics.values()).sort(
      (a, b) =>
        a.correct / Math.max(1, a.total) - b.correct / Math.max(1, b.total),
    ),
  };
}
