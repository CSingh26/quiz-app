import { AppError } from "./errors";
import { db } from "./db";
import { databaseNow } from "./clock";
import { getAttempt } from "./assessment";
import { drainStorageDeletions } from "./storage-cleanup";

export async function finalizeDueAttempts(userId?: string, courseId?: string) {
  const now = await databaseNow();
  const attempts = await db.attempt.findMany({
    where: {
      userId,
      ...(courseId ? { assignment: { courseId } } : {}),
      status: "in_progress",
      expiresAt: { lte: now },
    },
    select: { id: true, userId: true },
    orderBy: { expiresAt: "asc" },
    take: 100,
  });
  for (const attempt of attempts) {
    try {
      await getAttempt(attempt.userId, attempt.id);
    } catch (error) {
      // Account deletion may cascade after the due-attempt query.
      if (!(error instanceof AppError && error.code === "NOT_FOUND"))
        throw error;
    }
  }
  return attempts.length;
}

export async function maintainPlatform() {
  const now = await databaseNow();
  await finalizeDueAttempts();
  await drainStorageDeletions();
  await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.verificationToken.deleteMany({ where: { expiresAt: { lte: now } } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lte: now } } }),
  ]);
}
