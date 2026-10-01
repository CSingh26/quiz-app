# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci && npm run build && npm prune --omit=dev
COPY backend/ ./

FROM node:24-bookworm-slim@sha256:0e0ff40c39bc087845bfb27465a0df4ea419520094bc35842ff83dd8cbe6f9b6 AS legacy
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3876
ARG VERSION=development
ARG REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/CSingh26/quiz-app" org.opencontainers.image.title="QuizBee legacy API" org.opencontainers.image.description="Preserved Express and MongoDB QuizBee compatibility service" org.opencontainers.image.licenses="MIT" org.opencontainers.image.version=$VERSION org.opencontainers.image.revision=$REVISION
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3876
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "const net=require('node:net');const s=net.connect(3876,'127.0.0.1',()=>{s.end();process.exit(0)});s.setTimeout(3000,()=>process.exit(1));s.on('error',()=>process.exit(1))"]
CMD ["node", "index.js"]
