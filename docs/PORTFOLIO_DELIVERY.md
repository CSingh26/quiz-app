# QuizBee portfolio delivery

Date: 2026-09-08. Repository: https://github.com/CSingh26/quiz-app. The original public QuizBee repository and assessment identity were preserved; no finance features were added.

## Engineering outcome

Grading now checks actual options from the assigned test module and validates the room window at request time. Full question-file validation precedes atomic nested creation. Instructor mutations require an authenticated instructor before upload parsing. Attempt and leaderboard writes share a transaction; linked module deletion is rejected and unlinked deletion is transactional.

Local session cookies work over HTTP while production requires HTTPS. Missing instructor configuration returns a controlled503 response. Credential logging was removed; uploads are capped. Strict scheduling rejects invalid dates and intervals, and manual activation begins immediately while preserving the scheduled end time.

The existing React release-candidate dependency conflict was resolved with stable compatible dependencies. Workflow contracts now have explicit TypeScript types. The prior build lint bypass was removed; errors were repaired instead of disabling rules.

## Observed checks

- **16 Node domain/controller/authentication/session/scheduling tests passed.** Malformed question imports, out-of-module answers, expired rooms, missing configuration and invalid schedules are covered.
- **One real MongoDB replica-set integration test passed.** It creates nested questions/options, records a server-graded attempt, rejects linked-module deletion and proves transaction rollback after an injected leaderboard-write failure. Only isolated synthetic fixture records are used.
- **Four Chromium journeys passed** across desktop and mobile: answer selection/submission/leaderboard and unavailable-room recovery. These use explicitly labeled test HTTP fixtures; they do not assert production service availability.
- Backend ESLint, Prisma generation, frontend ESLint, TypeScript and the Next.js production build passed. Existing frontend lint warnings remain visible; no errors remain. They concern image optimization, unused values and hook dependencies.
- Full local dependency audits returned zero known vulnerabilities after locked patch updates. CI also audits production dependencies. Common tracked-text secret patterns returned no matches; this is not a comprehensive historical credential scan.
- [Default CI at timing-fix revision e90196b](https://github.com/CSingh26/quiz-app/actions/runs/34283236277) succeeded, including MongoDB, production build and browser checks. The subsequent missing-configuration regression is included in the latest default workflow; the portfolio-wide report records its exact final SHA and CI result.

## Independent review

The separate ReliScore lead reviewed grading, persistence, roles, scheduling, session behavior, type boundaries, security and recruiter clarity. It found two timing defects: invalid room intervals and future start times retained by “activate now.” Both were reproduced, fixed and independently rechecked with three passing scheduling tests. The reviewer reported no remaining blocking issue in the scoped review. Its immutable report lives in the ReliScore repository under `docs/reviews/quizbee-review.md`.

## Repository evidence

The original history had113 commits. Genuine implementation and release milestones were appended and pushed normally to main; no force push, data overwrite or synthetic history padding was used. The repository now exceeds the required15-commit floor. Exact final count and remote SHA are recorded in the portfolio-wide audit.

README, methodology, architecture, testing, limitations, environment examples, screenshot, contribution guidance and CI are present. The original MIT license is preserved and backend metadata is aligned with it.

## Limitations

MongoDB replica-set configuration and a locally generated instructor bcrypt hash are needed for an interactive authenticated deployment. No real S3 upload was exercised. Repeated attempts remain permitted and the latest score replaces the leaderboard value. Distributed scheduler coordination, immutable examination snapshots, attempt quotas, proctoring, full accessibility coverage and load testing are outside this delivery. The existing automated lifecycle migration design remains a documented follow-up; manual activation is transactional. See `docs/LIMITATIONS.md`.
