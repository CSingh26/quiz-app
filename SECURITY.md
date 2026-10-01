# Security policy and boundaries

QuizBee 2.0 is a local study and assessment implementation. This file describes controls and review priorities; it is not a security certification or an invitation to test systems you do not own.

## Reporting

Use the repository's private vulnerability reporting channel if the host offers one. Otherwise contact its maintainers through an established private channel before posting exploitation details. Include the affected revision, a minimal local reproduction, required privileges and expected impact. Do not include credentials, real student data or harmful uploaded samples in a public issue. This repository does not declare a guaranteed response SLA or fabricate a reporting address.

## Properties to preserve

- Opaque session tokens are hashed server-side and checked for expiry/revocation. Passwords use salted scrypt. Recovery/verification tokens are hashed, bounded in lifetime and single-use.
- Unsafe requests require the configured browser origin. Cookies are HttpOnly and SameSite=Lax, with Secure under HTTPS. The local HTTP allowance is limited to loopback testing.
- Authorization combines role with resource ownership or membership. IDs supplied by a client never confer access. Self-service instructor registration does not grant authority over someone else's course or quiz.
- Grades derive only from the attempt snapshot and validated answers. Deadlines, attempt limits, answer revisions and finalization are server-authoritative. Active or unreleased exams do not disclose answer keys through result or dashboard paths.
- File processing enforces size/archive budgets and rejects unsafe paths, encryption, links, macros and external XML relationships. Production extraction requires successful malware scanning.
- AI responses are untrusted. Schema, count/type/difficulty and real context provenance must validate before an atomic quiz/job publish. Errors crossing into persistence or logs must be fixed safe messages, not raw model/document values.
- Deletion and publication coordinate with row locks. File-deletion intent survives database deletion in an outbox; stale workers cannot overwrite newer job outcomes.

## Trust assumptions and residual exposure

The operator controls environment settings, database credentials, SMTP/provider endpoints and scanner executable. Forwarded client addresses are trusted only behind a proxy that overwrites the header. Default direct-client limits share a bucket; this is not a mature abuse-prevention system.

The extraction subprocess has resource limits but inherits worker environment and OS privileges. It is not a filesystem/network sandbox or credential-isolated service. Public deployment should use a restricted parsing identity/container with minimal credentials and access. Local malware bypass is not acceptable for public upload handling.

The new `/api/v2` routes and legacy frontend can share an origin. Route prefixes and separate database cookies do not isolate an XSS or compromised page at that origin. Review legacy/shared code when evaluating new-platform exposure, or separate origins under an explicit migration plan.

Browser integrity signals are not anti-cheating proof. Schema-valid source quotations are not proof of educational accuracy. Self-reviewed grades are not institutional assessments. SMTP verification is available but is not presently a mandatory login gate; MFA, SSO and organization tenancy are absent.

## Review and validation scope

Prioritize cross-account reads/writes, answer disclosure before release, deadline/revision races, replayed tokens, malformed/large documents, parser capabilities, job lease races, source deletion during generation, logging of private content and storage cleanup failures. Use local disposable data and the guarded test database. Dependency audits and secret scans are point-in-time checks; they do not replace source review or assess all historical commits.

For actual test evidence use [TESTING.md](docs/TESTING.md); for operational prerequisites and retention boundaries use [DEPLOYMENT.md](docs/DEPLOYMENT.md) and [PRIVACY.md](docs/PRIVACY.md).
