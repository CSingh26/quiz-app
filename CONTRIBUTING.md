# Contributing

The web interface and bounded same-origin proxy live in `frontend`. The independent API, domain services, Prisma schema/migrations and role-specific workers live in `services/platform`. API replicas and workers share PostgreSQL and private storage; this is not database-per-service isolation. The Express/MongoDB application in `backend` remains a compatibility path. Read [architecture](docs/ARCHITECTURE.md), [assessment rules](docs/ASSESSMENT_INTEGRITY.md), [security boundaries](SECURITY.md) and [testing](docs/TESTING.md) before changing behavior.

## Implementation rules

Keep grading, schemas and answer validation on the server. Preserve immutable quiz versions and attempt snapshots, stable answer IDs, persisted deadlines, revision conflict checks and idempotent finalization. Enforce ownership in services as well as route authentication. Do not trust an instructor role as ownership of another instructor's resources.

Add a regression test that fails before fixing a meaningful behavior defect. Concurrency work needs real PostgreSQL tests; a mock that only mirrors method calls does not demonstrate transaction behavior. Integration fixtures must use the guarded local test database, unique identities and cleanup restricted to those fixtures. Do not point tests at a user's development or production database.

Keep database, storage, mail and provider secrets out of the web runtime. Treat files and provider responses as untrusted. Preserve archive budgets, scanner policy, subprocess bounds and quote/source validation. Never log raw document/model content or arbitrary validation errors. Keep cleanup outbox writes atomic with database deletion and lease checks atomic with job publication.

Add committed Prisma migrations for new-platform schema changes. Do not silently replace them with `db push`, alter the legacy schema, or migrate accounts/data as a side effect of startup.

## Verification

Run platform unit/PostgreSQL tests from `services/platform`, proxy/browser checks from `frontend`, TypeScript for both packages, frontend ESLint, formatting and a standalone production web build using [TESTING.md](docs/TESTING.md). Run legacy tests and lint when shared frontend or legacy behavior is affected. Report skipped/unavailable checks honestly and preserve visible warnings until explicitly addressed.

Never commit `.env`, credentials, private uploads, real student records or provider responses. Keep examples clearly local and fixtures visibly synthetic. Update the operator/security/privacy documentation when behavior or configuration changes. Production deployment, external service calls and destructive data changes require their own authorized task; they are not implied by a pull request.
