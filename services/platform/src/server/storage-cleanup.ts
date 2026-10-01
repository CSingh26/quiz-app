import { db } from "./db";
import { getPrivateStorage, type PrivateStorage } from "./ingestion/storage";

export async function drainStorageDeletions(
  storage: PrivateStorage = getPrivateStorage(),
) {
  const pending = await db.storageDeletion.findMany({
    // Rotate failed entries behind work that has had fewer chances to complete.
    orderBy: [{ attempts: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 5,
  });
  // One small concurrent batch limits an S3 outage to one adapter timeout,
  // allowing workers to resume unrelated jobs after each maintenance sweep.
  await Promise.all(
    pending.map(async (item) => {
      try {
        await storage.delete(item.storageKey);
        await db.storageDeletion.deleteMany({ where: { id: item.id } });
      } catch {
        await db.storageDeletion.updateMany({
          where: { id: item.id },
          data: { attempts: { increment: 1 } },
        });
      }
    }),
  );
}
