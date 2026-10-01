import { mkdir, mkdtemp, open, rm, chmod } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MAX_FILE_BYTES } from "./archive";
import { getPrivateStorage, scanFile, type PrivateStorage } from "./storage";
import type { Section } from "./extract";

export async function withStagedMaterial<T>(
  key: string,
  work: (file: string) => Promise<T>,
  storage: PrivateStorage = getPrivateStorage(),
): Promise<T> {
  const bytes = await storage.read(key);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new Error("Invalid stored material size");
  const root = path.resolve(process.env.STAGING_DIR || tmpdir());
  if (root.split(path.sep).includes("public"))
    throw new Error("Staging cannot use a public directory");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const directory = await mkdtemp(path.join(root, "quizbee-material-"));
  try {
    await chmod(directory, 0o700);
    const file = path.join(directory, "material.bin");
    const handle = await open(
      file,
      constants.O_WRONLY |
        constants.O_CREAT |
        constants.O_EXCL |
        constants.O_NOFOLLOW,
      0o600,
    );
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
    return await work(file);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export function extractionEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  // Deliberate allowlist: never inherit DB, provider, object-store or Node preload settings.
  return { PATH: env.PATH, LANG: "C.UTF-8", TZ: "UTC", NODE_ENV: "production" };
}

export async function extractStoredMaterial(
  key: string,
  name: string,
  storage: PrivateStorage = getPrivateStorage(),
) {
  return withStagedMaterial(
    key,
    async (file) => {
      const scanResult = await scanFile(file);
      let chunks: (Section & { position: number })[];
      try {
        const { stdout } = await promisify(execFile)(
          process.execPath,
          [
            "--max-old-space-size=256",
            "--import",
            "tsx",
            path.resolve(__dirname, "extract-run.ts"),
            file,
            name,
          ],
          {
            timeout: 60000,
            maxBuffer: 12 * 1024 * 1024,
            encoding: "utf8",
            env: extractionEnvironment(),
          },
        );
        chunks = JSON.parse(stdout);
      } catch {
        throw new Error(
          "Document extraction exceeded resource limits or failed.",
        );
      }
      return { chunks, scanResult };
    },
    storage,
  );
}
