# Database and data lifecycle

The new platform uses PostgreSQL 16 through the Prisma schema in `frontend/prisma/schema.prisma`. `PLATFORM_DATABASE_URL` selects it. Legacy MongoDB uses `backend/prisma/schema.prisma` and `DATABASE_URL`; these are independent databases.

## Model responsibilities

| Models | Purpose |
| --- | --- |
| `User`, `Session`, `VerificationToken` | Account identity, password hash, hashed revocable session and account-link tokens |
| `Quiz`, `QuizVersion` | Owned quiz metadata and immutable numbered question/settings snapshots |
| `QuestionBank`, `BankVersion` | Private bank metadata, folder label and immutable question collections |
| `Attempt` | Version/assignment identity, immutable presented snapshot, answers, cursor, flags, revision, deadline and grade |
| `Course`, `CourseMembership`, `Assignment` | Course ownership, membership and an assessment pinned to a quiz version |
| `IntegrityEvent` | Optional browser event type and timestamp for an active assigned attempt |
| `StudyMaterial`, `MaterialChunk` | Private file metadata and extracted text with source labels and positions |
| `AIJob` | Ingestion/generation payload, state, lease, retry count, progress and published quiz reference |
| `StorageDeletion` | Durable private-file cleanup outbox that survives account deletion |
| `AuditLog`, `RateLimit` | Selected actions and database-backed request counters |

Foreign keys and compound unique constraints enforce identities such as course membership, version number and chunk position. Times use timezone-aware PostgreSQL columns. Questions, snapshots, answers and grades use JSON because their validated forms vary by question type; JSON does not remove the service's validation or ownership requirements.

## Local schema setup

Start the repository's Compose PostgreSQL service and copy the frontend environment example as described in [README](../README.md). From `frontend`:

```sh
npm run db:generate
npm run db:migrate
```

`db:generate` creates the Prisma client. `db:migrate` applies committed migrations; it does not create a sample account. Register your own account through the application. Do not use `prisma db push` as a replacement for migration history on the new platform.

The development database is `quizbee_v2`. Automated integration tests require `quizbee_v2_test` on loopback port 55439 and reject other URLs. Creation and migration of that test database are documented in [TESTING.md](TESTING.md). The legacy replica-set test remains separate.

## Integrity and deletion

Assessment writes use row locks and bounded serializable retries. Existing attempts use their stored snapshot even when a quiz is edited. Soft-deleting a quiz prevents it from appearing as an available owned quiz; version and attempt history remain until related hard deletion.

Material deletion removes chunk rows and records the file key for eventual physical removal. Generated questions and attempt snapshots contain their own source quotations; deleting a source file does not rewrite these existing records. Deleting a bank removes its bank versions, but separately created sampled quizzes retain their copied content.

Account deletion follows foreign-key cascades. It removes the account's owned content, sessions, memberships and attempts. Deleting an instructor's owned quizzes/courses can also remove dependent assessment records belonging to participants. Current policy is not an institutional record-retention system. Audit records can retain the resource ID after their optional user reference becomes null. See [PRIVACY.md](PRIVACY.md).

## Migration and recovery limits

No converter imports legacy users, room-name associations, leaderboards or attempts. Historical legacy attempts do not contain immutable question snapshots, so those snapshots cannot be reconstructed reliably from the schema alone. An eventual migration must preserve provenance and explicitly decide identity and retention policy.

Back up PostgreSQL and the corresponding private storage together before significant schema changes. The repository does not implement backup scheduling, point-in-time recovery or an automated down-migration. Reverting application code alone does not reverse a database migration; rehearse restore procedures against a separate database before any future public deployment.
