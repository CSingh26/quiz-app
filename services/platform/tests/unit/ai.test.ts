import test from "node:test";
import assert from "node:assert/strict";
import {
  validateGeneratedQuestions,
  selectContext,
  parseGenerationInput,
  type GenerationInput,
} from "../../src/server/ai/validation";
const source = [
  {
    id: "chunk-1",
    text: "Mitochondria generate ATP through cellular respiration.",
    label: "page 2",
  },
];
const request: GenerationInput = {
  materialIds: ["mat-1"],
  title: "Biology",
  questionCount: 1,
  difficulty: "easy",
  questionTypes: ["single_choice"],
  durationMinutes: 15,
};
const question = {
  id: "q1",
  type: "single_choice",
  prompt: "Which organelle generates ATP?",
  choices: [
    { id: "a", text: "Mitochondria" },
    { id: "b", text: "Nucleus" },
  ],
  correctAnswer: "a",
  explanation: "Mitochondria generate ATP.",
  difficulty: "easy",
  topic: "Cells",
  points: 1,
  sourceRefs: [
    { chunkId: "chunk-1", label: "page 2", quote: "Mitochondria generate ATP" },
  ],
  tags: [],
};
test("AI output must match requested count, type and genuine quoted provenance", () => {
  assert.equal(
    validateGeneratedQuestions({ questions: [question] }, request, source)
      .length,
    1,
  );
  for (const payload of [
    { questions: [] },
    { questions: [{ ...question, type: "essay" }] },
    { questions: [{ ...question, correctAnswer: "unknown" }] },
    { questions: [{ ...question, sourceRefs: [] }] },
    {
      questions: [
        {
          ...question,
          sourceRefs: [
            { chunkId: "invented", label: "page 2", quote: "Mitochondria" },
          ],
        },
      ],
    },
    {
      questions: [
        {
          ...question,
          sourceRefs: [
            { chunkId: "chunk-1", label: "page 2", quote: "fabricated claim" },
          ],
        },
      ],
    },
  ])
    assert.throws(() => validateGeneratedQuestions(payload, request, source));
});
test("generation input rejects unknown fields, excessive count and unsupported types", () => {
  assert.equal(parseGenerationInput(request).questionCount, 1);
  for (const payload of [
    { ...request, questionCount: 101 },
    { ...request, questionTypes: ["unknown"] },
    { ...request, ownerId: "other" },
    { ...request, materialIds: [] },
  ])
    assert.throws(() => parseGenerationInput(payload));
});
test("lexical retrieval keeps relevant bounded original chunks rather than fabricating context", () => {
  const selected = selectContext(
    [
      ...source,
      { id: "noise", label: "page 1", text: "Geography maps rivers." },
    ],
    "ATP mitochondria",
    1000,
  );
  assert.equal(selected[0].id, "chunk-1");
  assert.ok(selected.every((c) => ["chunk-1", "noise"].includes(c.id)));
});
