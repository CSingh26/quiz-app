# QuizBee reliability and portfolio plan

Preserve the separate quiz-app repository and the QuizBee product identity. This project demonstrates HTTP APIs, authentication, data integrity, server-authoritative grading and relational document modeling. No finance terminology is added.

Baseline:113 existing commits. Grading currently accepts arbitrary question IDs independently of the active room's test module. Room expiry depends on a cron job instead of request-time checks. Question import writes a module before validating all questions, permitting partial imports on malformed input.

Bounded implementation plan:
1. Add pure domain validation and tests for module-scoped grading, input shape, allowed option text, room time windows and complete question-file validation before writes.
2. Integrate domain logic in controllers with one bulk module-scoped question read; preserve existing answer-text protocol and partial quiz behavior (omitted questions score0).
3. Add controller integration tests using an injected/mock Prisma boundary, demonstrating invalid submissions/imports produce no writes. Preserve all original endpoints and existing UI.
4. Reproduce dependency installation, patch incompatible/outdated framework versions when required, add lint/type/tests/build CI and accurate environment/setup docs.
5. Independent review, actual checks and default-branch CI verification before delivery. No live quiz data, mail, S3 uploads or production databases are used by tests.

Remaining domain decisions are explicit: no new attempt-count policy or retroactive schema migration; existing repeated-attempt behavior remains. Tests must not claim a complete production MongoDB/S3 deployment or full access-control audit.
