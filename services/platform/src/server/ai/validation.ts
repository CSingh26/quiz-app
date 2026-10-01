import { z } from "zod";
import { QuestionsSchema, type Question } from "../../domain/assessment";

export const QuestionTypes = [
  "single_choice",
  "multiple_select",
  "true_false",
  "short_answer",
  "numeric",
  "fill_blank",
  "matching",
  "ordering",
  "essay",
] as const;
const GenerationInputSchema = z
  .object({
    materialIds: z.array(z.string().min(1).max(100)).min(1).max(10),
    title: z.string().trim().min(1).max(160),
    questionCount: z.number().int().min(1).max(100),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
    questionTypes: z.array(z.enum(QuestionTypes)).min(1).max(9),
    durationMinutes: z.number().int().min(1).max(600).nullable(),
    topics: z.string().trim().max(1000).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (new Set(value.materialIds).size !== value.materialIds.length)
      ctx.addIssue({ code: "custom", message: "Material IDs must be unique" });
    if (new Set(value.questionTypes).size !== value.questionTypes.length)
      ctx.addIssue({
        code: "custom",
        message: "Question types must be unique",
      });
    if (value.questionCount < value.questionTypes.length)
      ctx.addIssue({
        code: "custom",
        message: "Request at least one question per selected type",
      });
  });
export type GenerationInput = z.infer<typeof GenerationInputSchema>;
export type SourceChunk = { id: string; text: string; label: string };
export function parseGenerationInput(body: unknown): GenerationInput {
  return GenerationInputSchema.parse(body);
}
const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
export function validateGeneratedQuestions(
  body: unknown,
  request: Pick<
    GenerationInput,
    "questionCount" | "questionTypes" | "difficulty"
  >,
  context: SourceChunk[],
): Question[] {
  const parsed = z.object({ questions: QuestionsSchema }).strict().parse(body);
  if (parsed.questions.length !== request.questionCount)
    throw new Error("AI returned a different question count than requested");
  const chunks = new Map(context.map((chunk) => [chunk.id, chunk]));
  for (const question of parsed.questions) {
    if (!request.questionTypes.includes(question.type))
      throw new Error("AI returned a question type that was not requested");
    if (
      request.difficulty !== "mixed" &&
      question.difficulty !== request.difficulty
    )
      throw new Error("AI returned the wrong difficulty");
    if (!question.sourceRefs.length)
      throw new Error("Every generated question must cite source material");
    for (const ref of question.sourceRefs) {
      const source = chunks.get(ref.chunkId),
        quote = normalized(ref.quote);
      if (
        !source ||
        ref.label !== source.label ||
        quote.length < 8 ||
        !normalized(source.text).includes(quote)
      )
        throw new Error(
          "AI source references must quote the supplied material exactly",
        );
    }
  }
  if (
    request.questionTypes.some(
      (type) => !parsed.questions.some((question) => question.type === type),
    )
  )
    throw new Error("AI omitted a requested question type");
  return parsed.questions;
}

// Deterministic bounded lexical retrieval is the baseline. It intentionally
// exposes original chunk IDs; an embedding retriever can replace ranking only,
// preserving ownership filtering, context budgets and provenance validation.
export function selectContext(
  chunks: SourceChunk[],
  query: string,
  maxCharacters = 32000,
): SourceChunk[] {
  const terms = [
    ...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []),
  ];
  const ranked = chunks
    .map((chunk, index) => ({
      chunk,
      index,
      score: terms.reduce(
        (score, term) =>
          score + (chunk.text.toLowerCase().includes(term) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const selected: SourceChunk[] = [];
  let characters = 0;
  for (const { chunk } of ranked) {
    if (selected.length >= 24) break;
    if (characters + chunk.text.length > maxCharacters) continue;
    selected.push(chunk);
    characters += chunk.text.length;
  }
  return selected;
}
