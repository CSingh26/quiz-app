# Distributed release implementation record

The initial eight-push outline was consolidated where API, storage, worker and CI changes shared dependencies. The user's requested range is five to ten pushes. Nine pushes completed the implementation, publication and post-release evidence. The hosted browser check caught a workspace-root packaging issue before publication.

1. `2f85372` — tested v2 study and assessment baseline; pushed.
2. `a10592a` — independent web/API/workers, private shared storage, database clock, container runtime and CI; pushed.
3. `a17898f` — validated client identity behind explicitly trusted ingress; pushed.
4. `b4c9322` — bounded asynchronous physical deletion during storage outages; pushed.
5. `438c0b6` — version metadata, gated GHCR/release automation and corrected isolated CI S3 binding; pushed.
6. `8506b31` — documentation and local verification record; pushed.
7. `fd51cb1` — pin the frontend standalone tracing root and isolate browser-test storage; hosted quality gate passed.
8. Published the verified branch tip to main and the v2.0.0-rc.1 tag in one atomic push after confirming main was unchanged.
9. Recorded completed publication, anonymous pulls, attestations and runtime smoke of the released images.

Completed implementation checks: independent Node HTTP transport and web gateway, no platform dependency/credentials in web, private S3 ingestion across separate processes, scanner/parser environment filtering and staging cleanup, PostgreSQL clock authority after locks, API replica/concurrency cases, role-specific workers, stale-lease fencing, health and graceful shutdown, four non-root images, two ingestion replicas, and real local upload/extraction/mail/deletion smoke.

Publication checks completed: successful hosted workflow, exact image digests, both architectures, anonymous pulls, public package visibility and local runtime checks. Existing PostgreSQL/object-storage volumes were preserved. No public application deployment was performed. See [release verification](../../RELEASE_VERIFICATION.md).

Never conceal failed checks to meet the push-count range. Hosted evidence and immutable image records are attached to the GitHub release rather than asserted from workflow definitions alone.
