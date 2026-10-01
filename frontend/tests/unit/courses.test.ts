import assert from "node:assert/strict";
import { test } from "node:test";
import {
  assignmentSchema,
  csvCell,
  courseSchema,
} from "../../src/server/course-rules";

const valid = {
  quizId: "quiz-one",
  title: "Final assessment",
  startsAt: "2026-10-01T14:00:00.000Z",
  endsAt: "2026-10-01T15:00:00.000Z",
  durationMinutes: 30,
  attemptLimit: 1,
  allowBacktracking: false,
  integrityEnabled: true,
};
test("assignment requires coherent server timing and bounded policy", () => {
  assert.equal(assignmentSchema.safeParse(valid).success, true);
  for (const patch of [
    { endsAt: valid.startsAt },
    { durationMinutes: 0 },
    { attemptLimit: 0 },
    { ownerId: "other" },
    { durationMinutes: 1441 },
  ]) {
    assert.equal(
      assignmentSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
  }
  assert.equal(
    courseSchema.safeParse({ name: " ", description: "" }).success,
    false,
  );
});
test("CSV exports quote delimiters and neutralize spreadsheet formulas", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell('=HYPERLINK("evil")'), '"\'=HYPERLINK(""evil"")"');
  assert.equal(csvCell("\t=1+1"), '"\'\t=1+1"');
  assert.equal(csvCell(42), '"42"');
});
