# Assessment integrity

QuizBee enforces assessment state on the server. It does not provide remote proctoring, browser lockdown or proof that a participant worked without outside help.

## Questions and grading

| Type | Answer contract and automatic rule |
| --- | --- |
| Single choice / true-false | One available choice ID; exact match |
| Multiple select | Distinct choice IDs; exact set match |
| Ordering | Every choice ID exactly once; exact sequence match |
| Matching | Choice ID to target-text mapping; complete exact mapping |
| Numeric | Finite number within configured absolute tolerance; default tolerance zero |
| Short answer / fill blank | Unicode normalization, case/whitespace normalization, then exact text match |
| Essay | Text with an instructor-authored rubric; a nonempty answer requires review |

Objective questions use all-or-nothing points. There is no automatic semantic essay grading, alternate-answer list or objective partial-credit engine. Unanswered questions earn zero. An answered essay makes the final score unavailable until authorized review; the system does not present an incomplete score as a final grade.

Course owners can review assigned attempts. A learner can self-review their own privately owned **practice** quiz. Review requires a bounded score for every question and a reason; reviewer, timestamp, reason and provenance are recorded. Review can correct objective grades as well as written-response grades. Self-reviewed scores are not equivalent to independently assessed grades.

## Versions, timing and recovery

A quiz save creates an immutable version. An assignment pins a version. Starting an attempt copies the exact questions, settings, question/choice order and policy into a stored snapshot. Refreshing or editing the original quiz does not alter an existing attempt's snapshot or deadline.

The server resumes an existing in-progress attempt before allocating another. Assignment membership, optional hashed access code, availability window and attempt quota are enforced on the server. The deadline is the earlier of the attempt duration and assignment closing time. Private practice can have no time limit.

Answer writes require the current revision and are serialized with finalization. Stale writes receive a conflict; they do not silently overwrite another tab. Late changes are rejected after the stored answers are finalized as expired. Submission is idempotent. Expiration uses the saved answers, so unsent browser changes cannot be recovered after the deadline.

Request-time checks enforce timing even if the worker is stopped. The worker also sweeps abandoned attempts at startup and at its maintenance interval; dashboard/results/review reads trigger relevant expiration checks. These sweeps process bounded batches and are not exact-time scheduling guarantees.

## Disclosure and navigation

Active attempt responses exclude correct answers, explanations and source quotations. Matching questions expose the set of possible target strings without exposing their mapping. Exam score and answer review are withheld until the stored release time, normally assignment close. Practice review is available after completion. Disabling explanations also hides source quotations in the released attempt review.

When backtracking is disabled, the server enforces a forward-only cursor and rejects changes outside the current question. This restricts answer changes, not access to a locked-down browser; the client receives the question set needed to render the attempt.

## Optional browser signals

An instructor can enable disclosed visibility, focus, fullscreen-exit, copy and paste events for an assigned attempt. The endpoint accepts only the owner's active eligible attempt and applies rate limits. These events are imperfect observations: a browser can omit or forge them, assistive technology can trigger them, and they cannot detect another device. Counts should inform a conversation, not automatically establish misconduct. No webcam, microphone or screen recording is implemented.

After a completed practice attempt with resolved grades, retry-mistakes creates a separate practice quiz containing questions below full credit. It is a revision aid, not an adaptive-learning model.
