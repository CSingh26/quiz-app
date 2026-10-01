import test from "node:test";
import assert from "node:assert/strict";
import {
  QuestionsSchema,
  QuizInputSchema,
  gradeQuestions,
  validateAnswers,
  buildSnapshot,
  presentedQuestions,
} from "../../src/domain/assessment";

const base = {
  prompt: "Fixture question",
  choices: [],
  explanation: "A private explanation",
  difficulty: "medium",
  topic: "Logic",
  points: 2,
  sourceRefs: [
    { chunkId: "chunk1", label: "Page 1", quote: "Private source quote" },
  ],
  tags: [],
};
const choices = [
  { id: "a", text: "A" },
  { id: "b", text: "B" },
  { id: "c", text: "C" },
];
const fixture = [
  { ...base, id: "single", type: "single_choice", choices, correctAnswer: "a" },
  {
    ...base,
    id: "multiple",
    type: "multiple_select",
    choices,
    correctAnswer: ["a", "c"],
  },
  {
    ...base,
    id: "boolean",
    type: "true_false",
    choices: choices.slice(0, 2),
    correctAnswer: "b",
  },
  { ...base, id: "short", type: "short_answer", correctAnswer: "Hello world" },
  {
    ...base,
    id: "numeric",
    type: "numeric",
    correctAnswer: 10,
    tolerance: 0.5,
  },
  { ...base, id: "blank", type: "fill_blank", correctAnswer: "Queue" },
  {
    ...base,
    id: "matching",
    type: "matching",
    choices,
    correctAnswer: { a: "Alpha", b: "Beta", c: "Gamma" },
  },
  {
    ...base,
    id: "ordering",
    type: "ordering",
    choices,
    correctAnswer: ["b", "a", "c"],
  },
  { ...base, id: "essay", type: "essay", correctAnswer: "" },
];
const questions = () => QuestionsSchema.parse(fixture);

test("question schema rejects duplicate identities, fabricated correct choices and unknown keys", () => {
  assert.equal(questions().length, 9);
  for (const input of [
    [...fixture, fixture[0]],
    [{ ...fixture[0], correctAnswer: "not-a-choice" }],
    [{ ...fixture[0], choices: [choices[0], choices[0]] }],
    [{ ...fixture[0], leaked: true }],
    [{ ...fixture[6], correctAnswer: { a: "Alpha" } }],
    [{ ...fixture[7], correctAnswer: ["a", "a", "c"] }],
    [{ ...fixture[4], tolerance: -1 }],
    [{ ...fixture[0], id: "__proto__" }],
  ])
    assert.equal(QuestionsSchema.safeParse(input).success, false);
});

test("grading honors every auto-graded type, exact set/order and numeric tolerance", () => {
  const q = questions();
  const grade = gradeQuestions(q, {
    single: "a",
    multiple: ["c", "a"],
    boolean: "b",
    short: "  HELLO   world ",
    numeric: 10.5,
    blank: "queue",
    matching: { a: "Alpha", b: "Beta", c: "Gamma" },
    ordering: ["b", "a", "c"],
  });
  assert.equal(grade.score, 16);
  assert.equal(grade.maxScore, 18);
  assert.equal(grade.pendingReview, false);
  assert.equal(
    gradeQuestions(q, {
      multiple: ["a"],
      ordering: ["a", "b", "c"],
      numeric: 10.6,
    }).score,
    0,
  );
});

test("answered essays are explicitly pending manual review with no final score", () => {
  const grade = gradeQuestions(questions(), {
    single: "a",
    essay: "A considered argument",
  });
  assert.equal(grade.score, null);
  assert.equal(grade.autoScore, 2);
  assert.equal(grade.pendingReview, true);
  assert.equal(grade.items.find((i) => i.questionId === "essay")?.earned, null);
});

test("answers reject unknown question IDs, invalid choices, wrong types and oversized essays", () => {
  for (const answer of [
    { other: "a" },
    { single: "x" },
    { numeric: "10" },
    { multiple: ["a", "a"] },
    { matching: { a: "Invented" } },
    { ordering: ["a"] },
    { essay: "x".repeat(20001) },
  ]) {
    assert.throws(() => validateAnswers(questions(), answer));
  }
  assert.deepEqual(
    validateAnswers(questions(), { single: "b", matching: { a: "Beta" } }),
    { single: "b", matching: { a: "Beta" } },
  );
});

test("snapshot shuffling preserves its source and presented questions never disclose grading sources", () => {
  const q = questions();
  const source = JSON.stringify(q);
  const snapshot = buildSnapshot("Title", q, {
    durationMinutes: 20,
    shuffleQuestions: true,
    shuffleOptions: true,
    mode: "practice",
    showExplanations: true,
  });
  assert.equal(JSON.stringify(q), source);
  assert.equal(snapshot.questions.length, 9);
  const visible = presentedQuestions(snapshot.questions);
  for (const question of visible) {
    assert.equal("correctAnswer" in question, false);
    assert.equal("explanation" in question, false);
    assert.equal("sourceRefs" in question, false);
  }
  assert.deepEqual(
    visible.find((q) => q.id === "matching")?.matchingTargets?.sort(),
    ["Alpha", "Beta", "Gamma"],
  );
});

test("quiz writes require complete strict bounded settings", () => {
  const payload = {
    title: "Quiz",
    description: "",
    questions: fixture,
    settings: {
      durationMinutes: null,
      shuffleQuestions: false,
      shuffleOptions: false,
      mode: "practice",
      showExplanations: true,
    },
  };
  assert.equal(QuizInputSchema.safeParse(payload).success, true);
  assert.equal(
    QuizInputSchema.safeParse({ ...payload, ownerId: "another" }).success,
    false,
  );
  assert.equal(
    QuizInputSchema.safeParse({
      ...payload,
      settings: { ...payload.settings, durationMinutes: 0 },
    }).success,
    false,
  );
});
