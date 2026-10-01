import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { PrivateStorage } from "../../src/server/ingestion/storage";

async function stagingModule() {
  const module = await import("../../src/server/ingestion/staging").catch(
    () => null,
  );
  assert.ok(module, "worker staging must be implemented");
  return module;
}
function source(read: () => Promise<Buffer>): PrivateStorage {
  return {
    read,
    async put() {
      throw new Error("not used");
    },
    async delete() {},
  };
}
test("staged materials are private snapshots removed on success and failure", async () => {
  const stage = await stagingModule();
  const root = await mkdtemp(path.join(tmpdir(), "quizbee-staging-test-"));
  const previous = process.env.STAGING_DIR;
  process.env.STAGING_DIR = root;
  try {
    let stagedPath = "";
    const bytes = Buffer.from("Study notes");
    await stage.withStagedMaterial(
      "fixture",
      async (file) => {
        stagedPath = file;
        assert.equal((await stat(file)).mode & 0o777, 0o600);
        assert.equal((await stat(path.dirname(file))).mode & 0o777, 0o700);
        assert.equal((await readFile(file)).toString(), "Study notes");
      },
      source(async () => bytes),
    );
    await assert.rejects(stat(stagedPath));
    await assert.rejects(
      stage.withStagedMaterial(
        "fixture",
        async () => {
          throw new Error("parse failed");
        },
        source(async () => bytes),
      ),
      /parse failed/,
    );
    assert.deepEqual(await readdir(root), []);
  } finally {
    if (previous === undefined) delete process.env.STAGING_DIR;
    else process.env.STAGING_DIR = previous;
    await rm(root, { recursive: true, force: true });
  }
});

test("worker scans and extracts one downloaded snapshot with restricted subprocess environment", async () => {
  const stage = await stagingModule();
  const root = await mkdtemp(path.join(tmpdir(), "quizbee-scan-test-"));
  const command = path.join(root, "scanner");
  const capture = path.join(root, "scanned.json");
  await writeFile(
    command,
    `#!${process.execPath}\nconst fs=require('node:fs');fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify({text:fs.readFileSync(process.argv.at(-1),'utf8'),secret:process.env.AI_API_KEY,db:process.env.PLATFORM_DATABASE_URL}));\n`,
    { mode: 0o700 },
  );
  const saved = {
    MALWARE_SCAN_COMMAND: process.env.MALWARE_SCAN_COMMAND,
    AI_API_KEY: process.env.AI_API_KEY,
    STAGING_DIR: process.env.STAGING_DIR,
  };
  process.env.MALWARE_SCAN_COMMAND = command;
  process.env.AI_API_KEY = "SYNTHETIC_SECRET_MARKER";
  process.env.STAGING_DIR = path.join(root, "stages");
  let reads = 0;
  try {
    const result = await stage.extractStoredMaterial(
      "fixture",
      "notes.txt",
      source(async () => {
        reads++;
        return Buffer.from(
          reads === 1 ? "Cells contain DNA." : "DIFFERENT BYTES",
        );
      }),
    );
    assert.equal(reads, 1);
    assert.equal(result.scanResult, "scanned");
    assert.match(result.chunks[0].text, /Cells contain DNA/);
    assert.deepEqual(JSON.parse(await readFile(capture, "utf8")), {
      text: "Cells contain DNA.",
    });
    assert.deepEqual(await readdir(process.env.STAGING_DIR), []);
    const env = stage.extractionEnvironment({
      PATH: "/bin",
      NODE_OPTIONS: "--require=untrusted",
      AI_API_KEY: "secret",
      AWS_SECRET_ACCESS_KEY: "secret",
      PLATFORM_DATABASE_URL: "secret",
    });
    assert.equal(env.PATH, "/bin");
    for (const key of [
      "NODE_OPTIONS",
      "AI_API_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "PLATFORM_DATABASE_URL",
    ])
      assert.equal(env[key], undefined);
    await writeFile(command, `#!${process.execPath}\nprocess.exit(1);\n`, {
      mode: 0o700,
    });
    await assert.rejects(
      stage.extractStoredMaterial(
        "fixture",
        "notes.txt",
        source(async () => Buffer.from("rejected")),
      ),
      /Malware scan rejected/,
    );
    assert.deepEqual(await readdir(process.env.STAGING_DIR), []);
  } finally {
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    await rm(root, { recursive: true, force: true });
  }
});
