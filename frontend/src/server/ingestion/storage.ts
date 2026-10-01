import { mkdir, open, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MAX_FILE_BYTES } from "./archive";

export interface PrivateStorage {
  put(bytes: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
function storagePath(key: string) {
  if (!/^[a-f0-9-]{36}\.bin$/.test(key))
    throw new Error("Invalid private storage key");
  const root = path.resolve(
    process.env.PRIVATE_STORAGE_DIR || ".quizbee-private",
  );
  // Private files must never land in the framework's public directory.
  if (root.split(path.sep).includes("public"))
    throw new Error("Private storage cannot use a public directory");
  return { root, file: path.join(root, key) };
}
export const localStorage: PrivateStorage = {
  async put(bytes) {
    if (!bytes.length || bytes.length > MAX_FILE_BYTES)
      throw new Error("File size must be between 1 byte and 10 MB");
    const key = `${randomUUID()}.bin`,
      { root, file } = storagePath(key);
    await mkdir(root, { recursive: true, mode: 0o700 });
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
    return key;
  },
  async read(key) {
    const handle = await open(
      storagePath(key).file,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    try {
      const stat = await handle.stat();
      if (!stat.isFile() || stat.size > MAX_FILE_BYTES)
        throw new Error("Invalid stored material");
      return await handle.readFile();
    } finally {
      await handle.close();
    }
  },
  async delete(key) {
    try {
      await unlink(storagePath(key).file);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  },
};
export function scanPolicy(env: NodeJS.ProcessEnv = process.env): {
  mode: "scanner" | "development_bypass";
  command?: string;
} {
  if (env.MALWARE_SCAN_COMMAND)
    return { mode: "scanner", command: env.MALWARE_SCAN_COMMAND };
  if (env.NODE_ENV !== "production" && env.ALLOW_UNSCANNED_UPLOADS === "true")
    return { mode: "development_bypass" };
  throw new Error(
    "Malware scanning is required. Configure MALWARE_SCAN_COMMAND; local development alone may explicitly set ALLOW_UNSCANNED_UPLOADS=true.",
  );
}
export async function scanStoredFile(
  key: string,
): Promise<"scanned" | "development_bypass"> {
  const policy = scanPolicy();
  if (policy.mode === "development_bypass") return "development_bypass";
  // ClamAV-compatible executable, never a shell command. Exit 0 alone means clean.
  try {
    await promisify(execFile)(
      policy.command!,
      ["--no-summary", storagePath(key).file],
      { timeout: 60_000, maxBuffer: 64 * 1024 },
    );
    return "scanned";
  } catch {
    throw new Error(
      "Malware scan rejected the file or the scanner was unavailable",
    );
  }
}
