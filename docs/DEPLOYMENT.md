# Local operation and future deployment requirements

This repository has been worked on locally. No production deployment, DNS change, external email rollout, live AI credential configuration or data migration is implied by this guide.

## Local setup

Install Node.js 24 (minimum 22.13 for PDF.js) and Docker Compose. From the repository root:

```sh
docker compose up -d
cp frontend/.env.example frontend/.env
cd frontend
npm ci
npm run db:generate
npm run db:migrate
npm run dev:platform
```

The web app is [localhost:3018](http://localhost:3018). Register your own account; there is no seeded user. The Compose database uses deliberately local-only credentials and binds port 55439 to loopback. Its named volume persists data when containers restart.

Start a second terminal in `frontend`:

```sh
NODE_ENV=development npm run worker
```

For one maintenance pass and at most one queued job:

```sh
NODE_ENV=development npm run worker -- --once
```

The worker must remain running for background extraction, generation, abandoned-attempt cleanup and durable file deletion. It checks maintenance at startup and loop boundaries at least 60 seconds apart; work in progress can delay a sweep. Graceful termination finishes the active unit of work. A crashed worker's lease becomes reclaimable.

Compose also starts local Mailpit on SMTP port 1025 and [the inbox at localhost:8025](http://localhost:8025). Verification and reset requests are delivered to this inbox, not the public Internet. Tokens last 30 minutes and are single-use. SMTP configuration does not automatically make email verification mandatory for login.

## Configuration

| Setting | Meaning |
| --- | --- |
| `PLATFORM_DATABASE_URL` | New PostgreSQL database; never a MongoDB URL |
| `APP_ORIGIN` | Exact browser origin for unsafe requests and account links |
| `PRIVATE_STORAGE_DIR` | Private storage shared by web and worker; relative paths resolve from their working directory |
| `MALWARE_SCAN_COMMAND` | ClamAV-compatible executable path; scanner failure prevents extraction |
| `ALLOW_UNSCANNED_UPLOADS` | Explicit nonproduction local bypass; production refuses it |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | All required for optional generation; no keys are supplied |
| `SMTP_HOST`, `SMTP_PORT`, `MAIL_FROM` | SMTP delivery configuration |
| `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` | Optional SMTP TLS/authentication settings |
| `TRUST_PROXY` | Trust forwarded client addresses only behind a controlled proxy that overwrites that header |
| `ALLOW_LOCAL_HTTP` | Explicit loopback-only HTTP allowance for testing a production build; never public operation |
| `NEXT_PUBLIC_API_BASE_URL` | Legacy Express API URL with trailing slash; unrelated to new API routing |

Keep local environment files untracked. Match `APP_ORIGIN` to the URL in the address bar, including scheme and port. If using `http://127.0.0.1:3018`, change the origin from `localhost` accordingly. Use the same settings and working directory for web and worker. A mismatched origin intentionally rejects mutations.

When `TRUST_PROXY` is false, unauthenticated request limiting uses a shared direct-client bucket. Do not enable proxy trust merely to change the limiter: a public client must not be able to supply its own trusted forwarding header.

## Build and inspect locally

```sh
cd frontend
npm run build
npm run start -- -H 127.0.0.1 -p 3018
```

The example's `ALLOW_LOCAL_HTTP=true` permits this loopback-only production-build check. Production-mode uploads still require a real malware scanner. Use the development web server and development worker when testing the explicit unscanned local workflow. `AI_BASE_URL` and SMTP settings are server configuration; the legacy public API URL is embedded in the frontend build.

To stop local services while retaining their data:

```sh
docker compose stop
```

Do not remove the named PostgreSQL volume unless you intentionally want to erase its local data. Tests use a separate guarded database; see [TESTING.md](TESTING.md).

## Before any future public deployment

Provision HTTPS, a restricted database role, private shared/object storage, a real scanner, restricted parser processes, secret management, worker supervision, backups and restore tests. The current parser subprocess inherits credentials and is not an OS sandbox. A new-platform object-storage adapter is not implemented.

Pin and review container images; the local Compose file is not a hardened deployment specification. Establish operational monitoring for failed jobs and cleanup backlog, a retention/deletion policy, SMTP abuse/deliverability controls and provider data-handling terms. Review the legacy pages as part of the same browser origin, or serve them on a separate origin; URL prefixes alone do not isolate their security exposure.

Run committed migrations before starting compatible application code. Back up both database and private files, and rehearse migration and restore on disposable copies. There is no automatic rollback migration or legacy data importer. [SECURITY.md](../SECURITY.md), [PRIVACY.md](PRIVACY.md) and [LIMITATIONS.md](LIMITATIONS.md) describe further boundaries.
