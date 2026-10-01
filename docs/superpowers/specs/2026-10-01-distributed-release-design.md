# Distributed QuizBee release design

## Intent and scope

The user requests a non-monolithic distributed system, Docker images, five to ten repository pushes, a versioned release, GHCR publication, and a new repository description. This authorizes publishing source, packages and release metadata. It does not request a public application deployment. Existing local data and legacy quiz behavior must survive.

The selected architecture has independently deployable web, API and worker runtimes. Workers may specialize in ingestion or generation and run concurrently. PostgreSQL remains the atomic transaction boundary for assessment state, sessions and durable jobs. Splitting those transactions among additional RPC services would lose current grading and quota guarantees without serving this scope. This is a distributed service architecture with a shared transactional database, not a claim of database-per-service microservices.

## Components and interfaces

- `frontend`: Next.js UI and a bounded same-origin HTTP proxy. It owns no Prisma client, grading code, database credentials or provider credentials. The browser contract stays `/api/v2`.
- `services/platform`: framework-independent Request/Response API, assessment/domain services, Prisma schema and tests. A standalone Node HTTP server exposes the API plus liveness/readiness endpoints. The internal API is not published by the default Compose configuration.
- Worker runtime: separately deployable process/image, role-filtered durable job claims, lease heartbeats, stale-worker fencing, retries, graceful shutdown and health status. Generation and ingestion workers can scale independently.
- PostgreSQL: transactions, immutable assessment versions, server-authoritative timestamps, shared rate limits and the job queue. Migrations run as a one-shot service before API/worker startup.
- S3-compatible private storage: API uploads and workers read the same private objects across hosts. Local storage remains available for development and existing tests. Compose supplies a private local object store and one-shot bucket initialization.
- Extraction: download/stage one immutable object snapshot into worker-private temporary storage, scan and parse that snapshot, clean it in `finally`. The child receives a restricted environment without database, provider or object-store secrets. Process limits are not described as a complete OS sandbox.
- Legacy Express/MongoDB remains optional and separately packaged. No automatic conversion or deletion of legacy data.

## Network, failure and security contracts

The public web proxy forwards only `/api/v2`, cookies, content type and the original Origin; it removes untrusted forwarding headers, caps upload bodies and uses a timeout. It never accepts a user-selected backend URL. The API retains exact Origin validation, HttpOnly sessions, ownership queries, strict validation and bounded responses. API failure produces a controlled unavailable state, never an in-process fallback.

Authoritative eligibility, deadlines and job leases use database time at the relevant lock/transaction boundary. Stateless API replicas share PostgreSQL sessions and limits. Workers use SKIP LOCKED and fenced publication; delivery is at least once, while transactional effects are protected against duplicates. No exactly-once network delivery is promised.

Objects are never public or embedded in database rows. Physical deletion uses the existing transactional outbox. Worker shutdown stops claiming new work; crashed workers become reclaimable after the lease. Health and logs contain operational state, not source text or credentials.

## Images and release

Multi-stage, non-root images package web, API, worker and legacy API, with health checks and OCI source/version/revision labels. Docker build contexts exclude environment files, private documents, Git data and dependency directories. Compose supports a fully local stack and preserves existing PostgreSQL storage; no cloud host is provisioned.

Seven meaningful implementation pushes precede a final main/tag publication push (eight total). Version defaults to `v2.0.0-rc.1`, reflecting the first distributed release and remaining live-provider/operational validation. GHCR images use version and source-SHA tags; release candidates do not overwrite `latest`. A release workflow validates code before building/publishing Linux amd64/arm64 images and attaches digest/provenance evidence. Publishing uses narrowly scoped GitHub workflow permissions.

Repository description: “QuizBee: distributed AI study and assessment platform with independent web, API and workers, secure timed quizzes, Docker images and GHCR releases.”

## Verification and tradeoffs

Preserve domain, integration, browser and legacy checks. Add real HTTP transport/proxy tests, shared object-storage tests, competing-worker and replica recovery checks, clock-skew regressions, container startup/health checks and image pull verification. Run independent review before the release. Verify hosted CI and published artifacts rather than equating a workflow file with a successful release.

The shared database remains a deliberate availability/coordination dependency. Local Compose is not production orchestration. Object-store policy, backups, real malware scanning, external AI provider quality and public-host hardening remain operator responsibilities and must be explicit in release notes.
