# Architecture

```mermaid
flowchart LR
  UI[Next.js student and instructor views] --> API[Express routes]
  API --> Auth[JWT authentication and role gates]
  Auth --> Domain[Question validation and grading]
  Domain --> DB[Prisma / MongoDB replica set]
  API --> S3[Optional S3 profile storage]
  Cron[Room scheduler] --> DB
```

`backend/domain/quiz.js` defines pure grading, question-file and room-window rules. Controller factories accept a Prisma dependency for isolated tests, while normal exports use the generated client. Instructor mutation routes authenticate before Multer reads files. The frontend carries answer text, but the server matches it against actual options from the assigned module.

Imports use a nested Prisma write. Attempts and leaderboard updates share a transaction. Module deletion checks linked rooms and performs dependent deletions transactionally. MongoDB must run as a replica set for these contracts. Database startup awaits the connection before the server listens.

The existing schema spelling `Leaderbaord` is preserved to avoid a gratuitous migration. No existing repository history or data was rewritten.
