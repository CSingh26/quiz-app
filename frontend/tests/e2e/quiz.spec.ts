import { test, expect } from '@playwright/test';

test('quiz selection submits the answer-text protocol and opens server leaderboard', async ({ page }, testInfo) => {
  await page.route('**/get-questions', route => route.fulfill({ json: { questions: [{ id: 'q1', text: 'TEST FIXTURE: Which structure provides FIFO ordering?', options: [{ id: 'a', text: 'Queue' }, { id: 'b', text: 'Stack' }] }] } }));
  await page.route('**/submit-quiz', async route => {
    expect(route.request().postDataJSON()).toEqual({ roomCode: 'fixture-room', answers: { q1: 'Queue' } });
    await route.fulfill({ json: { score: 1, message: 'Quiz submitted successfully' } });
  });
  await page.route('**/fixture-room/leaderboard', route => route.fulfill({ json: { leaderboard: [{ rank: 1, studentName: 'Test student', score: 1 }] } }));
  await page.goto('/quiz/fixture-room');
  await expect(page.getByText('TEST FIXTURE: Which structure provides FIFO ordering?')).toBeVisible();
  await page.getByRole('button', { name: /Queue/ }).click();
  if (testInfo.project.name === 'desktop') await page.screenshot({ path: '../docs/screenshots/quiz-fixture.png' });
  await page.getByRole('button', { name: 'SUBMIT', exact: true }).click();
  await expect(page).toHaveURL(/\/leaderboard\/fixture-room$/);
  await expect(page.getByText('Test student')).toBeVisible();
});

test('expired or unavailable quiz redirects and does not display questions', async ({ page }) => {
  await page.route('**/get-questions', route => route.fulfill({ status: 400, json: { message: 'Quiz room is not open' } }));
  await page.route('**/get-active-rooms', route => route.fulfill({ json: { activeRooms: [] } }));
  await page.goto('/quiz/expired-fixture');
  await expect(page).toHaveURL(/\/dashboard\/student\/activeRooms$/);
  await expect(page.getByRole('button', { name: 'SUBMIT', exact: true })).toHaveCount(0);
});
