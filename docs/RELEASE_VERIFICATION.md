# Release verification — v2.0.0-rc.1

Verified October 1, 2026. The [published prerelease](https://github.com/CSingh26/quiz-app/releases/tag/v2.0.0-rc.1) uses source revision `fd51cb13cda71af514020a1ecfee541705a18780`. Subsequent documentation commits do not change those released images.

The [release workflow](https://github.com/CSingh26/quiz-app/actions/runs/36856697537) and [main quality run](https://github.com/CSingh26/quiz-app/actions/runs/36856697424) succeeded. The quality gate covers 37 platform unit tests, 13 proxy tests, 33 PostgreSQL integration tests, one shared-S3 test, 18 browser tests, 16 legacy unit tests and one MongoDB integration test, plus type checks, formatting, lint, migrations, dependency audits, secret-pattern checks and container smoke.

## Published artifacts

| Image                                        | Immutable index digest                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| `ghcr.io/csingh26/quizbee-web:2.0.0-rc.1`    | `sha256:941bc3a410c51aaa0ccc871808e5f9b72dd2281930237f06817f0343b081d96d` |
| `ghcr.io/csingh26/quizbee-api:2.0.0-rc.1`    | `sha256:bc63d6ee6c90a32e34087b2fa956871f7ec8ba3b666eac5c88f505da6ae36196` |
| `ghcr.io/csingh26/quizbee-worker:2.0.0-rc.1` | `sha256:45287386cdcc8da2b01dd65a69556c37a7e21d3ac5abb871aa5bd9821ce3dc9a` |
| `ghcr.io/csingh26/quizbee-legacy:2.0.0-rc.1` | `sha256:62fe0f141dfcaf6e0868ca3e8723007cc9514938162083f88ffd68de04554bf7` |

All four packages are public. Each version tag was pulled with an empty Docker credential configuration, and its digest matched the release asset. Both `linux/amd64` and `linux/arm64` manifests were inspected. Each platform includes SPDX SBOM and SLSA provenance attestations; application images use the `node` runtime user and carry the matching source/version labels. Full-commit SHA tags match the same digests, and this prerelease does not set `latest`.

The release attaches [image-digests.json](https://github.com/CSingh26/quiz-app/releases/download/v2.0.0-rc.1/image-digests.json), [images.txt](https://github.com/CSingh26/quiz-app/releases/download/v2.0.0-rc.1/images.txt), and the post-publication [verification.json](https://github.com/CSingh26/quiz-app/releases/download/v2.0.0-rc.1/verification.json).

## Published-image runtime check

The local ARM64 Docker stack was switched to the downloaded release images without rebuilding. Web, API, two ingestion replicas and one generation worker reported healthy. A synthetic account uploaded Markdown through the web gateway, the API stored it in private S3 storage, a worker extracted it, and authenticated retrieval returned its text. Local SMTP accepted verification/reset messages, and account deletion succeeded. The released legacy image separately connected to an isolated disposable MongoDB replica set and passed its container health check.

Existing development PostgreSQL/object-storage volumes were preserved. No public application deployment was performed. The local ingestion test used the documented development scanner bypass; no live AI provider, real malware engine or production email delivery was exercised.

## Repository delivery

Seven implementation/review pushes, one atomic main/tag publication push, and one documentation/evidence push complete this delivery: nine pushes total. The repository description and topics now describe the distributed web/API/worker architecture and Docker/GHCR distribution.
