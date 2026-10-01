import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AppError } from "./errors";

const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email,
    password: z
      .string()
      .min(12, "Use a password with at least 12 characters.")
      .max(128),
    role: z.enum(["STUDENT", "INSTRUCTOR"]).default("STUDENT"),
  })
  .strict();
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      },
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return `scrypt-v1:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [scheme, salt, stored, extra] = encoded.split(":");
  if (
    scheme !== "scrypt-v1" ||
    extra ||
    !/^[a-f0-9]{32}$/.test(salt ?? "") ||
    !/^[a-f0-9]{128}$/.test(stored ?? "")
  )
    return false;
  const hash = await derive(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(hash, Buffer.from(stored, "hex"));
}

export const digestToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function verifyOrigin(
  origin: string | null,
  requestUrl: string,
  configuredOrigin?: string,
) {
  const expected = new URL(configuredOrigin || requestUrl).origin;
  if (!origin || origin !== expected)
    throw new AppError(
      "FORBIDDEN",
      "This request must come from your QuizBee browser session.",
      403,
    );
}
