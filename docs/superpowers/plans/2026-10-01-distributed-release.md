# Distributed release implementation plan

Execution: root coordinates service extraction, transport, container integration and release; independent agents own storage and timing improvements; a fresh reviewer checks the result. Preserve the current `codex/quizbee-v2` working branch and all verified local rebuild changes.

## Push 1 — tested v2 baseline
- [ ] Record the existing verified product rebuild and distributed design.
- [ ] Run baseline unit tests and secret/diff checks, commit and push the branch.

## Push 2 — standalone API boundary
- [ ] Move domain/server/Prisma and service tests to `services/platform`, preserving migrations and private data.
- [ ] Replace Next server objects with standard Request/Response and add bounded Node HTTP transport, health and shutdown.
- [ ] Replace the web route with a same-origin proxy; remove server-only dependencies from web.
- [ ] Update local/E2E startup and CI paths; test separate API and web processes.

## Push 3 — shared private storage
- [ ] Add S3-compatible storage and local fallback with bounded reads/idempotent deletion.
- [ ] Stage/scan/parse one object snapshot; strip parser credentials and clean temporary files.
- [ ] Test real shared-bucket upload/processing/deletion and failure behavior.

## Push 4 — distributed correctness
- [ ] Use PostgreSQL time for authoritative decisions and leases.
- [ ] Support worker job roles, concurrent workers, heartbeat health, shutdown and recovery.
- [ ] Test clock skew, API replicas, competing claims and stale-worker publication.

## Push 5 — Docker runtime
- [ ] Create non-root multi-stage web/API/worker/legacy images and clean contexts.
- [ ] Add local Compose stack, object-store initialization, migration job and private networks.
- [ ] Build/run containers and exercise real proxy/API/worker/storage paths.

## Push 6 — GHCR automation
- [ ] Add version metadata, validated release publishing, immutable image tags, SBOM/provenance and digests.
- [ ] Verify CI and publication configuration without embedding credentials.

## Push 7 — reviewed release candidate
- [ ] Update architecture, local setup, distributed guarantees, release notes, limitations and testing evidence.
- [ ] Complete independent review and final relevant checks; commit and push.

## Publication push 8
- [ ] Fast-forward main only after checking for remote changes; publish the selected version tag.
- [ ] Verify hosted quality checks, publish GHCR images and a GitHub release, update repository description/topics.
- [ ] Pull/inspect released images and provide exact release/package links and remaining limitations.

If necessary bug fixes consume an additional push, keep the total within the user's five-to-ten range where practical; never conceal failed checks to meet a count.
