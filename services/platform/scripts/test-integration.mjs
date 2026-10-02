import { spawn } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { constants, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const platform = fileURLToPath(new URL("../", import.meta.url));
const databaseMessage =
  "Set PLATFORM_DATABASE_URL to the isolated localhost:55439/quizbee_v2_test database before running integration tests.";

async function main() {
  let database;
  try {
    database = new URL(process.env.PLATFORM_DATABASE_URL || "");
  } catch {
    throw new Error(databaseMessage);
  }
  if (
    !["postgres:", "postgresql:"].includes(database.protocol) ||
    !["localhost", "127.0.0.1"].includes(database.hostname) ||
    database.port !== "55439" ||
    database.pathname !== "/quizbee_v2_test"
  )
    throw new Error(databaseMessage);

  const directory = path.join(platform, "tests", "integration");
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith(".test.ts"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
  if (!files.length)
    throw new Error("No platform integration tests were found.");
  const fixture = await mkdtemp(path.join(tmpdir(), "quizbee-integration-"));
  let child;
  let interrupted;
  let forceTimer;
  const grouped = process.platform !== "win32";
  const terminate = (signal) => {
    if (!child?.pid) return;
    try {
      if (grouped) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch (error) {
      if (error.code !== "ESRCH") process.exitCode = 1;
    }
  };
  const onSignal = (signal) => {
    interrupted ??= signal;
    terminate(signal);
    forceTimer ??= setTimeout(() => terminate("SIGKILL"), 5000);
    forceTimer.unref();
  };
  const interrupt = () => onSignal("SIGINT");
  const stop = () => onSignal("SIGTERM");
  try {
    const osNames = [
      "PATH",
      "HOME",
      "USER",
      "LOGNAME",
      "LANG",
      "LC_ALL",
      "TZ",
      "SYSTEMROOT",
      "SystemRoot",
      "WINDIR",
      "COMSPEC",
      "PATHEXT",
      "USERPROFILE",
    ];
    const env = Object.fromEntries(
      osNames
        .filter((name) => process.env[name] !== undefined)
        .map((name) => [name, process.env[name]]),
    );
    Object.assign(env, {
      PLATFORM_DATABASE_URL: database.toString(),
      NODE_ENV: "test",
      TMPDIR: fixture,
      TMP: fixture,
      TEMP: fixture,
      STORAGE_DRIVER: "local",
      PRIVATE_STORAGE_DIR: path.join(fixture, "private"),
      STAGING_DIR: path.join(fixture, "staging"),
      GENERATION_ENABLED: "true",
      UPLOADS_ENABLED: "true",
      ALLOW_UNSCANNED_UPLOADS: "true",
      APP_ORIGIN: "http://localhost:3018",
      TRUST_PROXY: "false",
      AI_BASE_URL: "",
      AI_API_KEY: "",
      AI_MODEL: "",
      MALWARE_SCAN_COMMAND: "",
      SMTP_HOST: "",
      SMTP_PORT: "",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      SMTP_SECURE: "",
      MAIL_FROM: "",
    });
    child = spawn(
      process.execPath,
      ["--import", "tsx", "--test", "--test-concurrency=1", ...files],
      {
        cwd: platform,
        env,
        stdio: "inherit",
        detached: grouped,
      },
    );
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", stop);
    const result = await new Promise((resolve, reject) => {
      child.once("error", () =>
        reject(new Error("Could not start the integration test process.")),
      );
      child.once("close", (code, signal) => resolve({ code, signal }));
    });
    const signal = interrupted || result.signal;
    process.exitCode = signal
      ? 128 + (constants.signals[signal] || 1)
      : (result.code ?? 1);
  } finally {
    process.removeListener("SIGINT", interrupt);
    process.removeListener("SIGTERM", stop);
    if (forceTimer) clearTimeout(forceTimer);
    // On interruption, terminate any fixture descendants before removing scratch files.
    if (interrupted) terminate("SIGKILL");
    await rm(fixture, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(
    error.message === databaseMessage
      ? databaseMessage
      : "Integration test runner failed. Check the local runtime and test database.",
  );
  process.exitCode = 1;
});
