import { db } from "./db";
import { AppError } from "./errors";
import { drainStorageDeletions } from "./storage-cleanup";

export async function deleteAccount(
  userId: string,
  expectedPasswordHash: string,
) {
  await db.$transaction(async (tx) => {
    // Uploads lock the same row before inserting, so every completed upload is
    // either included here or fails after account deletion and cleans up its file.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!user || user.passwordHash !== expectedPasswordHash)
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Your credentials changed. Sign in again before deleting your account.",
        401,
      );
    const files = await tx.studyMaterial.findMany({
      where: { ownerId: userId },
      select: { storageKey: true },
    });
    await tx.storageDeletion.createMany({
      data: files.map((file) => ({ storageKey: file.storageKey })),
      skipDuplicates: true,
    });
    await tx.auditLog.create({
      data: { action: "account.deleted", resourceId: userId },
    });
    await tx.user.delete({ where: { id: userId } });
  });
  // Outbox survives a crash or temporary object-storage failure; worker retries.
  await drainStorageDeletions();
}
