import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";

const password = "Local test password with 12+ characters";
const sampleQuiz = {
  title: "Local test · Memory and learning",
  description: "Synthetic content created by the browser test.",
  questions: [
    {
      id: "q1",
      type: "single_choice",
      prompt: "Which action practices active recall?",
      choices: [
        { id: "a", text: "Remembering without looking" },
        { id: "b", text: "Rereading the same page" },
      ],
      correctAnswer: "a",
      explanation: "Active recall retrieves an idea from memory.",
      difficulty: "easy",
      topic: "Learning",
      points: 1,
      sourceRefs: [],
      tags: [],
    },
  ],
  settings: {
    durationMinutes: 10,
    shuffleQuestions: false,
    shuffleOptions: false,
    mode: "practice",
    showExplanations: true,
  },
};

async function registerApi(page: Page, baseURL: string, role = "STUDENT") {
  const email = `${randomUUID()}@example.invalid`;
  const response = await page.request.post("/api/v2/auth/register", {
    headers: { origin: baseURL },
    data: { name: "Local test learner", email, password, role },
  });
  expect(response.status()).toBe(201);
  return email;
}
async function cleanAccount(page: Page, baseURL: string) {
  await page.request.delete("/api/v2/account", {
    headers: { origin: baseURL },
    data: { password },
  });
}

test("real student registration, creation, answer recovery and server result", async ({
  page,
  baseURL,
}, info) => {
  test.setTimeout(60000);
  const email = `${randomUUID()}@example.invalid`;
  await page.goto("/study/register");
  await page.getByLabel("Your name").fill("Local test learner");
  await page.getByLabel("Email address").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Create my workspace" }).click();
  await expect(page).toHaveURL(/\/study$/);
  try {
    await page.goto("/study/quizzes/new");
    await page
      .getByLabel("Quiz title", { exact: true })
      .fill("Local test · Active recall");
    await page
      .getByLabel("Question", { exact: true })
      .fill("Which action practices active recall?");
    await page
      .getByLabel("Question 1 option 1", { exact: true })
      .fill("Remembering without looking");
    await page
      .getByLabel("Question 1 option 2", { exact: true })
      .fill("Rereading the same page");
    await page.getByLabel("Option 1 is correct").check();
    await page
      .getByRole("textbox", { name: /^Explanation/ })
      .fill("Active recall retrieves an idea from memory.");
    await page.getByLabel("Topic", { exact: true }).fill("Learning");
    await page
      .getByRole("button", { name: "Save & practice", exact: true })
      .click();
    await expect(page).toHaveURL(/\/study\/attempts\//);
    await page
      .getByRole("radio", { name: /Remembering without looking/ })
      .check();
    await expect(
      page.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    const attemptUrl = page.url();
    await page.reload();
    await expect(
      page.getByRole("radio", { name: /Remembering without looking/ }),
    ).toBeChecked();
    expect(page.url()).toBe(attemptUrl);
    await mkdir("../.impeccable/review", { recursive: true });
    await page.screenshot({
      path: `../.impeccable/review/attempt-${info.project.name}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Review & submit", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Submit attempt", exact: true })
      .click();
    await expect(
      page.getByText("1 of 1 point", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByText("Active recall retrieves an idea from memory.", {
        exact: true,
      }),
    ).toBeVisible();
    await page.screenshot({
      path: `../.impeccable/review/results-${info.project.name}.png`,
      fullPage: true,
    });
    await page.goto("/study");
    await expect(
      page.getByText("Local test · Active recall", { exact: true }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: `../.impeccable/review/${info.project.name}.png`,
      fullPage: true,
    });
    await page.goto("/study/settings");
    await page.getByRole("radio", { name: "Dark", exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(
      page.getByRole("button", { name: "Delete account", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `../.impeccable/review/settings-dark-${info.project.name}.png`,
      fullPage: true,
    });
  } finally {
    await cleanAccount(page, baseURL!);
  }
});

test("real instructor assignment, student membership and graded course results", async ({
  page,
  browser,
  baseURL,
}) => {
  test.setTimeout(60000);
  await registerApi(page, baseURL!, "INSTRUCTOR");
  const studentContext = await browser.newContext({ baseURL });
  const student = await studentContext.newPage();
  try {
    const quizResponse = await page.request.post("/api/v2/quizzes", {
      headers: { origin: baseURL! },
      data: sampleQuiz,
    });
    expect(quizResponse.status()).toBe(201);
    const { quiz } = await quizResponse.json();
    await page.goto("/study/courses");
    await page
      .getByRole("button", { name: "Create a course", exact: true })
      .click();
    await page
      .getByLabel("Course name", { exact: true })
      .fill("Local test · Study seminar");
    await page
      .getByRole("button", { name: "Create course", exact: true })
      .click();
    await expect(page).toHaveURL(/\/study\/courses\//);
    const courseId = page.url().split("/").pop();
    const details = await (
      await page.request.get(`/api/v2/courses/${courseId}`)
    ).json();
    const response = await page.request.post(
      `/api/v2/courses/${courseId}/assignments`,
      {
        headers: { origin: baseURL! },
        data: {
          quizId: quiz.id,
          title: "Local test assessment",
          startsAt: new Date(Date.now() - 60000).toISOString(),
          endsAt: new Date(Date.now() + 3600000).toISOString(),
          durationMinutes: 10,
          attemptLimit: 1,
          allowBacktracking: true,
          integrityEnabled: true,
        },
      },
    );
    expect(response.status()).toBe(201);
    await registerApi(student, baseURL!);
    const joined = await student.request.post("/api/v2/courses/join", {
      headers: { origin: baseURL! },
      data: { code: details.course.code },
    });
    expect(joined.status()).toBe(200);
    await student.goto(`/study/courses/${courseId}`);
    await student.getByRole("button", { name: /Start or resume/ }).click();
    await expect(
      student.getByText(/This assignment records focus changes/),
    ).toBeVisible();
    await student
      .getByRole("radio", { name: /Remembering without looking/ })
      .check();
    await expect(
      student.getByText("All changes saved", { exact: true }),
    ).toBeVisible();
    await student
      .getByRole("button", { name: "Review & submit", exact: true })
      .click();
    await student
      .getByRole("button", { name: "Submit attempt", exact: true })
      .click();
    await expect(
      student.getByText(/Answer review has not been released/),
    ).toBeVisible();
    await expect(
      student.getByText("Active recall retrieves an idea from memory."),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("cell", { name: "1/1", exact: true }),
    ).toBeVisible();
    const unauthorized = await student.request.get(
      `/api/v2/courses/${courseId}/results`,
    );
    expect(unauthorized.status()).toBe(404);
  } finally {
    await cleanAccount(student, baseURL!);
    await cleanAccount(page, baseURL!);
    await studentContext.close();
  }
});

test("HTTP boundaries reject foreign origins, forged scores and malformed question imports", async ({
  page,
  baseURL,
}) => {
  await registerApi(page, baseURL!);
  try {
    const csrf = await page.request.post("/api/v2/quizzes", {
      headers: { origin: "https://wrong.example" },
      data: sampleQuiz,
    });
    expect(csrf.status()).toBe(403);
    const created = await page.request.post("/api/v2/quizzes", {
      headers: { origin: baseURL! },
      data: sampleQuiz,
    });
    const { quiz } = await created.json();
    const started = await page.request.post(
      `/api/v2/quizzes/${quiz.id}/start`,
      { headers: { origin: baseURL! }, data: {} },
    );
    const { attempt } = await started.json();
    expect(attempt.questions[0].correctAnswer).toBeUndefined();
    const forged = await page.request.put(
      `/api/v2/attempts/${attempt.id}/answers`,
      {
        headers: { origin: baseURL! },
        data: { answers: { q1: "invented" }, revision: 0, score: 100 },
      },
    );
    expect(forged.status()).toBe(400);
    const invalid = await page.request.post("/api/v2/questions/validate", {
      headers: { origin: baseURL! },
      data: { questions: [{ ...sampleQuiz.questions[0], choices: [null] }] },
    });
    expect(invalid.status()).toBe(400);
  } finally {
    await cleanAccount(page, baseURL!);
  }
});
