import { randomInt } from "node:crypto";
import { z } from "zod";
import { AppError } from "../server/errors";

export const SafeIdSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9_-]+$/)
  .refine(
    (value) => !["__proto__", "constructor", "prototype"].includes(value),
  );
const shortText = z.string().trim().min(1).max(10000);
export const QuestionTypeSchema = z.enum([
  "single_choice",
  "multiple_select",
  "true_false",
  "short_answer",
  "numeric",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
]);
const AnswerSchema = z.union([
  z.string().max(20000),
  z.number().finite(),
  z.array(z.string().max(10000)).max(100),
  z.record(SafeIdSchema, z.string().max(10000)),
]);
export type Answer = z.infer<typeof AnswerSchema>;
export type Answers = Record<string, Answer>;
const sameSet = (left: string[], right: string[]) =>
  left.length === right.length &&
  [...left].sort().every((id, i) => id === [...right].sort()[i]);
const unique = (values: string[]) => new Set(values).size === values.length;
const isRecord = (value: unknown): value is Record<string, string> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

export const QuestionSchema = z
  .object({
    id: SafeIdSchema,
    type: QuestionTypeSchema,
    prompt: shortText,
    choices: z
      .array(z.object({ id: SafeIdSchema, text: shortText }).strict())
      .max(100),
    correctAnswer: AnswerSchema,
    explanation: z.string().max(10000).default(""),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    topic: z.string().trim().min(1).max(100).default("General"),
    points: z.number().int().min(1).max(100).default(1),
    tolerance: z.number().finite().min(0).max(1e12).optional(),
    sourceRefs: z
      .array(
        z
          .object({
            chunkId: SafeIdSchema,
            label: z.string().max(200),
            quote: z.string().max(2000),
          })
          .strict(),
      )
      .max(20)
      .default([]),
    tags: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  })
  .strict()
  .superRefine((question, ctx) => {
    const ids = question.choices.map((choice) => choice.id);
    const answer = question.correctAnswer;
    const issue = (message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    if (!unique(ids)) issue("Choice IDs must be unique");
    if (question.tolerance !== undefined && question.type !== "numeric")
      issue("Tolerance applies only to numeric questions");
    switch (question.type) {
      case "single_choice":
      case "true_false":
        if (
          ids.length < 2 ||
          (question.type === "true_false" && ids.length !== 2) ||
          typeof answer !== "string" ||
          !ids.includes(answer)
        )
          issue("Correct answer must identify an available choice");
        break;
      case "multiple_select":
        if (
          ids.length < 2 ||
          !Array.isArray(answer) ||
          !answer.length ||
          !unique(answer) ||
          answer.some((id) => !ids.includes(id))
        )
          issue("Correct answer must contain distinct available choice IDs");
        break;
      case "ordering":
        if (
          ids.length < 2 ||
          !Array.isArray(answer) ||
          !unique(answer) ||
          !sameSet(answer, ids)
        )
          issue("Correct ordering must contain every choice exactly once");
        break;
      case "matching":
        if (
          ids.length < 2 ||
          !isRecord(answer) ||
          !sameSet(Object.keys(answer), ids) ||
          Object.values(answer).some((text) => !text.trim())
        )
          issue("Correct matching must map every choice to a nonempty target");
        break;
      case "numeric":
        if (
          typeof answer !== "number" ||
          !Number.isFinite(answer) ||
          ids.length
        )
          issue("Numeric answer must be a finite number without choices");
        break;
      case "short_answer":
      case "fill_blank":
        if (typeof answer !== "string" || !answer.trim() || ids.length)
          issue("Correct text answer must be nonempty without choices");
        break;
      case "essay":
        if (typeof answer !== "string" || ids.length)
          issue("Essay rubric must be text without choices");
    }
  });
export type Question = z.infer<typeof QuestionSchema>;
export const QuestionsSchema = z
  .array(QuestionSchema)
  .min(1)
  .max(100)
  .refine(
    (questions) => unique(questions.map((q) => q.id)),
    "Question IDs must be unique",
  );
export const SettingsSchema = z
  .object({
    durationMinutes: z.number().int().min(1).max(1440).nullable(),
    shuffleQuestions: z.boolean(),
    shuffleOptions: z.boolean(),
    mode: z.enum(["practice", "exam"]),
    showExplanations: z.boolean(),
  })
  .strict();
export type Settings = z.infer<typeof SettingsSchema>;
export const QuizInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000),
    questions: QuestionsSchema,
    settings: SettingsSchema,
  })
  .strict();
export const StartAttemptSchema = z
  .object({
    assignmentId: SafeIdSchema.optional(),
    accessCode: z.string().min(1).max(200).optional(),
  })
  .strict();
export const SaveAnswersSchema = z
  .object({
    answers: z.record(SafeIdSchema, AnswerSchema),
    revision: z.number().int().min(0),
    flagged: z.array(SafeIdSchema).max(100).optional(),
    currentQuestionIndex: z.number().int().min(0).max(99).optional(),
  })
  .strict();

export function parseInput<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new AppError(
      "INVALID_INPUT",
      result.error.issues[0]?.message || "Invalid input",
      400,
    );
  return result.data;
}

export function validateAnswers(
  questions: Question[],
  input: unknown,
): Answers {
  const answers = parseInput(z.record(SafeIdSchema, AnswerSchema), input);
  if (Object.keys(answers).length > questions.length)
    throw new AppError(
      "INVALID_ANSWER",
      "Answers contain unknown questions",
      400,
    );
  const byId = new Map(questions.map((question) => [question.id, question]));
  for (const [id, answer] of Object.entries(answers)) {
    const question = byId.get(id);
    if (!question)
      throw new AppError(
        "INVALID_ANSWER",
        "Answer does not belong to this quiz",
        400,
      );
    const ids = question.choices.map((choice) => choice.id);
    let valid = false;
    switch (question.type) {
      case "single_choice":
      case "true_false":
        valid = typeof answer === "string" && ids.includes(answer);
        break;
      case "multiple_select":
        valid =
          Array.isArray(answer) &&
          unique(answer) &&
          answer.every((value) => ids.includes(value));
        break;
      case "ordering":
        valid = Array.isArray(answer) && unique(answer) && sameSet(answer, ids);
        break;
      case "matching":
        valid =
          isRecord(answer) &&
          Object.entries(answer).every(
            ([key, value]) =>
              ids.includes(key) &&
              Object.values(
                question.correctAnswer as Record<string, string>,
              ).includes(value),
          );
        break;
      case "numeric":
        valid = typeof answer === "number" && Number.isFinite(answer);
        break;
      case "short_answer":
      case "fill_blank":
      case "essay":
        valid = typeof answer === "string";
        break;
    }
    if (!valid)
      throw new AppError(
        "INVALID_ANSWER",
        "Answer has an invalid type or choice",
        400,
      );
  }
  return answers;
}

const normalize = (text: string) =>
  text.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
export function gradeQuestions(questions: Question[], input: unknown) {
  const answers = validateAnswers(questions, input);
  const items = questions.map((question) => {
    const answer = answers[question.id];
    let earned: number | null = 0;
    if (answer !== undefined && answer !== "") {
      const correct = question.correctAnswer;
      let matches = false;
      switch (question.type) {
        case "single_choice":
        case "true_false":
          matches = answer === correct;
          break;
        case "multiple_select":
          matches = sameSet(answer as string[], correct as string[]);
          break;
        case "ordering":
          matches = (answer as string[]).every(
            (id, i) => id === (correct as string[])[i],
          );
          break;
        case "matching":
          matches =
            Object.keys(correct).length === Object.keys(answer).length &&
            Object.entries(correct).every(
              ([id, target]) =>
                (answer as Record<string, string>)[id] === target,
            );
          break;
        case "numeric":
          matches =
            Math.abs((answer as number) - (correct as number)) <=
            (question.tolerance ?? 0);
          break;
        case "short_answer":
        case "fill_blank":
          matches =
            normalize(answer as string) === normalize(correct as string);
          break;
        case "essay":
          earned = (answer as string).trim() ? null : 0;
          break;
      }
      if (matches) earned = question.points;
    }
    return { questionId: question.id, earned, points: question.points };
  });
  const autoScore = items.reduce(
    (total, item) => total + (item.earned ?? 0),
    0,
  );
  const pendingReview = items.some((item) => item.earned === null);
  return {
    items,
    autoScore,
    score: pendingReview ? null : autoScore,
    maxScore: questions.reduce((total, question) => total + question.points, 0),
    pendingReview,
  };
}
export type Grade = ReturnType<typeof gradeQuestions>;

export type AttemptSnapshot = {
  title: string;
  questions: Question[];
  settings: Settings;
  reviewAfter: string | null;
  allowBacktracking: boolean;
  integrityEnabled: boolean;
};
function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function buildSnapshot(
  title: string,
  questions: Question[],
  settings: Settings,
  policy: Partial<
    Pick<
      AttemptSnapshot,
      "reviewAfter" | "allowBacktracking" | "integrityEnabled"
    >
  > = {},
): AttemptSnapshot {
  const copied = structuredClone(questions).map((question) => ({
    ...question,
    choices: settings.shuffleOptions
      ? shuffled(question.choices)
      : question.choices,
  }));
  return {
    title,
    questions: settings.shuffleQuestions ? shuffled(copied) : copied,
    settings: { ...settings },
    reviewAfter: policy.reviewAfter ?? null,
    allowBacktracking: policy.allowBacktracking ?? true,
    integrityEnabled: policy.integrityEnabled ?? false,
  };
}
export function presentedQuestions(questions: Question[]) {
  return questions.map((question) => ({
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    choices: question.choices,
    difficulty: question.difficulty,
    topic: question.topic,
    points: question.points,
    tags: question.tags,
    ...(question.type === "matching"
      ? {
          matchingTargets: [
            ...new Set(
              Object.values(question.correctAnswer as Record<string, string>),
            ),
          ].sort(),
        }
      : {}),
  }));
}

export function requireOwner(ownerId: string, userId: string) {
  if (ownerId !== userId)
    throw new AppError("NOT_FOUND", "Resource not found", 404);
}
