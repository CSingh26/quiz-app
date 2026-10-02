import assert from "node:assert/strict";
import { test } from "node:test";
import { once } from "node:events";
import { createApiServer } from "../../src/api/server";
import { cookieHeader, readCookie } from "../../src/api/cookies";

test("HTTP boundary carries body, origin, duplicate cookies, status and request IDs", async () => {
  const server = createApiServer(async (request) => {
    assert.equal(request.headers.get("origin"), "http://localhost:3018");
    assert.equal(readCookie(request, "quizbee_session"), "opaque");
    assert.deepEqual(await request.json(), { answer: "a" });
    const response = Response.json({ saved: true }, { status: 201 });
    response.headers.append(
      "set-cookie",
      cookieHeader("quizbee_session", "new", {
        expires: new Date("2030-01-01"),
        secure: true,
      }),
    );
    response.headers.append("set-cookie", "second=value; Path=/");
    response.headers.set("x-request-id", "trace-id");
    return response;
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/v2/attempts/id/answers?x=1`,
      {
        method: "POST",
        headers: {
          origin: "http://localhost:3018",
          cookie: "quizbee_session=opaque",
          "content-type": "application/json",
        },
        body: JSON.stringify({ answer: "a" }),
      },
    );
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("x-request-id"), "trace-id");
    assert.equal(response.headers.getSetCookie().length, 2);
    assert.match(
      response.headers.getSetCookie()[0],
      /HttpOnly; SameSite=Lax; Secure/,
    );
    assert.deepEqual(await response.json(), { saved: true });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("HTTP health separates live process from unavailable database and rejects oversized input", async () => {
  let calls = 0;
  const server = createApiServer(
    async () => {
      calls++;
      return Response.json({ ok: true });
    },
    {
      ready: async () => {
        throw new Error("private database details");
      },
      maxBodyBytes: 32,
    },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    assert.equal((await fetch(`${origin}/healthz`)).status, 200);
    const ready = await fetch(`${origin}/readyz`);
    assert.equal(ready.status, 503);
    assert.ok(!(await ready.text()).includes("private"));
    const oversized = await fetch(`${origin}/api/v2/quizzes`, {
      method: "POST",
      body: "x".repeat(33),
    });
    assert.equal(oversized.status, 413);
    assert.equal(calls, 0);
    assert.equal((await fetch(`${origin}/other`)).status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("readiness returns unavailable for a stalled dependency without accumulating probes, then recovers", async () => {
  let release!: () => void;
  const stalled = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const server = createApiServer(async () => Response.json({ ok: true }), {
    ready: async () => {
      calls++;
      await stalled;
    },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const startedAt = performance.now();
    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        fetch(`${origin}/readyz`, { signal: AbortSignal.timeout(3500) }),
      ),
    );
    assert.ok(
      performance.now() - startedAt < 2750,
      "Readiness must honor its two-second deadline with scheduling tolerance",
    );
    for (const response of responses) {
      assert.equal(response.status, 503);
      assert.deepEqual(await response.json(), {
        service: "quizbee-api",
        status: "unavailable",
      });
    }
    assert.equal(calls, 1, "Concurrent probes must share the dependency call");
    assert.equal((await fetch(`${origin}/healthz`)).status, 200);
    assert.equal((await fetch(`${origin}/readyz`)).status, 503);
    assert.equal(calls, 1, "Timeout must not start another stalled query");
    release();
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal((await fetch(`${origin}/readyz`)).status, 200);
    assert.equal(calls, 2, "Recovery must use a fresh dependency check");
  } finally {
    release();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
