# Testing

## Local verification — October 1, 2026

These results describe local checks of the distributed refactor. They do not establish a completed hosted CI/release run, registry publication, public deployment, penetration test, load test or accessibility certification.

| Check                               | Observed evidence                                                                                                                                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform unit tests                 | 37 passed: domain grading, authentication/permissions, HTTP transport, document/provider boundaries, storage/staging and worker roles                                                                       |
| Web proxy unit tests                | 13 passed against real local HTTP servers: cookies, Origin, default/trusted forwarding, spoofed headers, query/body fidelity, limits, timeouts, redirects and runtime destination settings                  |
| PostgreSQL integration              | 33 passed: ownership, immutable snapshots, concurrent starts/saves/submissions, clock/replica behavior, worker leases, ingestion, cleanup, banks and review                                                 |
| Chromium browser tests              | 18 passed on desktop/mobile through separate API and standalone web processes: six real server-backed journeys/boundary cases, eight platform fixture cases and four legacy cases                           |
| Legacy tests                        | 16 unit/controller tests and one isolated MongoDB persistence test passed                                                                                                                                   |
| TypeScript and production web build | Passed; 16 existing legacy frontend lint warnings remain visible                                                                                                                                            |
| Shared S3 integration               | 1 passed against private SeaweedFS: cross-process ingestion, anonymous denial, deletion and retry                                                                                                           |
| Container and registry checks       | Four local ARM64 images built; distributed stack healthy with two ingestion replicas; real upload/extraction/mail/deletion smoke passed. Published digests are verified separately by the release workflow. |

Browser journeys create synthetic accounts, build quizzes through the UI, recover answers after refresh, submit for server grades, persist theme selection, and connect instructor courses to student assessments. Fixture cases test UI behavior with synthetic responses; they do not prove backend correctness. Real PostgreSQL cases independently cover that boundary. Existing desktop/mobile light/dark captures were inspected for legibility and overflow, but no complete WCAG or screen-reader matrix has been run.

## API, domain and database checks

Install the independent packages as described in [DEPLOYMENT.md](DEPLOYMENT.md). Start local PostgreSQL, then create the isolated test database once from the repository root:

```sh
docker compose up -d postgres
docker exec quizbee-v2-postgres createdb -U quizbee quizbee_v2_test
```

If that database already exists, leave it in place. Never substitute the interactive database. Run platform checks in a subshell so test database settings do not leak into later interactive commands:

```sh
(
  cd services/platform
  export PLATFORM_DATABASE_URL='postgresql://quizbee:quizbee_local_only@127.0.0.1:55439/quizbee_v2_test?schema=public'
  npm run db:generate
  npm run db:migrate
  npm test
  npm run test:integration
  npm run typecheck
  npm run format:check
)
```

Integration tests reject databases outside localhost/127.0.0.1 port 55439 named `quizbee_v2_test`. They use unique synthetic identities and fixture-only cleanup. The suite runs serially because cleanup tests share an outbox. Separate process/replica cases exercise the real HTTP boundary, database clock and durable worker claims rather than method-call mocks.

## Web checks and browser journeys

Stop any local API on 4010 or web on 3018 before browser tests. Also stop Next development processes before a production build: both use `.next` output. From the repository root:

```sh
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run format:check --prefix frontend
npm run build --prefix frontend
(cd frontend && npx playwright install chromium)
npm run test:e2e --prefix frontend
```

Playwright starts two independent processes: the platform API on loopback 4010 with the guarded test database, and the standalone web on loopback 3018. Only the API receives the database setting. The web launcher allows frontend/OS runtime settings, copies generated static/public assets into the standalone output, and starts its server. `QUIZBEE_E2E_DATABASE_URL` may override the default only within the same local test-database guard. `PLAYWRIGHT_BASE_URL` must remain a loopback port-3018 origin.

Projects use desktop Chromium and iPhone-sized Chromium emulation, not physical iPhone hardware or WebKit. Screenshots in `.impeccable/review` are ignored local QA artifacts. Proxy tests use real internal HTTP servers and do not require a database.

## Shared object-storage check

`services/platform/tests/storage/shared-storage.test.ts` uses a private local S3-compatible service and separate API/worker directories. It checks cross-directory ingestion, anonymous-read denial, private chunks, durable deletion retries and account cleanup. Start the overlay's `objectstore-init` service to initialize the dedicated `quizbee-storage-test` bucket. See [STORAGE.md](STORAGE.md) for exact storage prerequisites.

```sh
docker compose -f compose.yaml -f compose.distributed.yaml up --build -d objectstore-init
(
  cd services/platform
  export PLATFORM_DATABASE_URL='postgresql://quizbee:quizbee_local_only@127.0.0.1:55439/quizbee_v2_test?schema=public'
  export S3_ENDPOINT='http://127.0.0.1:18333'
  export S3_BUCKET='quizbee-storage-test'
  export S3_REGION='us-east-1'
  export AWS_ACCESS_KEY_ID='quizbee-local-app'
  export AWS_SECRET_ACCESS_KEY='quizbee-local-app-only'
  npm run test:storage
)
```

Those are the overlay's disclosed local fixture credentials. The test refuses a different database, endpoint or bucket, generates its own prefix, and deletes only its fixture keys/rows. A passing local S3 check does not verify a cloud bucket policy, version-retention policy or production service.

Provider tests use local HTTP fixtures. No paid/live AI provider, production SMTP delivery or actual malware engine is established by these tests. Scanner environment/staging checks do not constitute a malware scan or OS sandbox validation.

## Interactive local smoke

With the local overlay running, or host web/API/development worker plus Mailpit:

```sh
npm run test:local --prefix frontend
```

This creates a synthetic account, uploads Markdown through the real multipart route, waits for ingestion, reads private chunks, requests verification/reset mail through local SMTP, then deletes the account. It deliberately uses the disclosed local scanner bypass. Do not point this check at external SMTP.

## Legacy and repository checks

```sh
npm test --prefix backend
npm run lint --prefix backend
npm audit --omit=dev --prefix backend
npm audit --omit=dev --prefix frontend
npm audit --omit=dev --prefix services/platform
python3 scripts/check_secrets.py
```

Dependency audits and heuristic secret checks are point-in-time evidence; report actual results separately. The legacy persistence check requires an isolated MongoDB replica set:

```sh
docker run --rm -d --name quizbee-local-tests -p 127.0.0.1:27028:27017 mongo:7.0 --replSet rs0 --bind_ip_all
docker exec quizbee-local-tests mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' backend/node_modules/.bin/prisma db push --schema backend/prisma/schema.prisma
QUIZBEE_TEST_DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' npm run test:integration --prefix backend
docker stop quizbee-local-tests
```

Wait for MongoDB to accept connections before initiating the replica set. Use a separate interactive database; never aim these tests at user or production records. Hosted workflow results and release image evidence must be verified independently before claiming a release passed.
