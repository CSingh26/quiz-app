# Releases and container artifacts

`VERSION`, the root package, web package and platform package must agree before a `vMAJOR.MINOR.PATCH[-prerelease]` tag can publish. Add reviewed notes at `docs/releases/<tag>.md`. The legacy package retains its own compatibility package version; its image receives the common release version and source revision labels.

The tag workflow invokes the full reusable quality workflow, including isolated PostgreSQL/MongoDB tests, real S3 integration, browser journeys, dependency audits, image builds and a two-worker container smoke. Only successful quality checks unlock image publication. No workflow deploys a publicly hosted application.

The four GHCR images are `quizbee-web`, `quizbee-api`, `quizbee-worker` and `quizbee-legacy` under `ghcr.io/csingh26`. Each has Linux AMD64 and ARM64 manifests, a version tag, a full-commit `sha-…` tag, and SBOM/provenance attestations. A prerelease never changes `latest`. Package permissions are managed separately from repository visibility; verify anonymous pulling before describing an image as public.

After all image jobs succeed, the workflow publishes a nondraft GitHub release with `image-digests.json` and `images.txt`. Those files bind each image digest and both platforms to the exact source revision. For reproducible pulls, prefer the digest references over mutable tags:

```sh
gh release download v2.0.0-rc.1 --pattern images.txt
while IFS= read -r image; do docker pull "$image"; done < images.txt
```

Inspect a version's platform manifests with `docker buildx imagetools inspect ghcr.io/csingh26/quizbee-web:2.0.0-rc.1`. A successful manifest inspection is not an application smoke test; also run the local distributed overlay against the published images as described in [DEPLOYMENT.md](DEPLOYMENT.md).

## Upgrade and rollback

Back up PostgreSQL and the matching private object storage before changing schema or storage identity. Run the migration job once before the compatible API/workers start. Stop old consumers before incompatible queue/schema changes. The current release uses existing forward-only migrations and does not erase development data.

Roll back application images only when the previous images support the current schema. There is no automatic down-migration. If schema compatibility is lost, restore a matched database/object-storage backup through a separately rehearsed procedure. Do not delete local named volumes as an upgrade or rollback step.
