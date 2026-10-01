# Repository audit — 2026-09-30

Scope: source at `3a750aa`, before rebuild implementation. Three independent read-only passes inspected frontend, backend, database/tests and CI. Baseline: 16 backend tests pass; backend lint passes; frontend typecheck passes; frontend lint passes with 16 existing warnings. No production data or credentials inspected.

## Architecture and current workflows
Next.js App Router/React/TypeScript frontend calls a CommonJS Express API. Prisma 6 models MongoDB; a replica set is required for transactions. Student identity is persisted with bcrypt password hashes; instructor identity is one environment-configured credential. JWTs last one hour in HttpOnly SameSite=Lax cookies, Secure in production. Independent Prisma clients occur in multiple controllers. A per-process minute cron moves rooms between three collections.

Instructors atomically import JSON modules, schedule rooms and activate them. Students request shuffled room questions, submit answer text, receive server-computed scores and open named leaderboards. Repeated attempts are intentionally allowed and the latest score replaces the leaderboard score. There is no independent student quiz creation, source ingestion, AI, courses, versioned question bank or durable in-progress attempt.

## Preserve
- `backend/domain/quiz.js`: complete question-file validation, module-scoped question/option validation, server grading and authoritative room-window checks.
- `backend/controller/instructor/questionUploadController.js`: nested atomic imports and linked-module deletion protection.
- `backend/controller/student/quizController.js`: transactional attempt/leaderboard persistence and answer-key omission in delivered questions.
- Instructor mutation role gates execute before Multer parsing; uploads capped at 5 MB; cookie/security/error behavior already has tests.
- Existing Next.js, Tailwind, Radix/shadcn primitives, React Hook Form, local fonts, Lucide and Playwright are reusable.

## Confirmed defects and limitations
| Area | Evidence | Impact / decision |
|---|---|---|
| Rank/history | `backend/controller/student/quizController.js:103,155`; `backend/controller/instructor/roomController.js:173,182` | Stored rank remains zero; past history may choose an earlier attempt while the leaderboard holds latest. New analytics must derive from explicit attempt policy. |
| Lifecycle | `backend/controller/instructor/roomController.js:60,93`; `backend/prisma/schema.prisma:47` | Scheduled/active/past moves use non-atomic create/delete in cron; partial failure can strand a room. Replace with one stable assignment/room identity. |
| Relational migration | `backend/prisma/schema.prisma:80` | Attempts refer to PastRoom by name even when submitted in ActiveRoom; direct PostgreSQL provider swap would reject valid submissions. Use separate schema/database. |
| Joining | `backend/controller/instructor/roomController.js:210` | Code verification ignores selected room ID. New assignment admission must bind resource and policy. |
| Results | `backend/controller/student/quizController.js:134` | Leaderboard disappears after archive. Immutable attempts remain queryable in v2. |
| Profile | `backend/middleware/upload.js:19`; `backend/controller/student/profileController.js:25,50` | Two-file form conflicts with one-file limit; missing profile attempts a second response. Legacy known defects remain explicit until that surface is replaced. |
| Identity | `backend/controller/student/studentAuthController.js`; `backend/middleware/authMiddleware.js` | Missing authoritative registration schema, revocation, recovery, email verification and throttling. Replace for v2. |
| Privacy | `backend/routes/instructor/roomRoutes.js`; `backend/routes/student/quizRoutes.js`; `backend/routes/instructor/testRoutes.js` | Public metadata/results reads are documented legacy policy, unsuitable as private SaaS defaults. |
| Integrity | Legacy submit returns scores for unlimited partial attempts | Correctness oracle is an intentional-policy limitation, not a claimed quota bypass. New exam attempts hide reviews until policy allows. |
| Files | `backend/controller/student/profileController.js` | Client MIME/filename trusted for S3 objects; byte signature validation absent. No proven stored-XSS claim without serving configuration. |
| Frontend auth | `frontend/src/app/utils/preventAuth.tsx:14,56` | Protected children render before auth resolves; changing role route logs out valid sessions. New gate uses a single authoritative session response. |
| Recovery | `frontend/src/app/quiz/[roomCode]/page.tsx:20` | Answers disappear on refresh; no stable order/deadline or submission lock. New attempts persist server-side. |
| Accessibility | Legacy login forms, PasswordInput and questionDisplay | Enter-to-submit, accessible password-toggle names and selected-answer semantics are missing. |
| Responsive | Legacy topThreeLeaderboard, uploadModuleView | Fixed-width cards overflow small viewports. New layouts need real desktop/mobile checks. |
| Design | `frontend/src/app/globals.css:27` | Montserrat incorrectly points to Noto Serif; blue/pink styling and duplicated layouts need replacement on new routes. |

## Scale and engineering debt
No pagination, per-resource owner, tenant membership, shared rate limiting, central typed errors, request IDs, durable jobs or immutable versions. Cron duplicates under multiple API replicas. Room names are business labels but act as foreign keys. Public result queries load whole sets and compute in memory. Production bottlenecks are architectural before they are micro-optimizations.

## Tests and CI
CI uses locked installs, lint, types, domain/controller tests, an isolated Mongo replica set persistence test, production build, Chromium desktop/mobile fixtures, production dependency audits and a tracked-text secret scan. Keep those checks. Add PostgreSQL migration verification and real authenticated platform journeys. Existing browser fixtures are synthetic and do not establish complete end-to-end persistence or WCAG conformance.

## Replacement boundary
Keep legacy endpoints and datastore operational. New `/study` UI and `/api/v2` services use their own PostgreSQL client, schema and cookie name. Never infer historical immutable versions from mutable legacy content. No real data migration is needed for the confirmed demo-only local environment.
