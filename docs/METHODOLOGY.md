# Assessment methodology

This is a computer-science project; financial calculations are intentionally absent.

A valid room accepts a request when `startTime <= now < endTime`, evaluated on the server. A scheduler may run later than the expiry time; it does not extend the submission interval.

A question is worth one point when the submitted option text equals its stored answer. Unanswered assigned questions earn zero. Answers must be a plain object, every question must belong to the room's test module, and each answer must be one of that question's options. The client cannot supply its own score.

A question file contains 1–1000 items, each with a nonempty question, 2–20 distinct nonempty option strings and an answer matching exactly one option. The full file is validated before persistence. Text and file-size bounds limit excessive work.

Repeated submissions create repeated attempts; the latest completed score replaces the leaderboard value. A database transaction ensures these two writes agree. The score measures performance on those questions, not a validated psychometric trait. Random option order is presentation behavior and is not used as a statistical sampling method.

Room scheduling retains the existing Asia/Kolkata timezone and same-day start/end protocol. Invalid calendar dates, malformed identifiers and nonpositive intervals are rejected before writes. “Activate now” starts the room at the server time while preserving its scheduled end; an expired room cannot be activated. That manual transition creates the active row and removes the scheduled row in one transaction.
