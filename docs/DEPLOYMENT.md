# Local operation and release preparation

This guide describes local operation of the independent web, API and worker processes. It does not establish a production deployment, published image, external email rollout or live AI configuration. API replicas and workers share PostgreSQL and private storage; they do not own separate databases.

## Local Docker overlay

From the repository root:

```sh
docker compose -f compose.yaml -f compose.distributed.yaml up --build -d
docker compose -f compose.yaml -f compose.distributed.yaml ps
```

The overlay builds local images and starts PostgreSQL, Mailpit, private SeaweedFS S3 storage, schema migration, bucket initialization, API, web, and separate ingestion/generation workers. Open [localhost:3018](http://localhost:3018) and register an account. No sample account is seeded. Mailpit's [local inbox](http://localhost:8025) receives verification/reset mail; it does not send it to the public Internet.

The web, database, object-store and mail host ports bind loopback. The API and worker health ports stay inside the Compose network. Application containers run as a non-root user with read-only roots, bounded temporary mounts, memory limits, dropped capabilities and no-new-privileges. PostgreSQL and object-store named volumes persist application data.

**This overlay is for local development.** It contains intentionally local credentials and sets the ingestion worker to `NODE_ENV=development` with `ALLOW_UNSCANNED_UPLOADS=true`. Production-mode ingestion refuses that bypass and requires a real scanner. Do not expose this configuration as a public deployment. Generation is off unless enabled explicitly with a working provider on the generation worker.

```sh
docker compose -f compose.yaml -f compose.distributed.yaml logs --tail=100 api ingestion generation web
docker compose -f compose.yaml -f compose.distributed.yaml stop
```

Stopping retains volumes. Removing PostgreSQL or object-store volumes erases data; it is not an ordinary restart step.

## Host-process development

Use Node.js 24 (minimum 22.13 for PDF.js) and Docker Compose. Stop the overlay's web/API/workers before reusing their ports or working against the same queue with host processes. Start PostgreSQL and Mailpit with `docker compose up -d`.

From the repository root, install each independent package and copy its example settings:

```sh
cp services/platform/.env.example services/platform/.env
cp frontend/.env.example frontend/.env
npm ci --prefix services/platform
npm ci --prefix frontend
cd services/platform
npm run db:generate
npm run db:migrate
npm run dev
```

The API defaults to `127.0.0.1:4010`. Keep `APP_ORIGIN=http://localhost:3018` aligned with the browser URL. `localhost` and `127.0.0.1` are different origins. Run the web from another terminal at the repository root:

```sh
npm run dev:platform --prefix frontend
```

Run the worker from a third terminal:

```sh
cd services/platform
NODE_ENV=development WORKER_KINDS=ingestion,generation npm run worker
```

For one maintenance pass and at most one job, append `-- --once`. For separate host workers, use `WORKER_KINDS=ingestion` and `WORKER_KINDS=generation`, with different `WORKER_HEALTH_PORT` values. Worker shutdown stops new claims and waits for active work; crashed leases can be reclaimed. Maintenance runs on loop boundaries and can be delayed by work in progress. Material/account deletion revokes database access and queues storage keys immediately; physical file removal requires a worker. Each sweep attempts at most five deletions concurrently, with durable retries after storage errors.

For a single-host local filesystem setup, every API/worker must resolve the same `PRIVATE_STORAGE_DIR`. Cross-host operation requires shared storage; use the S3 adapter described in [STORAGE.md](STORAGE.md). The Docker overlay supplies that adapter and creates the local buckets. Changing storage settings does not move existing objects.

## Configuration by process

| Process               | Settings and responsibility                                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web                   | Runtime `PLATFORM_API_URL` is an HTTP(S) API origin, default `http://127.0.0.1:4010`; no path, credentials, query or fragment. Optional `PLATFORM_API_TIMEOUT_MS` is 1–60000 ms, default 30000. `TRUST_PLATFORM_PROXY` defaults off; see the ingress prerequisite below. |
| Browser legacy client | `NEXT_PUBLIC_API_BASE_URL` is the legacy Express URL with a trailing slash, embedded at build time; it does not route v2.                                                                                                                                                |
| API                   | `API_HOST`, `PORT`, `APP_ORIGIN`, `PLATFORM_DATABASE_URL`, storage settings and optional SMTP settings. `UPLOADS_ENABLED` and `GENERATION_ENABLED` advertise capabilities without placing scanner/provider secrets on the API host.                                      |
| All workers           | The shared `PLATFORM_DATABASE_URL` and storage identity; `WORKER_KINDS`, `WORKER_HEALTH_HOST`, `WORKER_HEALTH_PORT` (default 8081).                                                                                                                                      |
| Ingestion worker      | `MALWARE_SCAN_COMMAND`, private scratch `STAGING_DIR`, and storage credentials. `ALLOW_UNSCANNED_UPLOADS` is a nonproduction local bypass only.                                                                                                                          |
| Generation worker     | `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`; all are required for provider calls. Keep provider secrets off the web.                                                                                                                                                         |
| Mail                  | API `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM`, optional `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`.                                                                                                                                                                         |

Keep environment files untracked. The service CLI loads `.env` from `services/platform`; the frontend environment contains only web/legacy URL settings. A generation capability flag is not a provider health check. See [AI_PIPELINE.md](AI_PIPELINE.md) and [STORAGE.md](STORAGE.md) for detailed settings.

Production authentication requires HTTPS. `ALLOW_LOCAL_HTTP=true` permits only loopback origins for local production-build checks. The proxy preserves browser Origin and strips forwarding/identity headers. By default, web strips forwarding headers and API `TRUST_PROXY=false` uses a shared unauthenticated direct-client bucket. Distinct client-IP buckets require both web `TRUST_PLATFORM_PROXY=true` and API `TRUST_PROXY=true`. Enable them only when a controlled ingress overwrites `x-forwarded-for` with exactly one validated client IP and direct public access to web is blocked. Do not enable trusted mode on a publicly reachable web port or forward a caller-supplied header unchanged.

Verification/reset links are single-use and expire after 30 minutes. SMTP configuration does not make email verification mandatory for login.

## Health and standalone builds

- Web `GET /api/health` is local liveness and requires no database or API connection.
- API `GET /healthz` is process liveness; `GET /readyz` checks PostgreSQL readiness.
- Worker `GET /healthz` reports progress and role; `GET /readyz` also checks PostgreSQL. The host default is loopback port 8081.

Build the web with `npm run build --prefix frontend`. Docker copies the generated `.next/standalone`, `.next/static` and `public` files and runs `node server.js`. The browser-test launcher mirrors that standalone layout on loopback port 3018; see [TESTING.md](TESTING.md). The API and worker use their own service package and image, independently of the web build.

## Release candidate images

The release workflow publishes these versioned coordinates after quality checks pass:

- `ghcr.io/csingh26/quizbee-web:2.0.0-rc.1`
- `ghcr.io/csingh26/quizbee-api:2.0.0-rc.1`
- `ghcr.io/csingh26/quizbee-worker:2.0.0-rc.1`
- `ghcr.io/csingh26/quizbee-legacy:2.0.0-rc.1`

Use the [GitHub release](https://github.com/CSingh26/quiz-app/releases/tag/v2.0.0-rc.1) and its digest assets to confirm the published revision. The local overlay builds images itself and defaults to `local`. To evaluate published images locally once the release is available:

```sh
export QUIZBEE_VERSION=2.0.0-rc.1
docker compose -f compose.yaml -f compose.distributed.yaml pull
docker compose -f compose.yaml -f compose.distributed.yaml up -d --no-build --wait
```

Private packages require registry login with an account that has package read access. Legacy remains a separate Express/MongoDB service and is not started by this overlay. [RELEASING.md](RELEASING.md) describes tags, attestations and rollback boundaries.

## Before public operation

Provide HTTPS, runtime secrets, restricted database/storage identities, private bucket policy, a real scanner, OS-level parser restrictions, monitoring, backups and tested restores. Scanner/parser children receive filtered environments but retain worker filesystem/network privileges. Container hardening is not a complete parser sandbox.

Establish retention/deletion policy, SMTP abuse/deliverability controls and AI provider data-handling terms. Use the same storage identity across replicas; changing bucket/prefix is a data migration. Back up PostgreSQL and corresponding objects together. Run committed migrations before compatible API/worker code; no automatic down-migration or legacy data importer exists. Review legacy pages on the same browser origin or separate them explicitly.

Local tests and workflow definitions do not prove public load capacity, hosted CI success or registry publication. See [TESTING.md](TESTING.md), [PRIVACY.md](PRIVACY.md), [LIMITATIONS.md](LIMITATIONS.md) and [SECURITY.md](../SECURITY.md).
