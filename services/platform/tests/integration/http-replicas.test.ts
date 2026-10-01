import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { createApiServer } from "../../src/api/server";
import { handler } from "../../src/api/handler";
import { db } from "../../src/server/db";
const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error("Use the isolated local test database.");
test.after(() => db.$disconnect());

test("independent HTTP API replicas share sessions and serialize starts, saves and final grades", async () => {
  const priorOrigin = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "http://localhost:3018";
  const servers = [createApiServer(handler), createApiServer(handler)];
  const origins: string[] = [];
  let cookie = "";
  let userId: string | undefined;
  const password = "Local replica fixture password";
  try {
    for (const server of servers) {
      server.listen(0, "127.0.0.1");
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      origins.push(`http://127.0.0.1:${address.port}`);
    }
    async function request(
      replica: number,
      path: string,
      method = "GET",
      data?: unknown,
      origin = "http://localhost:3018",
    ) {
      return fetch(`${origins[replica]}/api/v2${path}`, {
        method,
        headers: { origin, cookie, "content-type": "application/json" },
        body: data === undefined ? undefined : JSON.stringify(data),
      });
    }
    const registration = await request(0, "/auth/register", "POST", {
      name: "Replica fixture",
      email: `${randomUUID()}@example.invalid`,
      password,
    });
    assert.equal(registration.status, 201);
    userId = (await registration.json()).user.id;
    cookie = registration.headers.getSetCookie()[0].split(";")[0];
    assert.equal((await request(1, "/auth/me")).status, 200);
    assert.equal(
      (await request(1, "/auth/logout", "POST", {}, "https://foreign.example"))
        .status,
      403,
    );
    const quizResponse = await request(0, "/quizzes", "POST", {
      title: "Replica test",
      description: "",
      questions: [
        {
          id: "q",
          type: "single_choice",
          prompt: "Choose A",
          choices: [
            { id: "a", text: "A" },
            { id: "b", text: "B" },
          ],
          correctAnswer: "a",
        },
      ],
      settings: {
        durationMinutes: 5,
        shuffleQuestions: false,
        shuffleOptions: false,
        mode: "practice",
        showExplanations: true,
      },
    });
    assert.equal(quizResponse.status, 201);
    const { quiz } = await quizResponse.json();
    const starts = await Promise.all(
      [0, 1].map((replica) =>
        request(replica, `/quizzes/${quiz.id}/start`, "POST", {}).then(
          (response) => response.json(),
        ),
      ),
    );
    assert.equal(starts[0].attempt.id, starts[1].attempt.id);
    assert.equal(starts[0].attempt.expiresAt, starts[1].attempt.expiresAt);
    assert.equal(starts[0].attempt.questions[0].correctAnswer, undefined);
    const attempt = starts[0].attempt;
    const saves = await Promise.all(
      [0, 1].map((replica) =>
        request(replica, `/attempts/${attempt.id}/answers`, "PUT", {
          answers: { q: "a" },
          revision: 0,
        }),
      ),
    );
    assert.deepEqual(
      saves.map((response) => response.status).sort(),
      [200, 409],
    );
    const submitted = await Promise.all(
      [0, 1].map((replica) =>
        request(replica, `/attempts/${attempt.id}/submit`, "POST", {}).then(
          (response) => response.json(),
        ),
      ),
    );
    assert.equal(submitted[0].attempt.score, 1);
    assert.equal(submitted[1].attempt.score, 1);
    assert.equal(
      submitted[0].attempt.submittedAt,
      submitted[1].attempt.submittedAt,
    );
    assert.equal(await db.attempt.count({ where: { userId } }), 1);
    await request(0, "/auth/logout", "POST", {});
    assert.equal((await request(1, "/auth/me")).status, 401);
  } finally {
    if (userId) await db.user.deleteMany({ where: { id: userId } });
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve) => server.close(() => resolve())),
      ),
    );
    if (priorOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = priorOrigin;
  }
});
