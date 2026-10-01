import assert from "node:assert/strict";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { once } from "node:events";
import test from "node:test";
import {
  proxyPlatformRequest,
  MAX_REQUEST_BYTES,
  MAX_RESPONSE_BYTES,
} from "../../src/lib/platform-proxy";
import { GET as health } from "../../src/app/api/health/route";

type Handler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void | Promise<void>;
async function internalServer(handler: Handler) {
  const server = createServer((request, response) => {
    void Promise.resolve(handler(request, response)).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
async function bytes(request: IncomingMessage) {
  const parts: Buffer[] = [];
  for await (const part of request) parts.push(Buffer.from(part));
  return Buffer.concat(parts);
}
function request(path: string, init: RequestInit = {}) {
  return new Request(`http://127.0.0.1:3018/api/v2/${path}`, init);
}

test("proxy preserves query, browser origin and cookies while removing spoofed and hop headers", async () => {
  const upstream = await internalServer((incoming, response) => {
    assert.equal(incoming.url, "/api/v2/quizzes?search=a%2Fb&tag=one&tag=two");
    assert.equal(incoming.headers.origin, "http://127.0.0.1:3018");
    assert.equal(
      incoming.headers.cookie,
      "quizbee_session=private; theme=dark",
    );
    assert.equal(incoming.headers.accept, "application/json");
    for (const header of [
      "authorization",
      "x-forwarded-for",
      "x-forwarded-host",
      "x-forwarded-proto",
      "forwarded",
      "x-real-ip",
      "x-middleware-subrequest",
      "x-user-id",
      "x-request-id",
    ])
      assert.equal(incoming.headers[header], undefined, header);
    assert.notEqual(incoming.headers.host, "evil.example");
    response.writeHead(200, {
      "content-type": "application/json",
      "x-request-id": "service-request",
      "x-internal-debug": "do not expose",
    });
    response.end(JSON.stringify({ quizzes: [] }));
  });
  try {
    const result = await proxyPlatformRequest(
      request("quizzes?search=a%2Fb&tag=one&tag=two", {
        headers: {
          origin: "http://127.0.0.1:3018",
          cookie: "quizbee_session=private; theme=dark",
          accept: "application/json",
          authorization: "Bearer forged",
          host: "evil.example",
          forwarded: "for=127.0.0.1",
          "x-forwarded-for": "127.0.0.1",
          "x-forwarded-host": "evil.example",
          "x-forwarded-proto": "https",
          "x-real-ip": "127.0.0.1",
          "x-middleware-subrequest": "middleware",
          "x-user-id": "admin",
          "x-request-id": "forged",
        },
      }),
      { apiUrl: upstream.url },
    );
    assert.equal(result.status, 200);
    assert.deepEqual(await result.json(), { quizzes: [] });
    assert.equal(result.headers.get("x-request-id"), "service-request");
    assert.equal(result.headers.get("x-internal-debug"), null);
  } finally {
    await upstream.close();
  }
});

test("trusted ingress mode preserves distinct validated client addresses without trusting browser identity headers", async () => {
  const received: (string | undefined)[] = [];
  const upstream = await internalServer((incoming, response) => {
    received.push(incoming.headers["x-forwarded-for"] as string | undefined);
    assert.equal(incoming.headers["x-user-id"], undefined);
    assert.equal(incoming.headers.forwarded, undefined);
    response.end("ok");
  });
  const previous = process.env.TRUST_PLATFORM_PROXY;
  try {
    process.env.TRUST_PLATFORM_PROXY = "true";
    for (const address of ["192.0.2.10", "192.0.2.11", "2001:0db8:0:0::1"]) {
      const result = await proxyPlatformRequest(
        request("auth/me", {
          headers: {
            "x-forwarded-for": address,
            "x-user-id": "forged",
            forwarded: "for=forged",
          },
        }),
        { apiUrl: upstream.url },
      );
      assert.equal(result.status, 200);
    }
    assert.deepEqual(received, ["192.0.2.10", "192.0.2.11", "2001:db8::1"]);
    for (const address of [
      undefined,
      "",
      "client.example",
      "192.0.2.10, 192.0.2.11",
      "127.0.0.1:1234",
      "fe80::1%eth0",
    ]) {
      const result = await proxyPlatformRequest(
        request("auth/me", {
          headers: address === undefined ? {} : { "x-forwarded-for": address },
        }),
        { apiUrl: upstream.url },
      );
      assert.equal(result.status, 400, `invalid client address: ${address}`);
    }
    assert.equal(
      received.length,
      3,
      "invalid identities must never contact the API",
    );
    process.env.TRUST_PLATFORM_PROXY = "false";
    assert.equal(
      (
        await proxyPlatformRequest(
          request("auth/me", { headers: { "x-forwarded-for": "192.0.2.10" } }),
          { apiUrl: upstream.url },
        )
      ).status,
      200,
    );
    assert.equal(received.at(-1), undefined);
    process.env.TRUST_PLATFORM_PROXY = "sometimes";
    assert.equal(
      (await proxyPlatformRequest(request("auth/me"), { apiUrl: upstream.url }))
        .status,
      503,
    );
    assert.equal(received.length, 4);
  } finally {
    if (previous === undefined) delete process.env.TRUST_PLATFORM_PROXY;
    else process.env.TRUST_PLATFORM_PROXY = previous;
    await upstream.close();
  }
});

test("JSON mutations preserve bytes, response status and every Set-Cookie independently", async () => {
  const body = JSON.stringify({
    email: "local@example.invalid",
    password: "private-value",
  });
  const cookies = [
    "quizbee_session=one; Path=/; HttpOnly; SameSite=Lax; Expires=Wed, 21 Oct 2037 07:28:00 GMT",
    "other_session=two; Path=/; HttpOnly; SameSite=Lax",
  ];
  const upstream = await internalServer(async (incoming, response) => {
    assert.equal(incoming.method, "POST");
    assert.equal((await bytes(incoming)).toString(), body);
    response.writeHead(201, {
      "content-type": "application/json; charset=utf-8",
      "set-cookie": cookies,
      "cache-control": "no-store",
    });
    response.end('{"user":{"id":"local"}}');
  });
  try {
    const result = await proxyPlatformRequest(
      request("auth/register", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://127.0.0.1:3018",
        },
        body,
      }),
      { apiUrl: upstream.url },
    );
    assert.equal(result.status, 201);
    assert.deepEqual(result.headers.getSetCookie(), cookies);
    assert.equal(result.headers.get("cache-control"), "no-store");
    assert.deepEqual(await result.json(), { user: { id: "local" } });
  } finally {
    await upstream.close();
  }
});

test("multipart files arrive unchanged and CSV exports retain their download headers", async () => {
  const upstream = await internalServer(async (incoming, response) => {
    if (incoming.method === "POST") {
      assert.match(
        incoming.headers["content-type"] || "",
        /^multipart\/form-data; boundary=/,
      );
      const data = await bytes(incoming);
      assert(data.includes(Buffer.from([0, 1, 2, 255])));
      assert(data.includes(Buffer.from('filename="notes.txt"')));
      response.writeHead(202, { "content-type": "application/json" });
      response.end('{"material":{"id":"uploaded"}}');
    } else {
      assert.equal(incoming.url, "/api/v2/courses/local/results?format=csv");
      response.writeHead(200, {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="quizbee-results.csv"',
      });
      response.end("Student,Score\r\nLocal,1\r\n");
    }
  });
  try {
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([0, 1, 2, 255])], "notes.txt", {
        type: "text/plain",
      }),
    );
    const upload = await proxyPlatformRequest(
      request("materials", { method: "POST", body: form }),
      { apiUrl: upstream.url },
    );
    assert.equal(upload.status, 202);
    const csv = await proxyPlatformRequest(
      request("courses/local/results?format=csv"),
      { apiUrl: upstream.url },
    );
    assert.equal(
      csv.headers.get("content-disposition"),
      'attachment; filename="quizbee-results.csv"',
    );
    assert.equal(csv.headers.get("content-type"), "text/csv; charset=utf-8");
    assert.equal(await csv.text(), "Student,Score\r\nLocal,1\r\n");
  } finally {
    await upstream.close();
  }
});

test("bodyless deletion and upstream error status are preserved without leaking private headers", async () => {
  const upstream = await internalServer(async (incoming, response) => {
    assert.equal(incoming.method, "DELETE");
    assert.equal((await bytes(incoming)).byteLength, 0);
    response.writeHead(403, {
      "content-type": "application/json",
      "retry-after": "10",
      "www-authenticate": "private-internal-auth",
    });
    response.end(
      '{"error":{"code":"FORBIDDEN","message":"Not your resource."}}',
    );
  });
  try {
    const result = await proxyPlatformRequest(
      request("sessions/foreign", { method: "DELETE" }),
      { apiUrl: upstream.url },
    );
    assert.equal(result.status, 403);
    assert.equal(result.headers.get("retry-after"), "10");
    assert.equal(result.headers.get("www-authenticate"), null);
    assert.equal((await result.json()).error.code, "FORBIDDEN");
  } finally {
    await upstream.close();
  }
});

test("oversized declared and streamed bodies are rejected before contacting the service", async () => {
  let contacts = 0;
  const upstream = await internalServer((_incoming, response) => {
    contacts++;
    response.end("unexpected");
  });
  try {
    const declared = await proxyPlatformRequest(
      request("materials", {
        method: "POST",
        headers: {
          "content-type": "multipart/form-data; boundary=test",
          "content-length": String(MAX_REQUEST_BYTES + 1),
        },
        body: "small",
      }),
      { apiUrl: upstream.url },
    );
    assert.equal(declared.status, 413);
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(MAX_REQUEST_BYTES + 1));
        controller.close();
      },
    });
    const streamed = await proxyPlatformRequest(
      request("materials", {
        method: "POST",
        headers: { "content-type": "multipart/form-data; boundary=test" },
        body: stream,
        duplex: "half",
      } as RequestInit),
      { apiUrl: upstream.url },
    );
    assert.equal(streamed.status, 413);
    assert.equal(contacts, 0);
  } finally {
    await upstream.close();
  }
});

test("unsupported bodies, encoded path escapes, and invalid destinations never reach an upstream", async () => {
  let contacts = 0;
  const upstream = await internalServer((_incoming, response) => {
    contacts++;
    response.end("unexpected");
  });
  try {
    for (const [path, contentType] of [
      ["quizzes", "text/html"],
      ["quizzes", "multipart/form-data; boundary=test"],
    ]) {
      const result = await proxyPlatformRequest(
        request(path, {
          method: "POST",
          headers: { "content-type": contentType },
          body: "payload",
        }),
        { apiUrl: upstream.url },
      );
      assert.equal(result.status, 415);
    }
    for (const path of [
      "quizzes/%2F%2Fevil.example",
      "quizzes/%252e%252e",
      "../health",
      "quizzes/a/b/c",
    ]) {
      const result = await proxyPlatformRequest(request(path), {
        apiUrl: upstream.url,
      });
      assert.equal(result.status, 400);
    }
    for (const apiUrl of [
      "file:///etc/passwd",
      "ftp://127.0.0.1",
      "http://user:secret@127.0.0.1",
      `${upstream.url}/other`,
      `${upstream.url}?url=evil`,
      "",
    ]) {
      const result = await proxyPlatformRequest(request("quizzes"), { apiUrl });
      assert.equal(result.status, 503);
      assert.equal((await result.json()).error.code, "PLATFORM_UNAVAILABLE");
    }
    assert.equal(contacts, 0);
  } finally {
    await upstream.close();
  }
});

test("upstream redirects are never followed and cannot forward an external location", async () => {
  let escaped = 0;
  const external = await internalServer((_incoming, response) => {
    escaped++;
    response.end("should not be contacted");
  });
  const upstream = await internalServer((_incoming, response) => {
    response.writeHead(302, { location: `${external.url}/private` });
    response.end("redirect");
  });
  try {
    const result = await proxyPlatformRequest(request("quizzes"), {
      apiUrl: upstream.url,
    });
    assert.equal(result.status, 302);
    assert.equal(result.headers.get("location"), null);
    assert.equal(escaped, 0);
  } finally {
    await upstream.close();
    await external.close();
  }
});

test("unavailable, stalled headers and stalled bodies produce controlled 503 responses", async () => {
  const unavailable = await internalServer((_incoming, response) => {
    response.end();
  });
  const address = unavailable.url;
  await unavailable.close();
  const result = await proxyPlatformRequest(request("quizzes"), {
    apiUrl: address,
    timeoutMs: 100,
  });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error.code, "PLATFORM_UNAVAILABLE");
  for (const sendHeaders of [false, true]) {
    const slow = await internalServer((_incoming, response) => {
      if (sendHeaders) {
        response.writeHead(200, { "content-type": "application/json" });
        response.flushHeaders();
        response.write('{"quizzes":');
      }
    });
    try {
      const started = Date.now();
      const result = await proxyPlatformRequest(request("quizzes"), {
        apiUrl: slow.url,
        timeoutMs: 100,
      });
      assert.equal(result.status, 503);
      assert(Date.now() - started < 2000);
      assert(!JSON.stringify(await result.json()).includes(slow.url));
    } finally {
      await slow.close();
    }
  }
});

test("upstream response buffering is bounded", async () => {
  const upstream = await internalServer((_incoming, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(Buffer.alloc(MAX_RESPONSE_BYTES + 1, 32));
  });
  try {
    const result = await proxyPlatformRequest(request("quizzes"), {
      apiUrl: upstream.url,
    });
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error.code, "PLATFORM_UNAVAILABLE");
  } finally {
    await upstream.close();
  }
});

test("web health is local liveness and does not require a service or database", async () => {
  const result = health();
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ok: true, service: "web" });
  assert.equal(result.headers.get("cache-control"), "no-store");
});

test("the destination is read at request time and never baked into the web bundle", async () => {
  const first = await internalServer((_incoming, response) => {
    response.end("first");
  });
  const second = await internalServer((_incoming, response) => {
    response.end("second");
  });
  const previous = process.env.PLATFORM_API_URL;
  try {
    process.env.PLATFORM_API_URL = first.url;
    assert.equal(
      await (await proxyPlatformRequest(request("quizzes"))).text(),
      "first",
    );
    process.env.PLATFORM_API_URL = second.url;
    assert.equal(
      await (await proxyPlatformRequest(request("quizzes"))).text(),
      "second",
    );
  } finally {
    if (previous === undefined) delete process.env.PLATFORM_API_URL;
    else process.env.PLATFORM_API_URL = previous;
    await first.close();
    await second.close();
  }
});

test("browser test web process receives only frontend runtime settings", async () => {
  const { webEnvironment } = await import("../e2e/start-web.mjs");
  const env = webEnvironment({
    PATH: "/test/bin",
    HOME: "/test/home",
    PLATFORM_API_URL: "http://127.0.0.1:4010",
    PLATFORM_DATABASE_URL: "private-database",
    AI_API_KEY: "private-key",
    SMTP_PASSWORD: "private-password",
    AWS_SECRET_ACCESS_KEY: "private-storage-key",
    NODE_OPTIONS: "--require=untrusted.js",
  });
  assert.equal(env.PLATFORM_API_URL, "http://127.0.0.1:4010");
  assert.equal(env.NODE_ENV, "production");
  for (const key of [
    "PLATFORM_DATABASE_URL",
    "AI_API_KEY",
    "SMTP_PASSWORD",
    "AWS_SECRET_ACCESS_KEY",
    "NODE_OPTIONS",
  ])
    assert.equal(Object.hasOwn(env, key), false, key);
});
