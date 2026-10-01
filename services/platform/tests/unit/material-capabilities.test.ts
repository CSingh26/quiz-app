import test from "node:test";
import assert from "node:assert/strict";
import * as materials from "../../src/server/materials";

test("API upload capability can be declared without worker scanner settings", () => {
  assert.equal(typeof materials.uploadsEnabled, "function");
  assert.equal(
    materials.uploadsEnabled({
      NODE_ENV: "production",
      UPLOADS_ENABLED: "true",
    }),
    true,
  );
  assert.equal(
    materials.uploadsEnabled({
      NODE_ENV: "production",
      ALLOW_UNSCANNED_UPLOADS: "true",
    }),
    false,
  );
  assert.equal(
    materials.uploadsEnabled({
      NODE_ENV: "development",
      ALLOW_UNSCANNED_UPLOADS: "true",
    }),
    true,
  );
  assert.equal(
    materials.uploadsEnabled({
      NODE_ENV: "production",
      MALWARE_SCAN_COMMAND: "/usr/bin/scanner",
    }),
    true,
  );
  assert.equal(
    materials.uploadsEnabled({
      UPLOADS_ENABLED: "false",
      MALWARE_SCAN_COMMAND: "/usr/bin/scanner",
    }),
    false,
  );
  assert.throws(() => materials.uploadsEnabled({ UPLOADS_ENABLED: "perhaps" }));
});

test("API generation capability does not require copying provider secrets into the API", () => {
  const names = ["GENERATION_ENABLED", "AI_BASE_URL", "AI_API_KEY", "AI_MODEL"];
  const saved = Object.fromEntries(names.map((key) => [key, process.env[key]]));
  try {
    for (const key of names) delete process.env[key];
    assert.equal(materials.generationConfig().configured, false);
    process.env.GENERATION_ENABLED = "true";
    assert.equal(materials.generationConfig().configured, true);
    process.env.GENERATION_ENABLED = "false";
    process.env.AI_BASE_URL = "http://127.0.0.1:1";
    process.env.AI_API_KEY = "test-only";
    process.env.AI_MODEL = "fixture";
    assert.equal(materials.generationConfig().configured, false);
  } finally {
    for (const [key, value] of Object.entries(saved))
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
});
