# Private shared storage

The platform API and ingestion worker select the same `PrivateStorage` adapter through `services/platform/src/server/ingestion/storage.ts`. `local` keeps the private-filesystem behavior; `s3` uses AWS SDK v3 against AWS or a compatible S3 endpoint. Unknown drivers and incomplete S3 settings fail instead of falling back to a different store.

All instances sharing PostgreSQL must use the same driver, bucket and prefix. Database records contain opaque keys, not backend identifiers. Changing settings does not migrate existing files. Copy and verify existing keys before switching a database to a new storage identity.

## Configuration

| Setting | Meaning |
| --- | --- |
| `STORAGE_DRIVER` | `local` (default) or `s3` |
| `PRIVATE_STORAGE_DIR` | Local adapter root, outside public assets |
| `S3_BUCKET` | Existing private bucket; the application does not create it |
| `S3_REGION` | Signing region; `us-east-1` for the local compatible service |
| `S3_ENDPOINT` | Optional S3 API origin; omit for AWS S3 |
| `S3_FORCE_PATH_STYLE` | `true` for the local compatible service; otherwise defaults to virtual-host addressing |
| `S3_PREFIX` | Optional shared prefix; letters, digits, slash, underscore and hyphen only |
| `S3_REQUEST_TIMEOUT_MS` | Total deadline per operation, including streamed reads; default 15,000, range 100–60,000 |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN` | Optional standard credentials; otherwise the SDK uses its default credential chain |
| `STAGING_DIR` | Worker-only temporary root; defaults to the operating system temporary directory |
| `UPLOADS_ENABLED` | API capability override (`true`/`false`); API hosts need not carry scanner settings |
| `GENERATION_ENABLED` | API capability override (`true`/`false`); API hosts need not carry provider credentials |

Without overrides, upload availability follows scanner/development policy and generation availability follows provider configuration. Advertising availability does not bypass worker validation. Production ingestion still requires a successful malware scan; generation still requires a configured provider on its worker.

Keep object-store credentials on services that need storage access, and AI credentials on generation workers. Never expose credentials through browser configuration or image build arguments. Use workload credentials or protected runtime secrets outside local fixtures.

## Privacy and bounds

Object names are random UUIDs ending in `.bin`; original filenames remain database metadata. Uploads use `application/octet-stream`, a known byte length, conditional creation, and no ACL. The adapter does not return public or signed download URLs. Provision private bucket policies and, for AWS, Block Public Access separately: an adapter cannot override unsafe bucket policy. The local compatible service is SeaweedFS with authenticated bucket-scoped access.

Reads reject advertised oversize content and count actual streamed bytes, stopping above 10 MB. Streams are destroyed on failure, overflow or timeout. Permission and service failures use fixed messages without provider response text or credentials.

Use an unversioned material bucket with the current key-only deletion interface. On AWS, plain deletion against a versioned bucket creates a delete marker and retains prior versions. Version retention, object lock, backups and provider copies require separate operator policy; successful API deletion does not assure those copies were erased. See [AWS delete semantics](https://docs.aws.amazon.com/AmazonS3/latest/API/API_DeleteObject.html).

## Worker staging

Each ingestion job downloads once into a private directory (mode `0700`) and file (mode `0600`). The scanner and bounded extraction subprocess use that same file. Parsing does not fetch a second object that could differ from the scanned snapshot. Normal success and failure remove the job directory in `finally`.

Scanner and extraction children receive explicit environment allowlists. Database, provider, object-store and Node preload settings are not inherited. This is not an OS sandbox: children retain worker identity and filesystem permissions. A forced process kill can leave temporary files; use an ephemeral worker scratch mount and restrict worker identity, filesystem and network access for sensitive workloads.

## Deletion and failure recovery

Material and account deletion revoke database access and write keys to PostgreSQL's `StorageDeletion` outbox in the same transaction. Browser requests do not contact object storage or wait for physical deletion. Worker maintenance deletes at most five objects concurrently per sweep using the selected adapter; an S3 outage therefore costs one configured operation deadline per batch instead of a timeout for every pending object. Pending work is ordered by fewest previous attempts, then age, so repeatedly failing entries do not starve later work. Repeated deletion is safe; service and permission failures retain work for retry. Physical removal can take several sweeps and requires an available worker and object store. Source text already copied into quizzes and attempt snapshots is independent of the original object.

Storage writes and PostgreSQL transactions are not atomic. A crash after storing an upload but before its database record commits, or a failed best-effort rollback delete, can leave an unreferenced object. Ambiguous network failure during a write has the same possibility. There is no automatic orphan reconciliation or general object expiration. Reconcile inventory with database references before removing old unreferenced objects; blanket expiration also removes retained study materials.

## Verification

`npm test` in `services/platform` includes local HTTP transport tests for request privacy, round trips, bounded reads, timeouts, error redaction and idempotent deletion. Staging tests check cleanup, one-read scan/parse behavior, scanner rejection and restricted child environments.

`npm run test:storage` is separate. It refuses any database other than `localhost`/`127.0.0.1:55439/quizbee_v2_test`, or storage endpoint other than `localhost`/`127.0.0.1:18333` with bucket `quizbee-storage-test`. Initialize that private bucket through local infrastructure first and provide its scoped test credentials. The suite uses a unique prefix and separate worker process with a different local directory, checks anonymous-read denial and extracted chunks, and exercises material/account deletion and outbox retries. It removes only its fixture rows and object keys.
