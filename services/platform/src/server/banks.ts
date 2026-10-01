import { randomInt } from "node:crypto";
import { z } from "zod";
import { Prisma, type BankVersion, type QuestionBank } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import { createQuiz } from "./assessment";
import {
  parseInput,
  QuestionSchema,
  SafeIdSchema,
  type Question,
} from "../domain/assessment";

const name = z.string().trim().min(1).max(200);
const description = z.string().max(5000);
const folder = z.string().trim().max(200);
const BankQuestionsSchema = z
  .array(QuestionSchema)
  .max(1000)
  .refine(
    (questions) =>
      new Set(questions.map((question) => question.id)).size ===
      questions.length,
    "Question IDs must be unique",
  );
const CreateBankSchema = z
  .object({
    name,
    description: description.default(""),
    folder: folder.default(""),
    quizId: SafeIdSchema.optional(),
  })
  .strict();
const UpdateBankSchema = z
  .object({ name, description, folder, questions: BankQuestionsSchema })
  .strict();
const SampleBankSchema = z
  .object({
    title: name,
    questionCount: z.number().int().min(1).max(100),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]).default("mixed"),
    durationMinutes: z.number().int().min(1).max(1440).nullable().default(null),
  })
  .strict();
const latest = { versions: { orderBy: { number: "desc" as const }, take: 1 } };
type VersionedBank = QuestionBank & { versions: BankVersion[] };
const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value));
const notFound = () =>
  new AppError("NOT_FOUND", "Question bank was not found", 404);
function summary(bank: VersionedBank) {
  const version = bank.versions[0];
  return {
    id: bank.id,
    name: bank.name,
    description: bank.description,
    folder: bank.folder,
    questionCount: (version.questions as unknown as Question[]).length,
    latestVersion: version.number,
    updatedAt: bank.updatedAt.toISOString(),
  };
}
function detail(bank: VersionedBank) {
  return {
    ...summary(bank),
    questions: bank.versions[0].questions as unknown as Question[],
  };
}
async function owned(
  tx: Prisma.TransactionClient,
  userId: string,
  id: string,
  lock = false,
) {
  if (lock)
    await tx.$queryRaw`SELECT "id" FROM "QuestionBank" WHERE "id" = ${id} FOR UPDATE`;
  const bank = await tx.questionBank.findFirst({
    where: { id, ownerId: userId },
    include: latest,
  });
  if (!bank) throw notFound();
  return bank;
}

export async function listBanks(userId: string) {
  const banks = await db.questionBank.findMany({
    where: { ownerId: userId },
    include: latest,
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return banks.map(summary);
}
export async function createBank(userId: string, body: unknown) {
  const input = parseInput(CreateBankSchema, body);
  return db.$transaction(async (tx) => {
    let questions: Question[] = [];
    if (input.quizId) {
      const quiz = await tx.quiz.findFirst({
        where: { id: input.quizId, ownerId: userId, deletedAt: null },
        include: latest,
      });
      if (!quiz?.versions[0]) throw notFound();
      questions = parseInput(BankQuestionsSchema, quiz.versions[0].questions);
    }
    const bank = await tx.questionBank.create({
      data: {
        ownerId: userId,
        name: input.name,
        description: input.description,
        folder: input.folder,
        versions: { create: { number: 1, questions: json(questions) } },
      },
      include: latest,
    });
    await tx.auditLog.create({
      data: { userId, action: "bank.created", resourceId: bank.id },
    });
    return detail(bank);
  });
}
export async function getBank(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  return detail(await owned(db, userId, id));
}
export async function updateBank(userId: string, id: string, body: unknown) {
  parseInput(SafeIdSchema, id);
  const input = parseInput(UpdateBankSchema, body);
  return db.$transaction(
    async (tx) => {
      const current = await owned(tx, userId, id, true);
      const bank = await tx.questionBank.update({
        where: { id },
        data: {
          name: input.name,
          description: input.description,
          folder: input.folder,
          versions: {
            create: {
              number: current.versions[0].number + 1,
              questions: json(input.questions),
            },
          },
        },
        include: latest,
      });
      await tx.auditLog.create({
        data: { userId, action: "bank.updated", resourceId: id },
      });
      return detail(bank);
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 20000,
    },
  );
}
export async function deleteBank(userId: string, id: string) {
  parseInput(SafeIdSchema, id);
  await db.$transaction(async (tx) => {
    await owned(tx, userId, id, true);
    await tx.questionBank.delete({ where: { id } });
    await tx.auditLog.create({
      data: { userId, action: "bank.deleted", resourceId: id },
    });
  });
  return { ok: true };
}
export async function sampleBank(userId: string, id: string, body: unknown) {
  parseInput(SafeIdSchema, id);
  const input = parseInput(SampleBankSchema, body);
  return db.$transaction(
    async (tx) => {
      const bank = await owned(tx, userId, id, true);
      const pool = parseInput(
        BankQuestionsSchema,
        bank.versions[0].questions,
      ).filter(
        (question) =>
          input.difficulty === "mixed" ||
          question.difficulty === input.difficulty,
      );
      if (pool.length < input.questionCount)
        throw new AppError(
          "INSUFFICIENT_QUESTIONS",
          `Only ${pool.length} questions match these settings`,
          400,
        );
      // A partial Fisher-Yates shuffle chooses uniformly without replacement.
      for (let i = 0; i < input.questionCount; i++) {
        const selected = randomInt(i, pool.length);
        [pool[i], pool[selected]] = [pool[selected], pool[i]];
      }
      const quiz = await createQuiz(
        userId,
        {
          title: input.title,
          description: `Practice from ${bank.name}`,
          questions: pool.slice(0, input.questionCount),
          settings: {
            durationMinutes: input.durationMinutes,
            shuffleQuestions: true,
            shuffleOptions: true,
            mode: "practice",
            showExplanations: true,
          },
        },
        tx,
      );
      await tx.auditLog.create({
        data: { userId, action: "bank.sampled", resourceId: id },
      });
      return quiz;
    },
    { maxWait: 10000, timeout: 20000 },
  );
}
