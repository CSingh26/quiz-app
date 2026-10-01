# QuizBee

<!-- impeccable:product-schema 1 -->

## Platform
web

## Users
Independent learners creating private practice quizzes, and instructors creating and assigning assessments to classes. Students do not need instructor involvement to study.

## Product Purpose
Turn learning materials into source-grounded quizzes, then use attempts and explanations to guide revision. Controlled assessments share the same versioned question and attempt engine.

## Operating Context
Local development and testing first; the user explicitly requested no deployment. Existing data is development/demo data. The legacy Next.js/Express/MongoDB application remains available during migration.

## Capabilities and Constraints
The rebuild brief is the target, not a claim of current capabilities. Server grading, atomic imports, transactional results, authorization and request-time room windows must survive migration. No fake AI, invented activity, or placeholder security. Production provider credentials and infrastructure are not supplied.

## Brand Commitments
Retain QuizBee and a subtle bee identity. Academic, energetic, trustworthy, highly legible; avoid childish branding, excessive gradients and glass effects. Light, dark and system themes. Responsive keyboard-accessible flows aiming at WCAG 2.2 AA.

## Evidence on Hand
Existing implementation and automated tests. There are no verified customer metrics, testimonials or production performance claims. Any demonstration questions must be visibly labeled as examples.

## Product Principles
- Learners own their private study workflow.
- The server owns timing, eligibility, grades and attempt state.
- Questions retain source references and immutable versions.
- Assessment signals require human interpretation; never claim cheating-proof exams.
- A feature is advertised only when its complete workflow is implemented.

## Open Decisions
No production hosting provider, mail provider or AI model provider has been selected. Local verification is the immediate priority.
