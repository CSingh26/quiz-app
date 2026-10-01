# Privacy and data handling

This document describes current application behavior. It is not a legal privacy notice, a compliance certification, or a promise about provider/backup retention. An operator must establish the policies appropriate to their actual deployment before collecting real student data.

## Data stored

The new platform stores account name, normalized email, role, password hash, optional email verification time, hashed session/recovery tokens, owned quizzes and bank versions, course membership, assignments, answer snapshots, grades and selected audit actions. Passwords use scrypt with per-password salt; plaintext passwords and raw session tokens are not stored as account database fields.

Uploaded originals are stored privately by opaque key. File metadata and extracted text chunks live in PostgreSQL. Generated questions include copied source references and quotations. The dashboard derives summaries from stored attempts, with bounded recent-record queries; it does not populate fabricated activity.

Optional assessment integrity events contain a recognized event type, attempt ID and timestamp. They can indicate browser visibility, focus, fullscreen exit, copy or paste. No webcam, microphone or screen capture is implemented.

## Access and external processing

Services scope private resources to the account owner, or to authorized course membership/ownership. Course owners can inspect their participant roster and assessment results. An instructor role is self-selectable at registration; it is not institutionally verified authority. Revoking a session invalidates its server record.

When generation is configured and requested, selected document excerpts, source labels/IDs and generation instructions are sent to the configured provider. The full original file is not sent by the provider adapter, but selected excerpts can still contain sensitive information. Provider storage, training use, geographic processing and deletion depend on that provider and configuration. No assurance about those matters is implemented here.

Configured SMTP receives recipient addresses and verification/reset email content. Local Mailpit is an inspection inbox, not an assurance for a production mail provider. Logs and infrastructure outside this application may also retain metadata under the operator's control.

## Deletion semantics

- Material deletion removes material/chunk database records and transactionally queues the private file key for physical deletion. The application tries immediately and the worker retries failures through a durable outbox. Until cleanup succeeds, bytes may remain on disk.
- Existing quizzes, bank copies and attempt snapshots can retain copied source quotations after the original material is deleted. Material deletion does not rewrite this separately saved content.
- Quiz deletion is soft deletion. It hides future owned availability while preserving historical versions and attempts.
- Account deletion requires password confirmation and rechecks credentials transactionally. Cascades remove owned data and associated sessions. Deleting an instructor's content can remove dependent participant assessment records as defined by foreign keys; there is no institutional retention override.
- Audit rows may remain with a null user reference and the original resource identifier. Storage cleanup entries remain until physical deletion succeeds.

Expired sessions, account tokens and rate-limit rows are pruned by worker maintenance. Other database content, successful/failed jobs and audit records do not have a general automatic retention schedule. Database/file backups, SMTP inboxes and external provider copies are not erased by an application delete operation. Retention durations and backup deletion require operator policy and implementation.

## Deployment boundary

Private storage is currently local filesystem storage, not encrypted object storage with managed lifecycle rules. The extraction subprocess inherits the worker environment and privileges; process separation is not credential isolation. The legacy frontend shares the browser origin unless deployed separately. Review these boundaries before handling sensitive or regulated records, and disclose the actual processing choices to users.
