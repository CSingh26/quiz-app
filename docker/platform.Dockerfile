# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS dependencies
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY services/platform/package.json services/platform/package-lock.json ./
COPY services/platform/prisma ./prisma
RUN npm ci && npm run db:generate
COPY services/platform/tsconfig.json ./
COPY services/platform/src ./src
RUN npm run typecheck && npm prune --omit=dev

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production API_HOST=0.0.0.0 PORT=4010 WORKER_HEALTH_HOST=0.0.0.0 WORKER_HEALTH_PORT=8081
ARG VERSION=development
ARG REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/CSingh26/quiz-app" org.opencontainers.image.licenses="MIT" org.opencontainers.image.version=$VERSION org.opencontainers.image.revision=$REVISION
COPY --from=dependencies --chown=node:node /app /app
COPY docker/healthcheck.mjs /app/healthcheck.mjs
COPY docker/s3-init.mjs /app/scripts/s3-init.mjs
USER node

FROM runtime AS api
LABEL org.opencontainers.image.title="QuizBee API" org.opencontainers.image.description="Standalone QuizBee authentication, assessment and course API"
EXPOSE 4010
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["node", "healthcheck.mjs", "http://127.0.0.1:4010/readyz"]
CMD ["node", "--import", "tsx", "src/api/run.ts"]

FROM runtime AS worker
LABEL org.opencontainers.image.title="QuizBee worker" org.opencontainers.image.description="Distributed QuizBee ingestion and AI generation worker"
EXPOSE 8081
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["node", "healthcheck.mjs", "http://127.0.0.1:8081/readyz"]
CMD ["node", "--import", "tsx", "src/server/jobs/run.ts"]
