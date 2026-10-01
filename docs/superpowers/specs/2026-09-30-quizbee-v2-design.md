# QuizBee 2.0 rebuild design

> Historical rebuild plan. Source paths below reflect the October 1 service extraction; current runtime and verification guidance is in `docs/ARCHITECTURE.md` and `docs/TESTING.md`.
> Status: staged local rebuild; no deployment authorized. User confirms existing data is development/demo data.

## Intent and success

Build a self-study and instructor assessment platform with real persistence and server authority. Preserve the legacy application during migration. The broad brief spans multiple releases: each stage must work independently, and documentation must separate implemented behavior from planned capabilities. The user explicitly asked for the initial audit/design followed by implementation; proceed through reviewable local stages without additional approval gates.

## Architecture decision

Use the existing Next.js App Router application for UI and a same-origin `/api/v2` server interface, with strict TypeScript domain/services and Prisma/PostgreSQL persistence. Keep the existing Express/MongoDB service and `/api` protocol as the legacy boundary. Run file processing and AI work in a separate Node worker. Prefer a PostgreSQL leased job queue initially to avoid requiring Redis before workload evidence warrants it.

Alternatives considered: expanding legacy Express/MongoDB offers lower initial effort but leaves weak relations and duplicated room collections; replacing everything at once makes regression isolation and rollback difficult. The chosen coexistence approach permits independently verified vertical slices and eventual retirement after parity.

## Data model

Use `User`, `Session`, `VerificationToken`, `Quiz`, `QuizVersion`, `Attempt`, `Course`, `CourseMembership`, `Assignment`, `StudyMaterial`, `MaterialChunk`, `AIJob`, `AuditLog`, `IntegrityEvent` and `RateLimit`. A user may create private quizzes regardless of role. Instructor permissions govern course/assignment mutations; resource ownership remains separate. Quiz versions contain validated immutable question snapshots and settings; attempt snapshots persist presented question and choice order, answers, deadlines, revision, grade and state. JSON is justified for immutable versioned question unions; mutable relationships use foreign keys and indexes. Later question-bank normalization must preserve version snapshots.

## Security boundaries

Opaque revocable sessions use random secrets, hashed database tokens, HttpOnly SameSite cookies, fixed expiry and explicit same-origin checks for unsafe requests. Password hashing uses a memory-hard algorithm. Validate every API payload with Zod, reject unknown properties, enforce resource ownership at the service boundary, and rate-limit costly/auth routes. Do not return answer keys before authorized review. Serialize attempt mutations, freeze grading inputs, use server deadlines, reject fabricated question/options and stale revisions, and make submission idempotent.

Uploads enter quarantine, receive byte/type/size validation and malware-scan policy before extraction. ZIP processing enforces safe paths, actual decompressed byte limits, ratios, entry counts, no symlinks and no nested generic archives. Office files are ZIP containers with constrained XML parsing, never executable macros. Files live outside public assets, with an object-storage interface. Jobs track leases, attempts and terminal errors. Provider output is untrusted structured JSON, constrained to permitted types and source chunk IDs.

## UI system

Replace the blue/pink legacy visual identity on the new platform with a restrained study-desk system: warm paper surfaces, ink text, honey actions, generous headings and dense useful lists. Reuse Radix/shadcn foundations, Lucide, local typography and reduced-motion-aware transitions. No fabricated statistics. New users see useful empty states. Separate `/study` routes from legacy dashboards. Main flows: sign in/register, study home, manual builder, material library, AI generation, quiz preview/taking, results/review, instructor courses/assignments and account/session/theme settings.

## Folder structure

```
services/platform/prisma/                 PostgreSQL schema and migrations
services/platform/src/domain/            schemas, grading, attempt rules, permissions
services/platform/src/server/            auth, database, API services, ingestion, AI, jobs
frontend/src/app/api/v2/         same-origin transport adapters
frontend/src/app/study/          new platform screens
frontend/src/components/study/   shared product components
services/platform/tests/unit/            pure domain/security tests
services/platform/tests/integration/     real PostgreSQL contracts
frontend/tests/e2e/             browser journeys
docs/                           audit, architecture, security, deployment and limits
backend/                        preserved legacy service
```

## Delivery phases and gates

1. Record source-backed audit, target schema, threat model and migration plan. Establish local PostgreSQL and reproducible migrations.
2. Implement identity/session/authorization and manual private quizzes, immutable versions, server timing, recovery, grading and idempotent submission. Verify real DB transactions and browser flows.
3. Implement upload/ingestion worker, source chunks, schema-driven AI adapters/jobs and generation UI. No model key means honest unconfigured state, never synthetic generated results.
4. Implement instructor course/assignment workflows, exam policies, disclosure of integrity events and result export.
5. Build actual-result analytics, question-bank/revision features and finish responsive/theme/accessibility verification.
6. Harden CI, security tests, privacy controls and operator documentation. Record remaining target capabilities explicitly; do not describe incomplete roadmap as shipped.

## Migration and rollback

Do not point the new schema at MongoDB or replace legacy Prisma. Create a separate PostgreSQL database and migrations. Import demo content only by explicit seed command. Legacy attempts refer to room names and lack immutable snapshots; historical snapshots cannot be reconstructed faithfully. Future import must preserve raw historical records as legacy provenance, map IDs, merge room collections carefully and reconcile score/leaderboard policy. Rollback is route/config selection with the old database preserved. No production import or deletion occurs here.

## Risks and tradeoffs

Email delivery, AI service calls, malware engines and S3/R2 integration require configured services and integration testing. Local storage and a single worker are development defaults. Browser events cannot detect second devices or outside assistance. Subjective grading needs a human workflow. Large-file parsing requires process isolation/resource limits. Automated tests demonstrate specified invariants, not complete security or WCAG certification. A phased delivery avoids pretending that the entire 66-section vision is complete.

## Primary technical references

- [Prisma v6 transaction isolation and retry behavior](https://www.prisma.io/docs/orm/v6/prisma-client/queries/transactions)
- [Next.js cookie behavior](https://nextjs.org/docs/app/api-reference/functions/cookies)
