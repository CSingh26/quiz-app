# Testing

## Local verification — September 30, 2026

The rebuild is verified locally; this is not evidence of a completed hosted CI run, penetration test, load test, accessibility certification, or public deployment.

| Check | Evidence |
|---|---|
| Platform unit tests | 26 passed; schema/grading for all nine types, auth/origin/permissions, archive safety, document formats and validated provider transport |
| PostgreSQL integration | 24 passed; ownership, immutable versions, race-safe starts/saves/submissions, expiry, question banks, file processing, generation fencing, account/session cleanup and manual review |
| Chromium browser tests | 18 passed across desktop and mobile; six real server-backed journeys/boundary cases, eight platform fixture cases, four preserved legacy cases |
| Local HTTP smoke | Passed: multipart upload, development worker extraction, private chunks, local SMTP acceptance for verification/reset, and fixture account deletion |
| Legacy unit/controller tests | 16 passed; isolated MongoDB persistence test also passed (1 test) |
| TypeScript and production build | Passed; 16 existing warnings remain in legacy frontend files, none suppressed |
| Formatting and migrations | New platform formatting checked; Prisma schema valid and all three migrations applied locally |
| Dependency checks | Frontend and backend full dependency audits passed with zero reported vulnerabilities |
| Secret patterns | Non-ignored tracked and new repository files scanned without printing matched values; heuristic coverage only |

Real browser journeys register isolated synthetic accounts, create quizzes through the UI, recover answers after refresh, submit and read server grades, exercise theme persistence, and connect instructor courses to enrolled student assessments. Each account is deleted afterward. Question-control fixtures explicitly use synthetic responses; they do not establish backend correctness by themselves. PostgreSQL tests cover that boundary independently.

Fresh review found and prompted regression coverage for stale-password session creation, file cleanup after account deletion, private provider error values, source deletion during publication, and attempt deletion during maintenance. The maintenance regression first reproduced NOT_FOUND after a real account cascade; the fix skips only that expected error and preserves database failures.

Desktop/mobile light and dark captures were inspected for layout, legibility, overflow and working controls. Keyboard/native form semantics, visible focus and reduced motion are implemented. No complete WCAG 2.2 AA audit or screen-reader matrix has been run.

## Platform checks

Install dependencies and start local Compose services as in [DEPLOYMENT.md](DEPLOYMENT.md). Create a separate test database once; never substitute the interactive database:

```sh
docker exec quizbee-v2-postgres createdb -U quizbee quizbee_v2_test
cd frontend
export PLATFORM_DATABASE_URL='postgresql://quizbee:quizbee_local_only@127.0.0.1:55439/quizbee_v2_test?schema=public'
npm run db:generate
npm run db:migrate
npm test
npm run test:integration
npm run typecheck
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

The create-database command reports an error if the database already exists; leave the existing test database in place. Integration tests reject any address other than localhost/127.0.0.1 on port 55439 with database name `quizbee_v2_test`. They create unique synthetic records and clean up those records. The suite is intentionally serial because storage-cleanup tests exercise a shared cleanup outbox.

Playwright starts a production server bound to loopback on port 3018 against the guarded test database. Stop a development server using that port before running it. Stop Next development processes before building: development and production share `.next` output. Default browser projects use Chromium desktop and iPhone-sized mobile emulation, not a physical iPhone or WebKit. Browser screenshots under `.impeccable/review` are local ignored QA artifacts.

Provider tests use a local HTTP fixture to exercise the actual adapter and worker. No paid/live AI provider was configured or called. Malware scanner integration and OS parser isolation remain unverified; the explicit development bypass is not a malware scan. No scanned-PDF OCR exists.

## Interactive local smoke check

With the development server, development worker and Mailpit running (as in DEPLOYMENT.md):

```sh
cd frontend
npm run test:local
```

This creates its own synthetic account, uploads a Markdown source through the real multipart HTTP boundary, waits for the worker, reads private source chunks, requests verification/reset emails through local SMTP, and deletes its own account afterward. It is separate from CI because it intentionally exercises the explicitly enabled development scanner bypass. Do not configure external SMTP for this local check.

## Legacy checks

```sh
npm test --prefix backend
npm run lint --prefix backend
npm audit --omit=dev --prefix backend
npm audit --prefix frontend
python3 scripts/check_secrets.py
```

The legacy persistence test needs an isolated MongoDB replica set. It checks atomic imports, server grading, linked-module deletion protection and rollback after an injected leaderboard failure:

```sh
docker run --rm -d --name quizbee-local-tests -p 127.0.0.1:27028:27017 mongo:7.0 --replSet rs0 --bind_ip_all
docker exec quizbee-local-tests mongosh --quiet --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' backend/node_modules/.bin/prisma db push --schema backend/prisma/schema.prisma
QUIZBEE_TEST_DATABASE_URL='mongodb://127.0.0.1:27028/quizbee_portfolio_test?replicaSet=rs0&directConnection=true' npm run test:integration --prefix backend
docker stop quizbee-local-tests
```

Wait until the container accepts connections before initiating the replica set. CI pins the image digest and performs this readiness check automatically. Use a separate local development database for interactive work; never aim integration tests at production data.
