# Limitations

- MongoDB replica set and an instructor bcrypt hash are required for a real authenticated deployment. S3 upload configuration is optional and was not exercised against a real bucket.
- Repeated attempts remain permitted, with the latest score on the leaderboard. There is no proctoring, immutable exam snapshot or attempt quota.
- The scheduler is a single-process polling design. Multiple backend replicas need coordinated job execution and an explicit concurrency policy for room administration.
- Read-only module/room metadata and quiz questions retain their existing public access paths; sensitive mutations require roles. Production identity recovery, rate limits and audit logging remain future work.
- The delivered tests cover grading, validation, authorization, session cookies, persistence and representative browser journeys; they do not prove every legacy screen or concurrency interleaving correct.
- Existing lint warnings about image optimization, unused values and hook dependencies remain visible. Lint errors were fixed without disabling the existing rules or bypassing build linting.
- The dependency and tracked-text secret checks are point-in-time checks, not a comprehensive security assessment or a scan of all historical commits.
