import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import test from "node:test";

const url = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "55439" ||
  url.pathname !== "/quizbee_v2_test"
)
  throw new Error("Use the isolated QuizBee test database.");
function launch(kinds: string) {
  return spawn(
    process.execPath,
    ["--import", "tsx", "src/server/jobs/run.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        WORKER_KINDS: kinds,
        WORKER_HEALTH_PORT: "0",
        WORKER_HEALTH_HOST: "127.0.0.1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
}
async function started(child: ChildProcess): Promise<number> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Worker did not expose health endpoint")),
      10000,
    );
    let output = "";
    child.stdout!.on("data", (data) => {
      output += data.toString();
      for (const line of output.split("\n")) {
        try {
          const info = JSON.parse(line);
          if (info.event === "worker.started") {
            clearTimeout(timer);
            resolve(info.healthPort);
          }
        } catch {
          /* Wait for a complete JSON line. */
        }
      }
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Worker stopped before health startup"));
    });
  });
}

test(
  "worker rejects invalid roles before connecting or exposing health",
  { timeout: 15000 },
  async () => {
    const child = launch("ingestion,unknown");
    let stderr = "";
    child.stderr!.on("data", (data) => {
      stderr += data.toString();
    });
    try {
      const [code] = await once(child, "exit");
      assert.equal(code, 1);
      assert.match(stderr, /WORKER_KINDS/);
      assert.equal(stderr.includes(url.password), false);
    } finally {
      child.kill("SIGKILL");
    }
  },
);

test(
  "worker health reports roles, database readiness and graceful termination",
  { timeout: 15000 },
  async () => {
    const child = launch("generation");
    try {
      const port = await started(child);
      const health = await fetch(`http://127.0.0.1:${port}/healthz`);
      assert.equal(health.status, 200);
      assert.deepEqual((await health.json()).kinds, ["generation"]);
      const ready = await fetch(`http://127.0.0.1:${port}/readyz`);
      assert.equal(ready.status, 200);
      assert.equal(
        JSON.stringify(await ready.json()).includes(url.password),
        false,
      );
      assert.equal(
        (await fetch(`http://127.0.0.1:${port}/missing`)).status,
        404,
      );
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      const [code] = await exited;
      assert.equal(code, 0);
    } finally {
      child.kill("SIGKILL");
    }
  },
);
