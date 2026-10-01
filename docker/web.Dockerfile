# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3876/api/
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS web
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG VERSION=development
ARG REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/CSingh26/quiz-app" org.opencontainers.image.title="QuizBee web" org.opencontainers.image.description="QuizBee study interface and same-origin API gateway" org.opencontainers.image.licenses="MIT" org.opencontainers.image.version=$VERSION org.opencontainers.image.revision=$REVISION
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY docker/healthcheck.mjs /app/healthcheck.mjs
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["node", "healthcheck.mjs", "http://127.0.0.1:3000/api/health"]
CMD ["node", "server.js"]
