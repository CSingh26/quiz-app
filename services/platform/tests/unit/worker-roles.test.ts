import assert from "node:assert/strict";
import test from "node:test";
import * as worker from "../../src/server/jobs/worker";

test("worker roles default to both supported kinds and reject ambiguous configurations", () => {
  const parse = (
    worker as unknown as { parseWorkerKinds?: (value?: string) => string[] }
  ).parseWorkerKinds;
  assert.equal(
    typeof parse,
    "function",
    "worker configuration must validate roles before claiming work",
  );
  assert.deepEqual(parse!(), ["ingestion", "generation"]);
  assert.deepEqual(parse!("generation"), ["generation"]);
  assert.deepEqual(parse!(" ingestion , generation "), [
    "ingestion",
    "generation",
  ]);
  for (const value of [
    "",
    " ",
    "unknown",
    "ingestion,",
    "ingestion,ingestion",
    "generation,unknown",
  ])
    assert.throws(() => parse!(value), /WORKER_KINDS/);
});
