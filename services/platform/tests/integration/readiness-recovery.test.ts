import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer, type Socket } from "node:net";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error("Use the isolated QuizBee test database.");

async function availablePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
}

async function databaseProxy() {
  const { connect } = await import("node:net");
  type Pair = {
    client: Socket;
    upstream: Socket;
    input: Buffer[];
    output: Buffer[];
    buffered: number;
  };
  const pairs = new Set<Pair>();
  let stalled = false;
  let failure: Error | undefined;
  const server = createServer((client) => {
    if (pairs.size >= 8) {
      failure = new Error("The test proxy exceeded its connection bound");
      client.destroy();
      return;
    }
    const upstream = connect({ host: "127.0.0.1", port: 55439 });
    const pair: Pair = { client, upstream, input: [], output: [], buffered: 0 };
    pairs.add(pair);
    const close = () => {
      pairs.delete(pair);
      client.destroy();
      upstream.destroy();
    };
    const relay = (bytes: Buffer, target: Socket, queue: Buffer[]) => {
      if (!stalled) {
        target.write(bytes);
        return;
      }
      pair.buffered += bytes.length;
      if (pair.buffered > 256 * 1024) {
        failure = new Error("The test proxy exceeded its bounded buffer");
        close();
      } else queue.push(bytes);
    };
    client.on("data", (bytes) => relay(bytes, upstream, pair.input));
    upstream.on("data", (bytes) => relay(bytes, client, pair.output));
    client.on("error", close);
    upstream.on("error", close);
    client.on("close", close);
    upstream.on("close", close);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const proxied = new URL(database);
  proxied.hostname = "127.0.0.1";
  proxied.port = String(address.port);
  // Bound fixture connections; unit tests separately verify exact probe coalescing.
  proxied.searchParams.set("connection_limit", "1");
  proxied.searchParams.set("pool_timeout", "20");
  return {
    url: proxied.toString(),
    pause() {
      stalled = true;
    },
    resume() {
      stalled = false;
      for (const pair of pairs) {
        for (const bytes of pair.input.splice(0)) pair.upstream.write(bytes);
        for (const bytes of pair.output.splice(0)) pair.client.write(bytes);
        pair.buffered = 0;
      }
    },
    check() {
      if (failure) throw failure;
    },
    async close() {
      for (const pair of pairs) {
        pair.client.destroy();
        pair.upstream.destroy();
      }
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

function launch(
  kind: "api" | "worker",
  port: number,
  databaseUrl: string,
  fixtureRoot: string,
) {
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      kind === "api" ? "src/api/run.ts" : "src/server/jobs/run.ts",
    ],
    {
      cwd: process.cwd(),
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        TMPDIR: fixtureRoot,
        TMP: fixtureRoot,
        TEMP: fixtureRoot,
        NODE_ENV: "test",
        PLATFORM_DATABASE_URL: databaseUrl,
        APP_ORIGIN: "http://localhost:3018",
        API_HOST: "127.0.0.1",
        PORT: String(port),
        WORKER_HEALTH_HOST: "127.0.0.1",
        WORKER_HEALTH_PORT: String(port),
        WORKER_KINDS: "generation",
        STORAGE_DRIVER: "local",
        PRIVATE_STORAGE_DIR: path.join(fixtureRoot, kind, "private"),
        STAGING_DIR: path.join(fixtureRoot, kind, "staging"),
        AI_BASE_URL: "",
        AI_API_KEY: "",
        AI_MODEL: "",
        SMTP_HOST: "",
        SMTP_PORT: "",
        SMTP_USER: "",
        SMTP_PASSWORD: "",
        SMTP_SECURE: "",
        MAIL_FROM: "",
      },
      stdio: "ignore",
    },
  );
  const exit = once(child, "exit");
  // Keep startup failures handled even if a readiness assertion fails first.
  void exit.catch(() => {});
  return { kind, child, exit, origin: `http://127.0.0.1:${port}` };
}
type Process = ReturnType<typeof launch>;
function running(process: Process) {
  assert.equal(
    process.child.exitCode,
    null,
    `${process.kind} must remain running`,
  );
  assert.equal(
    process.child.signalCode,
    null,
    `${process.kind} must remain running`,
  );
}
async function waitReady(process: Process) {
  const deadline = performance.now() + 10000;
  while (performance.now() < deadline) {
    running(process);
    try {
      const response = await fetch(`${process.origin}/readyz`, {
        signal: AbortSignal.timeout(3000),
      });
      await response.arrayBuffer();
      if (response.status === 200) return;
    } catch {
      /* Startup or recovery can briefly refuse a connection. */
    }
    await delay(30);
  }
  assert.fail(`${process.kind} did not become ready`);
}
async function stop(process: Process) {
  const child: ChildProcess = process.child;
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      process.exit,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, 2000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
      await process.exit;
    }
  }
}

test(
  "API and worker stay live, bound readiness during stalled database traffic, and recover without restart",
  { timeout: 30000 },
  async (context) => {
    const fixtureRoot = await mkdtemp(
      path.join(tmpdir(), "quizbee-readiness-"),
    );
    context.after(() => rm(fixtureRoot, { recursive: true, force: true }));
    const proxy = await databaseProxy();
    const children: Process[] = [];
    try {
      const apiPort = await availablePort();
      let workerPort = await availablePort();
      while (workerPort === apiPort) workerPort = await availablePort();
      children.push(launch("api", apiPort, proxy.url, fixtureRoot));
      children.push(launch("worker", workerPort, proxy.url, fixtureRoot));
      await Promise.all(children.map(waitReady));
      proxy.pause();
      const started = performance.now();
      const responses = await Promise.all(
        children.flatMap((process) =>
          Array.from({ length: 3 }, async () => {
            const response = await fetch(`${process.origin}/readyz`, {
              signal: AbortSignal.timeout(4000),
            });
            assert.equal(
              response.status,
              503,
              `${process.kind} must report the stalled database`,
            );
            const body = await response.text();
            assert.equal(body.includes(database.password), false);
            return response.status;
          }),
        ),
      );
      assert.deepEqual(responses, Array(6).fill(503));
      assert.ok(
        performance.now() - started < 2750,
        "readiness must respond before the health checker times out",
      );
      proxy.check();
      for (const process of children) {
        running(process);
        const response = await fetch(`${process.origin}/healthz`, {
          signal: AbortSignal.timeout(1000),
        });
        assert.equal(
          response.status,
          200,
          `${process.kind} liveness must remain independent of database availability`,
        );
        await response.arrayBuffer();
      }
      proxy.resume();
      await Promise.all(children.map(waitReady));
      for (const process of children) running(process);
      proxy.check();
    } finally {
      proxy.resume();
      const stopped = await Promise.allSettled(children.map(stop));
      await proxy.close();
      for (const result of stopped)
        if (result.status === "rejected") throw result.reason;
    }
  },
);
