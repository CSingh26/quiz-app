import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { db } from "../../src/server/db";
import { deleteAccount } from "../../src/server/account";
import { deleteMaterial } from "../../src/server/materials";
import { localStorage } from "../../src/server/ingestion/storage";
import { drainStorageDeletions } from "../../src/server/storage-cleanup";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test"
)
  throw new Error("Use the isolated QuizBee test database.");
test.after(() => db.$disconnect());

test("material and account deletion commit durable cleanup without contacting unavailable storage", async (t) => {
  const previous = process.env.STORAGE_DRIVER;
  process.env.STORAGE_DRIVER = "local";
  const keys = [`${randomUUID()}.bin`, `${randomUUID()}.bin`];
  let calls = 0;
  t.mock.method(localStorage, "delete", async () => {
    calls++;
    throw new Error("storage unavailable");
  });
  const user = await db.user.create({
    data: {
      name: "Deletion fixture",
      email: `${randomUUID()}@example.invalid`,
      passwordHash: "fixture",
    },
  });
  try {
    const materials = await Promise.all(
      keys.map((storageKey) =>
        db.studyMaterial.create({
          data: {
            ownerId: user.id,
            name: "private.txt",
            type: "txt",
            size: 1,
            storageKey,
          },
        }),
      ),
    );
    await deleteMaterial(user.id, materials[0].id);
    await deleteAccount(user.id, user.passwordHash);
    assert.equal(
      calls,
      0,
      "browser deletion must not wait for storage or another user's deletion backlog",
    );
    assert.equal(await db.user.findUnique({ where: { id: user.id } }), null);
    assert.equal(
      await db.storageDeletion.count({
        where: { storageKey: { in: keys }, attempts: 0 },
      }),
      2,
    );
  } finally {
    t.mock.restoreAll();
    if (previous === undefined) delete process.env.STORAGE_DRIVER;
    else process.env.STORAGE_DRIVER = previous;
    await db.user.deleteMany({ where: { id: user.id } });
    await db.storageDeletion.deleteMany({
      where: { storageKey: { in: keys } },
    });
  }
});

test("cleanup bounds an outage to one concurrent batch and rotates failed entries behind fresh work", async () => {
  const keys = Array.from({ length: 12 }, () => `${randomUUID()}.bin`);
  await db.storageDeletion.createMany({
    data: keys.map((storageKey) => ({ storageKey, createdAt: new Date(0) })),
  });
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let first = () => {};
  const entered = new Promise<void>((resolve) => {
    first = resolve;
  });
  const failed: string[] = [];
  let pending: Promise<void> | undefined;
  try {
    pending = drainStorageDeletions({
      ...localStorage,
      async delete(key) {
        failed.push(key);
        first();
        await gate;
        throw new Error("storage outage");
      },
    });
    await entered;
    assert.equal(
      failed.length,
      5,
      "start one bounded batch concurrently instead of serially draining the backlog",
    );
    release();
    await pending;
    assert.equal(failed.length, 5);
    assert.equal(
      await db.storageDeletion.count({
        where: { storageKey: { in: keys }, attempts: 1 },
      }),
      5,
    );
    assert.equal(
      await db.storageDeletion.count({ where: { storageKey: { in: keys } } }),
      12,
    );
    const recovered: string[] = [];
    await drainStorageDeletions({
      ...localStorage,
      async delete(key) {
        recovered.push(key);
      },
    });
    assert.equal(recovered.length, 5);
    assert.equal(
      recovered.some((key) => failed.includes(key)),
      false,
      "a failed prefix must not starve later deletions",
    );
    assert.equal(
      await db.storageDeletion.count({ where: { storageKey: { in: keys } } }),
      7,
    );
  } finally {
    release();
    await pending;
    await db.storageDeletion.deleteMany({
      where: { storageKey: { in: keys } },
    });
  }
});
