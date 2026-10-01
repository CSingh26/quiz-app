import type { User } from "@prisma/client";
import { db } from "./db";
import { AppError } from "./errors";
import {
  digestToken,
  hashPassword,
  loginSchema,
  newToken,
  registerSchema,
  verifyPassword,
} from "./auth-core";

export const SESSION_COOKIE = "quizbee_session";
const sessionLifetime = 1000 * 60 * 60 * 12;
export const publicUser = (
  user: Pick<User, "id" | "name" | "email" | "role">,
) => ({ id: user.id, name: user.name, email: user.email, role: user.role });

export async function createSession(
  userId: string,
  expectedPasswordHash: string,
) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + sessionLifetime);
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const current = await tx.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });
    if (!current || current.passwordHash !== expectedPasswordHash)
      throw new AppError(
        "INVALID_CREDENTIALS",
        "Your credentials changed. Sign in again.",
        401,
      );
    await tx.session.create({
      data: { userId, tokenHash: digestToken(token), expiresAt },
    });
  });
  return { token, expiresAt };
}

export async function register(input: unknown) {
  const body = registerSchema.parse(input);
  const passwordHash = await hashPassword(body.password);
  try {
    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        passwordHash,
      },
    });
    await db.auditLog.create({
      data: { userId: user.id, action: "account.created", resourceId: user.id },
    });
    return {
      user: publicUser(user),
      session: await createSession(user.id, passwordHash),
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    ) {
      throw new AppError(
        "ACCOUNT_EXISTS",
        "An account with this email already exists. Try signing in.",
        409,
      );
    }
    throw error;
  }
}

// Fixed valid dummy hash makes unknown-account comparisons use the same KDF work.
const dummyHash = `scrypt-v1:${"0".repeat(32)}:${"0".repeat(128)}`;
export async function login(input: unknown) {
  const body = loginSchema.parse(input);
  const user = await db.user.findUnique({ where: { email: body.email } });
  const matches = await verifyPassword(
    body.password,
    user?.passwordHash ?? dummyHash,
  );
  if (!user || !matches)
    throw new AppError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
      401,
    );
  return {
    user: publicUser(user),
    session: await createSession(user.id, user.passwordHash),
  };
}

export async function authenticate(token: string | undefined) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new AppError("AUTH_REQUIRED", "Sign in to continue.", 401);
  const session = await db.session.findUnique({
    where: { tokenHash: digestToken(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date())
    throw new AppError(
      "AUTH_REQUIRED",
      "Your session has ended. Please sign in again.",
      401,
    );
  return { user: session.user, sessionId: session.id };
}

export async function revokeSession(userId: string, id: string) {
  const deleted = await db.session.deleteMany({ where: { id, userId } });
  if (!deleted.count)
    throw new AppError("RESOURCE_NOT_FOUND", "Session not found.", 404);
}

export async function listSessions(userId: string, currentId: string) {
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, createdAt: true, expiresAt: true },
  });
  return sessions.map((session) => ({
    ...session,
    current: session.id === currentId,
  }));
}

export async function rateLimit(
  key: string,
  maximum: number,
  windowMs: number,
) {
  const now = new Date();
  const id = digestToken(key);
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
    const current = await tx.rateLimit.findUnique({ where: { id } });
    if (current && current.resetAt > now) {
      if (current.count >= maximum)
        throw new AppError(
          "RATE_LIMITED",
          "Too many requests. Wait a few minutes and try again.",
          429,
        );
      await tx.rateLimit.update({
        where: { id },
        data: { count: { increment: 1 } },
      });
    } else {
      await tx.rateLimit.upsert({
        where: { id },
        create: { id, count: 1, resetAt: new Date(now.getTime() + windowMs) },
        update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
      });
    }
  });
}
