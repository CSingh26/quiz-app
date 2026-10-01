import type { Prisma } from "@prisma/client";
import { db } from "./db";

// Unlike CURRENT_TIMESTAMP/NOW(), clock_timestamp() advances while a transaction
// waits for a lock. Call after the lock protecting an eligibility decision.
export async function databaseNow(
  client: Pick<Prisma.TransactionClient, "$queryRaw"> = db,
): Promise<Date> {
  const [row] = await client.$queryRaw<
    { now: Date }[]
  >`SELECT clock_timestamp() AS now`;
  return row.now;
}
