import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../../src/server/db";
import { createQuiz, getQuiz } from "../../src/server/assessment";
import {
  createBank,
  getBank,
  listBanks,
  updateBank,
  deleteBank,
  sampleBank,
} from "../../src/server/banks";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error(
    "Bank tests require isolated localhost:55439/quizbee_v2_test",
  );
const questions = ["easy", "medium", "hard"].map((difficulty, index) => ({
  id: `q${index}`,
  type: "single_choice",
  prompt: `Fixture ${index}`,
  choices: [
    { id: "a", text: "First" },
    { id: "b", text: "Second" },
  ],
  correctAnswer: "a",
  explanation: "Fixture rationale",
  difficulty,
  topic: "Testing",
  points: 1,
  sourceRefs: [],
  tags: [],
}));
const settings = {
  durationMinutes: null,
  shuffleQuestions: false,
  shuffleOptions: false,
  mode: "practice",
  showExplanations: true,
};
async function fixture() {
  const owner = await db.user.create({
    data: {
      name: "Bank owner",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "not-a-login",
    },
  });
  const other = await db.user.create({
    data: {
      name: "Other owner",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "not-a-login",
    },
  });
  return {
    owner,
    other,
    async clean() {
      await db.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
    },
  };
}
test.after(async () => {
  await db.$disconnect();
});

test("banks start empty or copy owned quiz content and hide all data from other users", async () => {
  const f = await fixture();
  try {
    const empty = await createBank(f.owner.id, { name: "Empty bank" });
    assert.equal(empty.questionCount, 0);
    const quiz = await createQuiz(f.owner.id, {
      title: "Source",
      description: "",
      questions,
      settings,
    });
    const bank = await createBank(f.owner.id, {
      name: "Seeded bank",
      folder: "Systems",
      quizId: quiz.id,
    });
    assert.equal(bank.questionCount, 3);
    assert.deepEqual(
      (await getBank(f.owner.id, bank.id)).questions.map((q) => q.id),
      ["q0", "q1", "q2"],
    );
    assert.equal((await listBanks(f.owner.id)).length, 2);
    assert.equal((await listBanks(f.other.id)).length, 0);
    await assert.rejects(
      createBank(f.other.id, { name: "Copied", quizId: quiz.id }),
      { code: "NOT_FOUND" },
    );
    for (const action of [
      () => getBank(f.other.id, bank.id),
      () =>
        updateBank(f.other.id, bank.id, {
          name: "Changed",
          description: "",
          folder: "",
          questions,
        }),
      () => deleteBank(f.other.id, bank.id),
      () =>
        sampleBank(f.other.id, bank.id, { title: "Stolen", questionCount: 1 }),
    ])
      await assert.rejects(action, { code: "NOT_FOUND" });
  } finally {
    await f.clean();
  }
});

test("bank updates preserve version history and reject malformed later questions without partial writes", async () => {
  const f = await fixture();
  try {
    const bank = await createBank(f.owner.id, { name: "Versioned" });
    const updated = await updateBank(f.owner.id, bank.id, {
      name: "Versioned",
      description: "Notes",
      folder: "Study",
      questions,
    });
    assert.equal(updated.latestVersion, 2);
    const versions = await db.bankVersion.findMany({
      where: { bankId: bank.id },
      orderBy: { number: "asc" },
    });
    assert.deepEqual(versions[0].questions, []);
    assert.equal((versions[1].questions as unknown[]).length, 3);
    await assert.rejects(
      updateBank(f.owner.id, bank.id, {
        name: "Must not persist",
        description: "",
        folder: "",
        questions: [
          ...questions,
          { ...questions[0], id: "bad", correctAnswer: "invented" },
        ],
      }),
      { code: "INVALID_INPUT" },
    );
    assert.equal((await getBank(f.owner.id, bank.id)).name, "Versioned");
    assert.equal(await db.bankVersion.count({ where: { bankId: bank.id } }), 2);
    await assert.rejects(
      updateBank(f.owner.id, bank.id, {
        name: "Duplicate",
        description: "",
        folder: "",
        questions: [...questions, questions[0]],
      }),
      { code: "INVALID_INPUT" },
    );
    const concurrent = await Promise.all([
      updateBank(f.owner.id, bank.id, {
        name: "A",
        description: "",
        folder: "",
        questions,
      }),
      updateBank(f.owner.id, bank.id, {
        name: "B",
        description: "",
        folder: "",
        questions: [],
      }),
    ]);
    assert.deepEqual(
      concurrent.map((bank) => bank.latestVersion).sort(),
      [3, 4],
    );
    assert.equal(await db.bankVersion.count({ where: { bankId: bank.id } }), 4);
  } finally {
    await f.clean();
  }
});

test("sampling filters difficulty without replacement and snapshot survives bank deletion", async () => {
  const f = await fixture();
  try {
    const bank = await createBank(f.owner.id, { name: "Sampling" });
    await updateBank(f.owner.id, bank.id, {
      name: bank.name,
      description: "",
      folder: "",
      questions,
    });
    const quiz = await sampleBank(f.owner.id, bank.id, {
      title: "Practice",
      questionCount: 3,
      difficulty: "mixed",
      durationMinutes: 15,
    });
    assert.equal(quiz.questions.length, 3);
    assert.equal(
      new Set(quiz.questions.map((question) => question.id)).size,
      3,
    );
    assert.equal(quiz.settings.durationMinutes, 15);
    const hard = await sampleBank(f.owner.id, bank.id, {
      title: "Hard only",
      questionCount: 1,
      difficulty: "hard",
    });
    assert.equal(hard.questions[0].id, "q2");
    await assert.rejects(
      sampleBank(f.owner.id, bank.id, {
        title: "Insufficient pool",
        questionCount: 2,
        difficulty: "hard",
      }),
      { code: "INSUFFICIENT_QUESTIONS" },
    );
    await assert.rejects(
      sampleBank(f.owner.id, bank.id, {
        title: "Invalid",
        questionCount: 1,
        ownerId: f.other.id,
      }),
      { code: "INVALID_INPUT" },
    );
    assert.equal(await db.quiz.count({ where: { ownerId: f.owner.id } }), 2);
    await deleteBank(f.owner.id, bank.id);
    assert.equal((await getQuiz(f.owner.id, quiz.id)).questionCount, 3);
    assert.equal(await db.bankVersion.count({ where: { bankId: bank.id } }), 0);
  } finally {
    await f.clean();
  }
});
