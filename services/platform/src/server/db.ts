import { PrismaClient } from "@prisma/client";

const globalDatabase = globalThis as unknown as {
  quizbeeDatabase?: PrismaClient;
};
export const db = globalDatabase.quizbeeDatabase ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalDatabase.quizbeeDatabase = db;
