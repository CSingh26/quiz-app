import { test, expect, type Page } from "@playwright/test";
const fixtureUser = {
  id: "fixture-user",
  name: "Fixture learner",
  email: "fixture@example.test",
  role: "STUDENT",
};
async function auth(page: Page) {
  await page.route("**/api/v2/auth/me", (route) =>
    route.fulfill({ json: { user: fixtureUser } }),
  );
}
const baseQuestion = {
  difficulty: "medium",
  topic: "Fixture topic",
  points: 1,
};
function questions() {
  return [
    {
      ...baseQuestion,
      id: "single",
      type: "single_choice",
      prompt: "Fixture: choose FIFO.",
      choices: [
        { id: "queue", text: "Queue" },
        { id: "stack", text: "Stack" },
      ],
    },
    {
      ...baseQuestion,
      id: "multi",
      type: "multiple_select",
      prompt: "Fixture: choose two letters.",
      choices: [
        { id: "a", text: "Alpha" },
        { id: "b", text: "Beta" },
        { id: "c", text: "Gamma" },
      ],
    },
    {
      ...baseQuestion,
      id: "boolean",
      type: "true_false",
      prompt: "Fixture: true or false.",
      choices: [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ],
    },
    {
      ...baseQuestion,
      id: "short",
      type: "short_answer",
      prompt: "Fixture: write a short answer.",
      choices: [],
    },
    {
      ...baseQuestion,
      id: "numeric",
      type: "numeric",
      prompt: "Fixture: enter a number.",
      choices: [],
    },
    {
      ...baseQuestion,
      id: "blank",
      type: "fill_blank",
      prompt: "Fixture: complete the blank.",
      choices: [],
    },
    {
      ...baseQuestion,
      id: "matching",
      type: "matching",
      prompt: "Fixture: match each term.",
      choices: [
        { id: "cat", text: "Cat" },
        { id: "dog", text: "Dog" },
      ],
      matchingTargets: ["Meow", "Woof"],
    },
    {
      ...baseQuestion,
      id: "ordering",
      type: "ordering",
      prompt: "Fixture: arrange the items.",
      choices: [
        { id: "first", text: "First" },
        { id: "second", text: "Second" },
      ],
    },
    {
      ...baseQuestion,
      id: "essay",
      type: "essay",
      prompt: "Fixture: explain your thinking.",
      choices: [],
    },
  ];
}
function attempt(backtracking = true) {
  return {
    id: "fixture-attempt",
    quizId: "fixture-quiz",
    title: "Fixture: nine kinds of thinking",
    status: "in_progress",
    mode: "practice",
    questions: questions(),
    answers: {} as Record<string, unknown>,
    flagged: [] as string[],
    revision: 0,
    startedAt: new Date().toISOString(),
    expiresAt: null,
    serverNow: new Date().toISOString(),
    score: null,
    maxScore: 9,
    percentage: null,
    submittedAt: null,
    allowBacktracking: backtracking,
    integrityEnabled: false,
    currentQuestionIndex: 0,
  };
}
test("all nine answer controls autosave, resume stable answers, and submit exactly once", async ({
  page,
}) => {
  await auth(page);
  let saved = attempt();
  let submissions = 0;
  await page.route("**/api/v2/attempts/fixture-attempt", (route) =>
    route.fulfill({ json: { attempt: saved } }),
  );
  await page.route(
    "**/api/v2/attempts/fixture-attempt/answers",
    async (route) => {
      const body = route.request().postDataJSON();
      expect(body.revision).toBe(saved.revision);
      expect(body).not.toHaveProperty("correctAnswer");
      await new Promise((resolve) => setTimeout(resolve, 80));
      saved = {
        ...saved,
        answers: body.answers,
        flagged: body.flagged,
        currentQuestionIndex: body.currentQuestionIndex,
        revision: saved.revision + 1,
        serverNow: new Date().toISOString(),
      };
      await route.fulfill({ json: { attempt: saved } });
    },
  );
  await page.route(
    "**/api/v2/attempts/fixture-attempt/submit",
    async (route) => {
      submissions += 1;
      expect(saved.answers).toEqual({
        single: "queue",
        multi: ["a", "b"],
        boolean: "true",
        short: "A stable final answer",
        numeric: 42,
        blank: "memory",
        matching: { cat: "Meow", dog: "Woof" },
        ordering: ["first", "second"],
        essay: "A thoughtful fixture response.",
      });
      saved = { ...saved, status: "submitted" };
      await route.fulfill({
        json: { attempt: { ...saved, pendingReview: true } },
      });
    },
  );
  await page.goto("/study/attempts/fixture-attempt");
  await page.getByRole("radio", { name: /Queue/ }).check();
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByRole("checkbox", { name: /Alpha/ }).check();
  await page.getByRole("checkbox", { name: /Beta/ }).check();
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByRole("radio", { name: /True/ }).check();
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByLabel("Your answer", { exact: true }).fill("An early answer");
  await page
    .getByLabel("Your answer", { exact: true })
    .fill("A stable final answer");
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByLabel("Your numerical answer").fill("42");
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByLabel("Your answer", { exact: true }).fill("memory");
  await page.getByRole("button", { name: /Next question/ }).click();
  await page
    .getByRole("combobox", { name: "Cat", exact: true })
    .selectOption("Meow");
  await page
    .getByRole("combobox", { name: "Dog", exact: true })
    .selectOption("Woof");
  await page.getByRole("button", { name: /Next question/ }).click();
  await page.getByRole("button", { name: "Confirm this order" }).click();
  await page.getByRole("button", { name: /Next question/ }).click();
  await page
    .getByLabel(/^Your response/)
    .fill("A thoughtful fixture response.");
  await expect(page.getByText("All changes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel(/^Your response/)).toHaveValue(
    "A thoughtful fixture response.",
  );
  await page
    .getByRole("button", { name: "Question 9, answered", exact: true })
    .click();
  await expect(page.getByLabel(/^Your response/)).toHaveValue(
    "A thoughtful fixture response.",
  );
  await page.getByRole("button", { name: "Review & submit" }).click();
  await page
    .getByRole("button", { name: "Submit attempt", exact: true })
    .click();
  await expect(page.getByText("Your attempt is complete.")).toBeVisible();
  expect(submissions).toBe(1);
});
test("forward-only attempts persist the cursor and disable old questions after reload", async ({
  page,
}) => {
  await auth(page);
  let saved = attempt(false);
  await page.route("**/api/v2/attempts/fixture-attempt", (route) =>
    route.fulfill({ json: { attempt: saved } }),
  );
  await page.route(
    "**/api/v2/attempts/fixture-attempt/answers",
    async (route) => {
      const body = route.request().postDataJSON();
      expect(body.currentQuestionIndex).toBeGreaterThanOrEqual(
        saved.currentQuestionIndex,
      );
      saved = {
        ...saved,
        answers: body.answers,
        flagged: body.flagged,
        revision: saved.revision + 1,
        currentQuestionIndex: body.currentQuestionIndex,
      };
      await route.fulfill({ json: { attempt: saved } });
    },
  );
  await page.goto("/study/attempts/fixture-attempt");
  await page.getByRole("radio", { name: /Queue/ }).check();
  await page.getByRole("button", { name: /Next question/ }).click();
  await expect(
    page.getByRole("heading", { name: "Fixture: choose two letters." }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Fixture: choose two letters." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Question 1, answered", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Previous", exact: true }),
  ).toHaveCount(0);
});
test("unconfigured generation offers real alternatives without a fake generate action", async ({
  page,
}) => {
  await auth(page);
  await page.route("**/api/v2/generation/config", (route) =>
    route.fulfill({ json: { configured: false, provider: null } }),
  );
  await page.route("**/api/v2/materials", (route) =>
    route.fulfill({ json: { materials: [] } }),
  );
  await page.goto("/study/generate");
  await expect(
    page.getByRole("heading", { name: "A provider makes this part possible." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Write a quiz/ }),
  ).toHaveAttribute("href", "/study/quizzes/new");
  await expect(
    page.getByRole("button", { name: "Generate draft" }),
  ).toHaveCount(0);
});
test("invalid imported questions report validation errors without breaking the editor", async ({
  page,
}) => {
  await auth(page);
  await page.route("**/api/v2/questions/validate", (route) =>
    route.fulfill({
      status: 400,
      json: {
        error: {
          code: "VALIDATION_ERROR",
          message: "Question choices must have an ID and text.",
        },
      },
    }),
  );
  await page.goto("/study/quizzes/new");
  await page.getByLabel("Import quiz questions JSON").setInputFiles({
    name: "invalid-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify([
        {
          type: "single_choice",
          prompt: "Fixture: malformed choice",
          choices: [null],
        },
      ]),
    ),
  });
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Question choices must have an ID and text.",
  );
  await expect(page.getByLabel("Quiz title", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Add a question/ }),
  ).toBeEnabled();
});
