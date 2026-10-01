import { handler } from "./handler";
import { createApiServer } from "./server";
import { db } from "../server/db";

async function main() {
  const configured = process.env.APP_ORIGIN;
  if (
    !configured ||
    !["http:", "https:"].includes(new URL(configured).protocol) ||
    new URL(configured).origin !== configured
  ) {
    throw new Error(
      "APP_ORIGIN must be a complete browser origin without a trailing slash.",
    );
  }
  if (!process.env.PLATFORM_DATABASE_URL)
    throw new Error("PLATFORM_DATABASE_URL is required.");
  const port = Number(process.env.PORT || 4010);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid API port.");
  let shuttingDown = false;
  const server = createApiServer(handler, {
    ready: async () => {
      if (shuttingDown) throw new Error("Shutting down");
      await db.$queryRaw`SELECT 1`;
    },
  });
  server.listen(port, process.env.API_HOST || "127.0.0.1", () =>
    console.log(JSON.stringify({ event: "api.listening", port })),
  );
  server.on("error", () => {
    console.error("API listener unavailable.");
    process.exitCode = 1;
    void db.$disconnect();
  });
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(JSON.stringify({ event: "api.draining" }));
    const deadline = setTimeout(() => {
      server.closeAllConnections();
    }, 15_000);
    deadline.unref();
    server.close(() => {
      clearTimeout(deadline);
      void db.$disconnect();
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
main().catch(() => {
  console.error(
    "API startup failed. Check the configured origin, database and port.",
  );
  process.exitCode = 1;
});
