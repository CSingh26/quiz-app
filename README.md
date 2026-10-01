# QuizBee 2.0

QuizBee is a study and assessment platform with private quizzes, versioned question banks, document ingestion, resumable attempts and instructor courses. The API enforces grades and deadlines. Written responses remain pending until an instructor or an authorized practice self-review supplies a grade.

The application has independent Next.js web, Node.js API and background worker processes. API replicas and workers share PostgreSQL for transactional state and durable jobs, and private S3-compatible storage for uploaded originals. The browser API remains `/api/v2`; the workspace is `/study`. The original Express/MongoDB application remains in `backend/` with separate data and authentication.

## What works

- Register a student or instructor account, sign in, manage sessions, and request verification/reset mail through configured SMTP.
- Create private quizzes and banks with immutable versions, folders, question metadata and random practice sampling.
- Take nine question types with saved answers, stable order, server deadlines, revision conflict checks and idempotent submission. Review results and create a practice quiz from mistakes.
- Create courses, join by code, assign a fixed quiz version, set attempt limits and access codes, review grades, and export results as CSV.
- Upload PDF, DOCX, TXT, Markdown, CSV, XLSX, PPTX or ZIP materials for background extraction into traceable source chunks.
- Request source-cited generation when a compatible AI provider is configured. Missing configuration is reported; there are no simulated generated quizzes.

This work is verified locally. Public deployment, high-stakes examination suitability and regulatory compliance are not established. [Current limits](docs/LIMITATIONS.md) distinguish implemented behavior from remaining work.

## Run the local Docker stack

From the repository root, with Docker Compose available:

```sh
docker compose -f compose.yaml -f compose.distributed.yaml up --build -d
```

The overlay builds web, API and worker images locally; it does not require a published release. It starts PostgreSQL, private SeaweedFS S3 storage, Mailpit, one-shot schema/bucket setup, the API, and separate ingestion and generation workers. Open [QuizBee](http://localhost:3018) and register your own account. Inspect local verification/reset mail in [Mailpit](http://localhost:8025). No demo account or administrator password is seeded.

**The local ingestion worker explicitly bypasses malware scanning in development mode.** The application images default to production and refuses that bypass; a real scanner is required for production ingestion. AI generation is off by default. The overlay uses disclosed local credentials and loopback ports and is not a public hosting specification.

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for host-process development, configuration, health checks, optional generation and persistent-volume handling. All platform API/worker database commands now run in `services/platform`, not `frontend`.

## Verification and release status

The current local checks include 37 platform unit tests, 13 real-HTTP proxy tests, 33 PostgreSQL integration tests and 18 desktop/mobile browser cases. Legacy checks remain separate. [TESTING.md](docs/TESTING.md) records commands and exact verification scope.

Release candidate image names are `ghcr.io/csingh26/quizbee-web:2.0.0-rc.1`, `ghcr.io/csingh26/quizbee-api:2.0.0-rc.1`, `ghcr.io/csingh26/quizbee-worker:2.0.0-rc.1` and `ghcr.io/csingh26/quizbee-legacy:2.0.0-rc.1`. These are intended release coordinates; publication, registry pulls and hosted release verification are not yet confirmed here.

[Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) · [Shared storage](docs/STORAGE.md) · [AI pipeline](docs/AI_PIPELINE.md) · [Document processing](docs/DOCUMENT_PROCESSING.md) · [Assessment integrity](docs/ASSESSMENT_INTEGRITY.md) · [Privacy](docs/PRIVACY.md) · [Security](SECURITY.md)

## Preserved legacy application

Legacy routes include `/login/student`, `/login/instructor`, `/register`, `/dashboard/student` and `/dashboard/instructor`. They call Express through the build-time `NEXT_PUBLIC_API_BASE_URL`, whose trailing slash is required. This setting does not configure `/api/v2`.

Use a separate MongoDB replica set, copy `backend/.env.example` to `backend/.env`, and fill local settings. Generate an instructor bcrypt hash for `ADMIN_PWD`; do not put a plaintext password there. Legacy S3 settings apply only to profile images.

```sh
npm ci --prefix backend
cd backend
npm run build
npx prisma db push
npm run dev
```

Express defaults to port 3876. In another terminal at the repository root, run `npm ci --prefix frontend` and `npm run dev --prefix frontend`, then open [the legacy login](http://localhost:3000/login/student). If using `/study` on the same web process, run the independent platform API and match its `APP_ORIGIN` to that browser origin. The distributed Compose overlay does not start legacy Express or MongoDB. There is no automatic data or credential migration between stacks.
