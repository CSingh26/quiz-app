# QuizBee 2.0

QuizBee is a local study and assessment platform with private quizzes, versioned question banks, document ingestion, resumable attempts, and instructor courses. Grades and deadlines are enforced by the server. Written responses remain pending until an instructor or an authorized practice self-review supplies a grade.

The new application uses Next.js, TypeScript, Prisma and PostgreSQL. Its API is `/api/v2`, and its workspace is `/study`. The original Express/MongoDB application remains in `backend/` with its existing dashboard routes; it uses a separate database and authentication system.

## What works

- Register your own student or instructor account, sign in, manage sessions, and request account email through configured SMTP.
- Create private quizzes, keep immutable versions, and maintain private banks with folders, question metadata and random practice sampling.
- Take nine question types with saved answers, stable question order, server deadlines, revision conflict checks and idempotent submission. Review results and create a practice quiz from mistakes.
- Create courses, join by code, assign a fixed quiz version, set attempt limits and optional access codes, review grades, and export results as CSV.
- Upload PDF, DOCX, TXT, Markdown, CSV, XLSX, PPTX or ZIP materials for background extraction into traceable source chunks.
- Request source-cited quiz generation when an OpenAI-compatible provider is configured. Without provider settings, generation is explicitly unavailable; there are no simulated generated quizzes.

This delivery is for local testing. It has not been deployed or certified for production, proctoring, regulatory compliance, or high-stakes examinations. [Current limits](docs/LIMITATIONS.md) distinguish working features from extensions.

## Run the new platform locally

Use Docker Compose and Node.js 24; PDF extraction requires at least Node.js 22.13. From the repository root:

```sh
docker compose up -d
cp frontend/.env.example frontend/.env
cd frontend
npm ci
npm run db:generate
npm run db:migrate
npm run dev:platform
```

Open [QuizBee](http://localhost:3018) and register your own account. No demo user or administrator password is supplied. Keep `APP_ORIGIN=http://localhost:3018` aligned with the hostname and port you actually open; `localhost` and `127.0.0.1` are different origins.

In a second terminal:

```sh
cd frontend
NODE_ENV=development npm run worker
```

The worker processes files and generation jobs, expires abandoned timed attempts, retries file deletion, and prunes expired sessions and tokens. The example configuration explicitly permits **unscanned local development uploads**. Production refuses that bypass and requires a configured scanner. Keep web and worker processes pointed at the same database and private storage directory.

Compose starts PostgreSQL on loopback port 55439 and Mailpit SMTP on 1025. Inspect local verification/reset messages at [Mailpit](http://localhost:8025). AI credentials are empty by default. Setup, configuration and service limitations are detailed in [the operator guide](docs/DEPLOYMENT.md).

## Verification and design

```sh
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Database and browser tests have additional isolated-service requirements; use [TESTING.md](docs/TESTING.md) for the current commands and evidence. Tests use clearly labeled fixtures; external AI and malware services are not assumed to have been exercised.

[Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) · [AI pipeline](docs/AI_PIPELINE.md) · [Document processing](docs/DOCUMENT_PROCESSING.md) · [Assessment integrity](docs/ASSESSMENT_INTEGRITY.md) · [Privacy](docs/PRIVACY.md) · [Security](SECURITY.md)

## Run the preserved legacy application

Legacy routes are `/login/student`, `/login/instructor`, `/register`, `/dashboard/student` and `/dashboard/instructor`. They call the Express service through `NEXT_PUBLIC_API_BASE_URL`, whose trailing slash is required. This setting does not configure the new `/api/v2` API.

Use a separate MongoDB replica set, copy `backend/.env.example` to `backend/.env`, and fill local settings. Generate an instructor bcrypt hash for `ADMIN_PWD`; do not enter a plaintext password there. S3 configuration is optional and used only for legacy profile images.

```sh
npm ci --prefix backend
cd backend
npm run build
npx prisma db push
npm run dev
```

The legacy API defaults to port 3876. In another terminal, run `npm run dev --prefix frontend` and open a legacy route at [localhost:3000](http://localhost:3000/login/student). Set `APP_ORIGIN` to the port you use if also testing the new workspace there. MongoDB setup and legacy checks remain in [TESTING.md](docs/TESTING.md). No automatic data or credential migration connects the two applications.
