import { createServer, type Server } from "node:http";
import { performance } from "node:perf_hooks";
import { runNextJob, parseWorkerKinds } from "./worker";
import { maintainPlatform } from "../maintenance";
import { db } from "../db";
import { createReadinessProbe } from "../readiness";

async function main() {
  const kinds = parseWorkerKinds(process.env.WORKER_KINDS);
  const port = Number(process.env.WORKER_HEALTH_PORT ?? 8081);
  if (!Number.isInteger(port) || port < 0 || port > 65535)
    throw new Error("WORKER_HEALTH_PORT must be an integer from 0 to 65535.");
  let stopped = false;
  let wake: (() => void) | undefined;
  let lastProgress = performance.now();
  const databaseReady = createReadinessProbe(() => db.$queryRaw`SELECT 1`);
  const stop = () => {
    stopped = true;
    wake?.();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
  const once = process.argv.includes("--once");
  let health: Server | undefined;
  try {
    if (!once) {
      health = createServer(async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        response.setHeader("Cache-Control", "no-store");
        const path = request.url?.split("?")[0];
        if (
          request.method !== "GET" ||
          !["/healthz", "/readyz"].includes(path ?? "")
        ) {
          response.writeHead(404).end(JSON.stringify({ status: "not_found" }));
          return;
        }
        const heartbeatAgeMs = Math.round(performance.now() - lastProgress);
        let ready = !stopped && heartbeatAgeMs < 6 * 60_000;
        if (ready && path === "/readyz") ready = await databaseReady();
        response.writeHead(ready ? 200 : 503).end(
          JSON.stringify({
            status: stopped ? "stopping" : ready ? "ok" : "unavailable",
            kinds,
            heartbeatAgeMs,
          }),
        );
      });
      await new Promise<void>((resolve, reject) => {
        health!.once("error", reject);
        health!.listen(
          port,
          process.env.WORKER_HEALTH_HOST || "127.0.0.1",
          () => {
            health!.removeListener("error", reject);
            resolve();
          },
        );
      });
      const address = health.address();
      console.log(
        JSON.stringify({
          event: "worker.started",
          kinds,
          healthPort: typeof address === "object" ? address?.port : port,
        }),
      );
    }
    let lastMaintenance = Number.NEGATIVE_INFINITY;
    do {
      if (stopped) break;
      // This is scheduling only. Every security deadline and lease uses DB time.
      if (performance.now() - lastMaintenance >= 60_000) {
        await maintainPlatform();
        lastMaintenance = performance.now();
        lastProgress = performance.now();
      }
      if (stopped) break;
      const worked = await runNextJob(kinds);
      lastProgress = performance.now();
      if (once) break;
      if (!worked && !stopped)
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            wake = undefined;
            resolve();
          }, 2000);
          wake = () => {
            clearTimeout(timer);
            wake = undefined;
            resolve();
          };
        });
    } while (!stopped);
  } finally {
    stopped = true;
    if (health?.listening) {
      health.closeIdleConnections();
      await new Promise<void>((resolve) => health!.close(() => resolve()));
    }
    await db.$disconnect();
    process.removeListener("SIGTERM", stop);
    process.removeListener("SIGINT", stop);
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error && /^WORKER_(KINDS|HEALTH_PORT) /.test(error.message)
      ? error.message
      : "Worker startup or maintenance failed. Check the worker configuration and database availability.",
  );
  process.exitCode = 1;
});
