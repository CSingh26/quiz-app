import { mkdir, open, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { MAX_FILE_BYTES } from "./archive";

export interface PrivateStorage {
  put(bytes: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
function validateKey(key: string) {
  if (!/^[a-f0-9-]{36}\.bin$/.test(key))
    throw new Error("Invalid private storage key");
}
function validateBytes(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_FILE_BYTES)
    throw new Error("File size must be between 1 byte and 10 MB");
}
function storagePath(key: string) {
  validateKey(key);
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
    validateBytes(bytes);
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

/** All hosts sharing a database must share this storage identity. No silent S3 fallback. */
export function createPrivateStorage(
  env: NodeJS.ProcessEnv = process.env,
): PrivateStorage {
  const driver = env.STORAGE_DRIVER || "local";
  if (driver === "local") return localStorage;
  if (driver !== "s3") throw new Error("Unsupported private storage driver");
  const bucket = env.S3_BUCKET,
    region = env.S3_REGION;
  if (!bucket || !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || !region)
    throw new Error("S3 storage requires a valid bucket and region");
  let endpoint: URL | undefined;
  if (env.S3_ENDPOINT) {
    endpoint = new URL(env.S3_ENDPOINT);
    if (
      !["http:", "https:"].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== "/"
    )
      throw new Error("Invalid S3 endpoint");
  }
  const rawPrefix = env.S3_PREFIX || "";
  if (
    rawPrefix &&
    (!/^[a-zA-Z0-9/_-]+$/.test(rawPrefix) ||
      rawPrefix.startsWith("/") ||
      rawPrefix.includes("//"))
  )
    throw new Error("Invalid S3 object prefix");
  const prefix = rawPrefix ? `${rawPrefix.replace(/\/$/, "")}/` : "";
  if (
    env.S3_FORCE_PATH_STYLE &&
    !["true", "false"].includes(env.S3_FORCE_PATH_STYLE)
  )
    throw new Error("Invalid S3 addressing configuration");
  const timeout = Number(env.S3_REQUEST_TIMEOUT_MS || 15000);
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 60000)
    throw new Error("S3 timeout must be between 100 and 60000 milliseconds");
  if (Boolean(env.AWS_ACCESS_KEY_ID) !== Boolean(env.AWS_SECRET_ACCESS_KEY))
    throw new Error("S3 credentials must include both access key and secret");
  const client = new S3Client({
    region,
    endpoint: endpoint?.toString(),
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true",
    maxAttempts: 2,
    credentials:
      env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.AWS_ACCESS_KEY_ID,
            secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
            sessionToken: env.AWS_SESSION_TOKEN,
          }
        : undefined,
  });
  function objectKey(key: string) {
    validateKey(key);
    return `${prefix}${key}`;
  }
  return {
    async put(bytes) {
      validateBytes(bytes);
      const key = `${randomUUID()}.bin`;
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: objectKey(key),
            Body: bytes,
            ContentLength: bytes.length,
            ContentType: "application/octet-stream",
            IfNoneMatch: "*",
          }),
          { abortSignal: AbortSignal.timeout(timeout) },
        );
        return key;
      } catch {
        throw new Error("Private storage upload failed");
      }
    },
    async read(key) {
      const Key = objectKey(key);
      const signal = AbortSignal.timeout(timeout);
      let body: Readable | undefined;
      const abort = () =>
        body?.destroy(new Error("Private storage read timed out"));
      try {
        const response = await client.send(
          new GetObjectCommand({ Bucket: bucket, Key }),
          { abortSignal: signal },
        );
        if (!(response.Body instanceof Readable))
          throw new Error("Invalid stored material");
        body = response.Body;
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
        if (
          response.ContentLength !== undefined &&
          (response.ContentLength < 1 ||
            response.ContentLength > MAX_FILE_BYTES)
        )
          throw new Error("Invalid stored material size");
        const parts: Buffer[] = [];
        let size = 0;
        for await (const part of body) {
          const bytes = Buffer.isBuffer(part) ? part : Buffer.from(part);
          size += bytes.length;
          if (size > MAX_FILE_BYTES)
            throw new Error("Invalid stored material size");
          parts.push(bytes);
        }
        if (
          !size ||
          (response.ContentLength !== undefined &&
            response.ContentLength !== size)
        )
          throw new Error("Invalid stored material size");
        return Buffer.concat(parts, size);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message === "Invalid stored material size"
        )
          throw error;
        throw new Error("Private storage read failed");
      } finally {
        signal.removeEventListener("abort", abort);
        body?.destroy();
      }
    },
    async delete(key) {
      const Key = objectKey(key);
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key }), {
          abortSignal: AbortSignal.timeout(timeout),
        });
      } catch (error) {
        if ((error as { name?: string }).name !== "NoSuchKey")
          throw new Error("Private storage deletion failed");
      }
    },
  };
}

let selected: { identity: string; storage: PrivateStorage } | undefined;
export function getPrivateStorage(): PrivateStorage {
  const names = [
    "STORAGE_DRIVER",
    "S3_BUCKET",
    "S3_REGION",
    "S3_ENDPOINT",
    "S3_FORCE_PATH_STYLE",
    "S3_PREFIX",
    "S3_REQUEST_TIMEOUT_MS",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN",
  ];
  const identity = JSON.stringify(names.map((name) => process.env[name]));
  if (!selected || selected.identity !== identity)
    selected = { identity, storage: createPrivateStorage() };
  return selected.storage;
}
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
  return scanFile(storagePath(key).file);
}
export async function scanFile(
  file: string,
): Promise<"scanned" | "development_bypass"> {
  const policy = scanPolicy();
  if (policy.mode === "development_bypass") return "development_bypass";
  // ClamAV-compatible executable, never a shell command. Exit 0 alone means clean.
  try {
    await promisify(execFile)(policy.command!, ["--no-summary", file], {
      timeout: 60_000,
      maxBuffer: 64 * 1024,
      env: { PATH: process.env.PATH, LANG: "C.UTF-8" },
    });
    return "scanned";
  } catch {
    throw new Error(
      "Malware scan rejected the file or the scanner was unavailable",
    );
  }
}
