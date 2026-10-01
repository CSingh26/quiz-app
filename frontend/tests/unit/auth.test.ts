import assert from "node:assert/strict";
import { test } from "node:test";
import {
  hashPassword,
  verifyPassword,
  registerSchema,
  loginSchema,
  digestToken,
  verifyOrigin,
} from "../../src/server/auth-core";
import { hasPermission } from "../../src/server/permissions";

test("password hashes use distinct salts and only verify the original password", async () => {
  const a = await hashPassword("a long private passphrase");
  const b = await hashPassword("a long private passphrase");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("a long private passphrase", a), true);
  assert.equal(await verifyPassword("a wrong private passphrase", a), false);
  assert.equal(await verifyPassword("anything", "malformed"), false);
});

test("registration rejects privileged roles, weak passwords and mass-assigned fields", () => {
  const input = {
    name: "Test Student",
    email: "test@example.com",
    password: "a long private passphrase",
    role: "STUDENT",
  };
  assert.equal(registerSchema.parse(input).role, "STUDENT");
  for (const extra of [
    { role: "ADMIN" },
    { password: "short" },
    { verified: true },
    { email: "invalid" },
  ]) {
    assert.equal(
      registerSchema.safeParse({ ...input, ...extra }).success,
      false,
    );
  }
  assert.equal(
    loginSchema.parse({ email: " Test@Example.com ", password: "hello" }).email,
    "test@example.com",
  );
});

test("unsafe browser requests require exact allowed origin and token hashes are deterministic", () => {
  assert.doesNotThrow(() =>
    verifyOrigin(
      "http://localhost:3018",
      "http://localhost:3018/api/v2/quizzes",
      "http://localhost:3018",
    ),
  );
  for (const origin of [
    null,
    "null",
    "https://evil.test",
    "http://localhost:3018.evil.test",
  ]) {
    assert.throws(() =>
      verifyOrigin(
        origin,
        "http://localhost:3018/api/v2/quizzes",
        "http://localhost:3018",
      ),
    );
  }
  assert.throws(() =>
    verifyOrigin(
      "https://evil.test",
      "https://evil.test/api/v2/quizzes",
      "http://localhost:3018",
    ),
  );
  assert.equal(digestToken("example"), digestToken("example"));
  assert.notEqual(digestToken("example"), "example");
});

test("permissions allow student-owned study creation while denying instructor mutations and unknown roles", () => {
  assert.equal(hasPermission("STUDENT", "quiz:create"), true);
  assert.equal(hasPermission("STUDENT", "material:upload"), true);
  assert.equal(hasPermission("STUDENT", "course:create"), false);
  assert.equal(hasPermission("INSTRUCTOR", "course:create"), true);
  assert.equal(hasPermission("unknown", "quiz:create"), false);
});
