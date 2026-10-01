# AI generation pipeline

AI generation is an optional configured workflow. Manual quiz creation, banks and assessment do not require an AI service. The repository contains no live provider credentials and never substitutes fabricated questions for a failed or unconfigured provider.

## Configuration and execution

Set `AI_BASE_URL`, `AI_API_KEY` and `AI_MODEL` in the private frontend environment file, then restart web and worker processes. The base URL should include the provider's API prefix, for example `/v1`; the adapter appends `/chat/completions`. HTTPS is required except for loopback HTTP providers used in local development and tests. The provider must accept the requested structured JSON schema. Not every service claiming OpenAI compatibility supports that contract.

Generation configuration reports only whether all three settings exist. It is not a health check, a credential validation, or proof of model support. Live external AI requests have not been part of the local fixture verification.

## Processing steps

1. Validate the requested title, count, difficulty, types, duration and 1–10 material IDs. All sources must be owned by the requester and ready. Each selected question type must be represented, so count must be at least the number of selected types.
2. Persist an owner-scoped generation job. At most three queued/running generation jobs per account are accepted; the route also limits daily generation requests.
3. Read at most 4,000 source chunks and rank them using lexical term matches against the requested topics or title. Select at most 24 whole chunks within 32,000 characters.
4. Send the selected chunk text, IDs and labels with generation instructions. Source text is explicitly treated as untrusted evidence, not executable instructions. No browser tools, document-defined tools or external document links are invoked.
5. Request structured JSON and enforce a 90-second request timeout and a 1 MB response cap. The current request allows 16,000 output tokens; large requested quizzes can fail on a provider's output limits.
6. Validate the complete result through the domain schema. Check exact count, permitted types, requested difficulty, valid answer choices, source IDs, exact labels and real quoted substrings. Every question must cite a supplied chunk.
7. Recheck the worker lease and lock the selected source rows. Create the quiz/version and mark the job complete in one transaction. A stale worker cannot publish another quiz, and source deletion is serialized against publication.

All nine domain types are accepted. The structured provider format currently constrains generated matching questions to four pairs with IDs `a`, `b`, `c`, `d`; manual matching questions have the broader domain format.

## Failure, privacy and limits

Jobs use bounded retries and report a fixed, allowlisted error message. Raw model responses and arbitrary validation exception messages are not stored as job errors or written to worker error logs. Provider refusals, malformed or truncated JSON and fabricated references fail the job rather than publishing a partial quiz.

A matching quote proves that the cited text occurred in the selected source. It does **not** prove that the question, answer or explanation follows from that quote. Review generated content before assigning it. Prompt instructions and schema validation reduce risk but are not a guarantee against misleading source text or model errors.

The configured provider receives selected source excerpts and generation instructions. Its processing and retention depend on the chosen provider and account settings; this application provides no external retention assurance. See [PRIVACY.md](PRIVACY.md).

Retrieval is a bounded lexical baseline, not embeddings or semantic search. Long or multilingual sources can rank poorly, and selected context may omit relevant content. Embeddings, OCR, tutoring and adaptive learning are not implemented. An embedding retriever would need to preserve the existing ownership, size and provenance checks.
