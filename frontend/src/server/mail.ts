import nodemailer from "nodemailer";
import { z } from "zod";
import { db } from "./db";
import { AppError } from "./errors";
import { digestToken, hashPassword, newToken } from "./auth-core";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
export const mailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST && process.env.MAIL_FROM && process.env.APP_ORIGIN,
  );

async function sendAccountMail(userId: string, type: "verify" | "reset") {
  if (!mailConfigured())
    throw new AppError(
      "MAIL_UNAVAILABLE",
      "Email delivery is not configured. Contact the QuizBee administrator.",
      503,
    );
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  const token = newToken();
  const record = await db.verificationToken.create({
    data: {
      userId,
      tokenHash: digestToken(token),
      type,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });
  const link = new URL(
    `/study/${type === "verify" ? "verify" : "reset-password"}`,
    process.env.APP_ORIGIN,
  );
  link.searchParams.set("token", token);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    connectionTimeout: 5000,
    socketTimeout: 10000,
  });
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to: user.email,
      subject:
        type === "verify"
          ? "Verify your QuizBee email"
          : "Reset your QuizBee password",
      text: `${type === "verify" ? "Verify your email" : "Choose a new password"} using this link:\n\n${link.toString()}\n\nThis link expires in 30 minutes and can be used once. If you did not request it, ignore this email.`,
    });
  } catch {
    await db.verificationToken.deleteMany({ where: { id: record.id } });
    throw new AppError(
      "MAIL_UNAVAILABLE",
      "The email could not be sent. Please try again later.",
      503,
    );
  }
}

export const sendVerification = (userId: string) =>
  sendAccountMail(userId, "verify");
export async function requestPasswordReset(input: unknown) {
  const { email } = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((value) => value.toLowerCase()),
    })
    .strict()
    .parse(input);
  if (!mailConfigured())
    throw new AppError(
      "MAIL_UNAVAILABLE",
      "Email delivery is not configured. Contact the QuizBee administrator.",
      503,
    );
  const user = await db.user.findUnique({ where: { email } });
  if (user) await sendAccountMail(user.id, "reset");
}

export async function verifyEmail(input: unknown) {
  const { token } = z.object({ token: tokenSchema }).strict().parse(input);
  await db.$transaction(async (tx) => {
    const tokenHash = digestToken(token);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;
    const record = await tx.verificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.type !== "verify" || record.expiresAt <= new Date())
      throw new AppError(
        "TOKEN_EXPIRED",
        "This verification link is invalid or expired. Request a new one.",
      );
    await tx.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await tx.verificationToken.deleteMany({
      where: { userId: record.userId, type: "verify" },
    });
  });
}

export async function resetPassword(input: unknown) {
  const { token, password } = z
    .object({ token: tokenSchema, password: z.string().min(12).max(128) })
    .strict()
    .parse(input);
  const passwordHash = await hashPassword(password);
  await db.$transaction(async (tx) => {
    const tokenHash = digestToken(token);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tokenHash}))`;
    const candidate = await tx.verificationToken.findUnique({
      where: { tokenHash },
    });
    if (!candidate)
      throw new AppError(
        "TOKEN_EXPIRED",
        "This password reset link is invalid or expired. Request a new one.",
      );
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${candidate.userId} FOR UPDATE`;
    const record = await tx.verificationToken.findUnique({
      where: { tokenHash },
    });
    if (!record || record.type !== "reset" || record.expiresAt <= new Date())
      throw new AppError(
        "TOKEN_EXPIRED",
        "This password reset link is invalid or expired. Request a new one.",
      );
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await tx.verificationToken.deleteMany({
      where: { userId: record.userId, type: "reset" },
    });
    await tx.auditLog.create({
      data: {
        userId: record.userId,
        action: "password.reset",
        resourceId: record.userId,
      },
    });
  });
}
