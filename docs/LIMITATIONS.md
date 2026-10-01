# Current limitations

The new platform supports local private study, versioned quiz/bank content, instructor assignments, server-authoritative attempts, objective grading, manual/self review, ingestion and a configurable AI pipeline. It remains a local implementation with explicit operational limits.

- No public deployment or production migration was performed. Legacy MongoDB data and credentials are not imported into PostgreSQL.
- Live external AI, production SMTP and an actual malware engine are not established by fixture tests. Missing configuration is reported; no successful output is invented.
- Local uploads can explicitly bypass malware scanning in nonproduction. Production rejects that bypass. The extraction subprocess is memory/time bounded but inherits environment credentials and OS privileges; it is not a sandbox.
- New-platform file storage is local. `PrivateStorage` is an adapter interface, not an implemented S3/R2 integration. Durable cleanup retries physical deletion but provides no deletion-time or backup-retention guarantee.
- OCR, embeddings/semantic retrieval, scanned-image understanding and faithful extraction of complex document layout are absent. Lexical retrieval and all list/report queries are bounded; dashboard/results are not unlimited all-history analytics.
- Source quotes establish traceability, not factual correctness or entailment. Generated content requires review. Provider schema compatibility, response limits and model quality can cause generation to fail.
- Objective grading uses exact contracts and all-or-nothing points. Essays need manual review; practice self-review is explicitly different from instructor assessment. There is no automated semantic essay grading or adaptive tutor.
- Browser integrity events are optional and imperfect. They do not prove misconduct, detect another device, or provide lockdown/proctoring.
- Email verification/reset exists, but mature deliverability, bounce handling, risk-based recovery and enforced verification policy are absent. There is no MFA, SSO, organization tenancy or institutional instructor approval.
- Private banks support versions, folder labels, tags and difficulty sampling. Collaborative banks, public quiz sharing, new-platform leaderboards, QTI import/export, rich-text authoring, notifications and advanced adaptive learning are not implemented.
- Separate legacy routes do not create a security boundary when served from the same origin. Legacy behavior and known limitations remain separate from the new API's protections.
- Bounded tests validate specific invariants. They are not complete penetration testing, load validation, accessibility certification, or a guarantee that every browser, document and concurrency combination works.

See [TESTING.md](TESTING.md) for current verification evidence and [DEPLOYMENT.md](DEPLOYMENT.md) for local setup and the additional work required before public operation. Historical portfolio and planning documents describe earlier deliveries or intent, not additional shipped capabilities.
