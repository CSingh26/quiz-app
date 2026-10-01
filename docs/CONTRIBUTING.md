# Contributing

Use [the root contribution guide](../CONTRIBUTING.md) for implementation rules. The web lives in `frontend`; the API, domain, Prisma schema and role-specific workers live in `services/platform`; preserved Express/MongoDB code lives in `backend`.

Keep web changes free of database/provider credentials and server-domain imports. API replicas and workers share PostgreSQL and private storage, so preserve transactional ownership, grading, lease and deletion boundaries when changing behavior. Use [DEPLOYMENT.md](DEPLOYMENT.md) for local setup and [TESTING.md](TESTING.md) for package-specific checks and isolated fixtures.
