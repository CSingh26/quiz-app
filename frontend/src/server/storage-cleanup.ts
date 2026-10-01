import { db } from "./db";
import { localStorage, type PrivateStorage } from "./ingestion/storage";

export async function drainStorageDeletions(
  storage: PrivateStorage = localStorage,
) {
  const pending = await db.storageDeletion.findMany({
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  for (const item of pending) {
    try {
      await storage.delete(item.storageKey);
      await db.storageDeletion.deleteMany({ where: { id: item.id } });
    } catch {
      await db.storageDeletion.updateMany({
        where: { id: item.id },
        data: { attempts: { increment: 1 } },
      });
    }
  }
}
