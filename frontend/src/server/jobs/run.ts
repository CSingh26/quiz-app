import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
async function main() {
  // Import after env loading: Prisma reads its database URL on first use.
  const { runNextJob } = await import("./worker");
  const { maintainPlatform } = await import("../maintenance");
  const { db } = await import("../db");
  let stopped = false;
  process.on("SIGTERM", () => {
    stopped = true;
  });
  process.on("SIGINT", () => {
    stopped = true;
  });
  const once = process.argv.includes("--once");
  let lastMaintenance = 0;
  try {
    do {
      if (Date.now() - lastMaintenance >= 60_000) {
        await maintainPlatform();
        lastMaintenance = Date.now();
      }
      const worked = await runNextJob();
      if (once) break;
      if (!worked) await new Promise((resolve) => setTimeout(resolve, 2000));
    } while (!stopped);
  } finally {
    await db.$disconnect();
  }
}
main().catch(() => {
  console.error(
    "Worker startup or maintenance failed. Check the worker configuration and database availability.",
  );
  process.exitCode = 1;
});
