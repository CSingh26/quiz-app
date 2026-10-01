import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { db } from "../../src/server/db";
import {
  register,
  login,
  authenticate,
  revokeSession,
  rateLimit,
  createSession,
} from "../../src/server/auth";
import { digestToken, newToken } from "../../src/server/auth-core";
import { resetPassword, verifyEmail } from "../../src/server/mail";
import {
  createCourse,
  joinCourse,
  getCourse,
  createAssignment,
  courseResults,
} from "../../src/server/courses";
import { createQuiz } from "../../src/server/assessment";

const url = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.pathname !== "/quizbee_v2_test" ||
  url.port !== "55439"
)
  throw new Error("Use the isolated QuizBee test database.");
test.after(() => db.$disconnect());
const password = "Testing a long unique password";
const person = (role = "STUDENT") => ({
  name: "Account fixture",
  email: `${randomUUID()}@example.invalid`,
  password,
  role,
});

test("opaque sessions revoke immediately and recovery tokens are one-use and revoke all sessions", async () => {
  const body = person();
  const result = await register(body);
  try {
    assert.equal(
      (await authenticate(result.session.token)).user.id,
      result.user.id,
    );
    const saved = await db.session.findFirstOrThrow({
      where: { userId: result.user.id },
    });
    assert.notEqual(saved.tokenHash, result.session.token);
    await assert.rejects(
      login({ email: body.email, password: "a wrong password" }),
      { code: "INVALID_CREDENTIALS" },
    );
    await revokeSession(result.user.id, saved.id);
    await assert.rejects(authenticate(result.session.token), {
      code: "AUTH_REQUIRED",
    });
    const active = await login({ email: body.email, password });
    const verifyToken = newToken();
    await db.verificationToken.create({
      data: {
        userId: result.user.id,
        type: "verify",
        tokenHash: digestToken(verifyToken),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await verifyEmail({ token: verifyToken });
    await assert.rejects(verifyEmail({ token: verifyToken }), {
      code: "TOKEN_EXPIRED",
    });
    assert.ok(
      (await db.user.findUniqueOrThrow({ where: { id: result.user.id } }))
        .emailVerifiedAt,
    );
    const token = newToken();
    await db.verificationToken.create({
      data: {
        userId: result.user.id,
        type: "reset",
        tokenHash: digestToken(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await resetPassword({ token, password: "A changed long private password" });
    await assert.rejects(authenticate(active.session.token), {
      code: "AUTH_REQUIRED",
    });
    await assert.rejects(resetPassword({ token, password }), {
      code: "TOKEN_EXPIRED",
    });
    assert.equal(
      (
        await login({
          email: body.email,
          password: "A changed long private password",
        })
      ).user.id,
      result.user.id,
    );
  } finally {
    await db.user.delete({ where: { id: result.user.id } });
  }
});

test("shared database rate limit admits at most the quota under concurrent requests", async () => {
  const key = `test:${randomUUID()}`;
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 12 }, () => rateLimit(key, 4, 60000)),
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      4,
    );
    assert.ok(
      results
        .filter((result) => result.status === "rejected")
        .every((result) => result.reason.code === "RATE_LIMITED"),
    );
  } finally {
    await db.rateLimit.deleteMany({ where: { id: digestToken(key) } });
  }
});

test("a login verified against an old password cannot issue a session after a password reset", async () => {
  const result = await register(person());
  try {
    const user = await db.user.findUniqueOrThrow({
      where: { id: result.user.id },
    });
    const token = newToken();
    await db.verificationToken.create({
      data: {
        userId: user.id,
        type: "reset",
        tokenHash: digestToken(token),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await resetPassword({ token, password: "A newer password after reset" });
    await assert.rejects(createSession(user.id, user.passwordHash), {
      code: "INVALID_CREDENTIALS",
    });
    assert.equal(await db.session.count({ where: { userId: user.id } }), 0);
  } finally {
    await db.user.delete({ where: { id: result.user.id } });
  }
});

test("course ownership prevents roster/results/assignment access and students cannot create courses", async () => {
  const teacher = await register(person("INSTRUCTOR"));
  const other = await register(person("INSTRUCTOR"));
  const student = await register(person());
  try {
    const course = await createCourse(teacher.user.id, {
      name: "Testing class",
      description: "Synthetic",
    });
    await assert.rejects(
      createCourse(student.user.id, { name: "Forbidden class" }),
      { code: "FORBIDDEN" },
    );
    await assert.rejects(getCourse(other.user.id, course.id), {
      code: "RESOURCE_NOT_FOUND",
    });
    await joinCourse(student.user.id, { code: course.code });
    assert.equal(
      (await getCourse(student.user.id, course.id)).members.length,
      0,
    );
    assert.equal((await getCourse(student.user.id, course.id)).course.code, "");
    assert.equal(
      (await getCourse(teacher.user.id, course.id)).members.length,
      1,
    );
    await assert.rejects(courseResults(student.user.id, course.id), {
      code: "RESOURCE_NOT_FOUND",
    });
    const quiz = await createQuiz(teacher.user.id, {
      title: "Fixture",
      description: "",
      questions: [
        {
          id: "q",
          type: "numeric",
          prompt: "One plus one",
          choices: [],
          correctAnswer: 2,
        },
      ],
      settings: {
        durationMinutes: 10,
        shuffleQuestions: true,
        shuffleOptions: true,
        mode: "exam",
        showExplanations: true,
      },
    });
    const assignment = {
      quizId: quiz.id,
      title: "Fixture exam",
      startsAt: new Date(Date.now() - 1000).toISOString(),
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      durationMinutes: 20,
      attemptLimit: 1,
      allowBacktracking: false,
      integrityEnabled: true,
    };
    await assert.rejects(
      createAssignment(other.user.id, course.id, assignment),
      { code: "RESOURCE_NOT_FOUND" },
    );
    const created = await createAssignment(
      teacher.user.id,
      course.id,
      assignment,
    );
    assert.equal(created.questionCount, 1);
    assert.equal("accessCodeHash" in created, false);
  } finally {
    await db.user.deleteMany({
      where: { id: { in: [teacher.user.id, other.user.id, student.user.id] } },
    });
  }
});
