import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const database = new URL(
  process.env.PLATFORM_DATABASE_URL || "http://not-configured",
);
const endpoint = new URL(process.env.S3_ENDPOINT || "http://not-configured");
if (
  !["localhost", "127.0.0.1"].includes(database.hostname) ||
  database.port !== "55439" ||
  database.pathname !== "/quizbee_v2_test" ||
  !["localhost", "127.0.0.1"].includes(endpoint.hostname) ||
  endpoint.port !== "18333" ||
  process.env.S3_BUCKET !== "quizbee-storage-test" ||
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_SECRET_ACCESS_KEY
)
  throw new Error(
    "Use the isolated localhost PostgreSQL test database and S3 service on port 18333 with bucket quizbee-storage-test.",
  );

test(
  "separate API and worker directories share private object storage with durable material and account deletion",
  { timeout: 30000 },
  async (context) => {
    const root = await mkdtemp(
      path.join(tmpdir(), "quizbee-shared-storage-test-"),
    );
    context.after(() => rm(root, { recursive: true, force: true }));
    const prefix = `integration-${randomUUID()}/`;
    Object.assign(process.env, {
      STORAGE_DRIVER: "s3",
      S3_FORCE_PATH_STYLE: "true",
      S3_PREFIX: prefix,
      UPLOADS_ENABLED: "true",
      PRIVATE_STORAGE_DIR: path.join(root, "api-local"),
    });
    const client = new S3Client({
      endpoint: endpoint.toString(),
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    context.after(() => client.destroy());
    await client.send(
      new HeadBucketCommand({ Bucket: "quizbee-storage-test" }),
    );
    const { db } = await import("../../src/server/db");
    context.after(() => db.$disconnect());
    const api = await import("../../src/server/materials");
    const { getPrivateStorage } =
      await import("../../src/server/ingestion/storage");
    const { drainStorageDeletions } =
      await import("../../src/server/storage-cleanup");
    const { deleteAccount } = await import("../../src/server/account");
    const storage = getPrivateStorage();
    const keys: string[] = [];
    let userId: string | undefined;
    try {
      const user = await db.user.create({
        data: {
          name: "Shared storage fixture",
          email: `shared-storage-${randomUUID()}@example.invalid`,
          passwordHash: "not-a-login-credential",
        },
      });
      userId = user.id;
      const uploaded = await api.uploadMaterial(
        user.id,
        new File(["# Cells\nCells contain DNA."], "notes.md"),
      );
      const material = await db.studyMaterial.findUniqueOrThrow({
        where: { id: uploaded.id },
      });
      keys.push(material.storageKey);
      assert.match(
        (await storage.read(material.storageKey)).toString(),
        /Cells contain DNA/,
      );
      const anonymous = await fetch(
        new URL(
          `/quizbee-storage-test/${prefix}${material.storageKey}`,
          endpoint,
        ),
      );
      assert.ok(
        [401, 403, 404].includes(anonymous.status),
        "original material must not allow anonymous reads",
      );
      await anonymous.arrayBuffer();
      for (let attempt = 0; attempt < 10; attempt++) {
        await promisify(execFile)(
          process.execPath,
          ["--import", "tsx", "src/server/jobs/run.ts", "--once"],
          {
            cwd: process.cwd(),
            timeout: 15000,
            env: {
              ...process.env,
              NODE_ENV: "development",
              WORKER_KINDS: "ingestion",
              ALLOW_UNSCANNED_UPLOADS: "true",
              MALWARE_SCAN_COMMAND: "",
              PRIVATE_STORAGE_DIR: path.join(root, "worker-local"),
              STAGING_DIR: path.join(root, "worker-staging"),
            },
          },
        );
        if (
          (
            await db.studyMaterial.findUniqueOrThrow({
              where: { id: material.id },
            })
          ).status === "ready"
        )
          break;
      }
      assert.equal(
        (
          await db.studyMaterial.findUniqueOrThrow({
            where: { id: material.id },
          })
        ).status,
        "ready",
      );
      assert.match(
        (await api.getChunks(user.id, material.id))[0].text,
        /Cells contain DNA/,
      );
      await assert.rejects(api.getChunks("different-user", material.id));
      assert.deepEqual(await readdir(path.join(root, "worker-staging")), []);
      await assert.rejects(readdir(path.join(root, "api-local")));
      await assert.rejects(readdir(path.join(root, "worker-local")));
      await api.deleteMaterial(user.id, material.id);
      assert.ok(
        await db.storageDeletion.findUnique({
          where: { storageKey: material.storageKey },
        }),
      );
      await drainStorageDeletions();
      await assert.rejects(storage.read(material.storageKey));

      const retryKey = await storage.put(Buffer.from("deletion retry fixture"));
      keys.push(retryKey);
      await db.storageDeletion.create({ data: { storageKey: retryKey } });
      await drainStorageDeletions({
        ...storage,
        async delete() {
          throw new Error("fixture storage interruption");
        },
      });
      assert.ok(
        (
          await db.storageDeletion.findUniqueOrThrow({
            where: { storageKey: retryKey },
          })
        ).attempts > 0,
      );
      await drainStorageDeletions();
      await assert.rejects(storage.read(retryKey));
      assert.equal(
        await db.storageDeletion.findUnique({
          where: { storageKey: retryKey },
        }),
        null,
      );

      const second = await api.uploadMaterial(
        user.id,
        new File(["Private account material"], "account.txt"),
      );
      const secondKey = (
        await db.studyMaterial.findUniqueOrThrow({ where: { id: second.id } })
      ).storageKey;
      keys.push(secondKey);
      await deleteAccount(user.id, "not-a-login-credential");
      assert.ok(
        await db.storageDeletion.findUnique({
          where: { storageKey: secondKey },
        }),
      );
      await drainStorageDeletions();
      await assert.rejects(storage.read(secondKey));
      assert.equal(await db.user.findUnique({ where: { id: user.id } }), null);
    } finally {
      if (userId) await db.user.deleteMany({ where: { id: userId } });
      for (const key of keys) await storage.delete(key);
      await db.storageDeletion.deleteMany({
        where: { storageKey: { in: keys } },
      });
      await db.$disconnect();
      client.destroy();
      await rm(root, { recursive: true, force: true });
    }
  },
);
