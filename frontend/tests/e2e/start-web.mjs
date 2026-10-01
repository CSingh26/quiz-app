import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Browser tests must not give the web process the API's inherited secrets.
 * @param {Record<string, string | undefined>} [source]
 * @returns {Record<string, string>}
 */
export function webEnvironment(source = process.env) {
  /** @type {Record<string, string>} */
  const env = {
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    HOSTNAME: "127.0.0.1",
    PORT: "3018",
  };
  for (const name of [
    "PATH",
    "HOME",
    "TMPDIR",
    "TMP",
    "TEMP",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "PATHEXT",
    "CI",
    "NO_COLOR",
    "FORCE_COLOR",
    "NEXT_PUBLIC_API_BASE_URL",
    "PLATFORM_API_URL",
    "PLATFORM_API_TIMEOUT_MS",
  ])
    if (source[name] !== undefined) env[name] = source[name];
  return env;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const frontend = fileURLToPath(new URL("../../", import.meta.url));
  const standalone = resolve(frontend, ".next/standalone");
  await cp(
    resolve(frontend, ".next/static"),
    resolve(standalone, ".next/static"),
    { recursive: true },
  );
  await cp(resolve(frontend, "public"), resolve(standalone, "public"), {
    recursive: true,
  });
  const child = spawn(process.execPath, [resolve(standalone, "server.js")], {
    cwd: standalone,
    env: webEnvironment(),
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => child.kill(signal));
  child.on("error", (error) => {
    console.error("Web test process could not start:", error.message);
    process.exitCode = 1;
  });
  child.on("exit", (code, signal) => {
    process.exitCode = code ?? (signal ? 1 : 0);
  });
}
