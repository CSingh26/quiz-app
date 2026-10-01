# Document processing

Uploaded study material is private to its owner. The API stores it under an opaque private storage key and queues extraction. The browser polls material status (`queued`, `processing`, `ready`, `failed`); ready means readable text was extracted, not that its educational claims were checked.

## Supported inputs

| Format | Extracted content and provenance |
| --- | --- |
| PDF | Existing text content, labeled by page; no rendering or embedded script execution |
| DOCX | Paragraph text, labeled by section |
| TXT / Markdown | UTF-8 text; Markdown headings become section labels |
| CSV | Quoted-field-aware text rows; formulas remain text |
| XLSX | Shared/inline strings and stored values, labeled by sheet number and row; formulas are not evaluated |
| PPTX | Text from slide XML, labeled by slide number |
| ZIP | Supported member documents, with the member path added to each source label |

Image-only PDFs and image documents require OCR, which is not configured. Complex layout, charts, equations, notes, embedded objects and formatting may not survive extraction. UTF-16 or other text encodings must be converted to UTF-8.

## Limits and archive defenses

- Upload and individual document: 10 MB. Library: 100 materials and 100 MB per account.
- ZIP/Office processing: at most 100 entries, 25 MB actual expanded bytes and a maximum 100:1 expansion ratio. The budget is shared when a ZIP contains Office containers.
- Reject traversal paths, duplicate paths, symlinks/special files, encryption, unsupported compression and nested generic archives. Archive entries are read in memory and never extracted to filesystem paths.
- Reject XML entities/DOCTYPE, external Office relationships, macros and embedded executable content. XML parsing performs no external fetching.
- PDF: at most 500 pages. Extracted text: at most five million characters. Chunking: at most 4,000 chunks of up to 1,800 characters, with overlap and source labels.

Files with macros, external links or complex embedded parts can be rejected even if an ordinary office viewer opens them. Rename-only tricks do not turn binary data into valid text or an Office container.

## Malware and process boundary

Before extraction, a configured ClamAV-compatible `MALWARE_SCAN_COMMAND` is invoked without a shell. Only successful exit status permits processing. Scanner errors, timeouts and detections fail closed.

For local work only, the example environment explicitly sets `ALLOW_UNSCANNED_UPLOADS=true`; this records a development-bypass audit action. `NODE_ENV=production` never permits that bypass. Local test success does not establish that a real malware engine was exercised.

Extraction runs in a child Node process with a 256 MB heap setting, a 60-second timeout and a bounded response buffer. The worker downloads one private temporary snapshot and scans and parses that same file. Scanner and parser receive restricted environments without database, AI or object-store credentials. This remains a resource boundary, **not an OS security sandbox**: subprocesses retain the worker identity and filesystem privileges. Restrict that identity, filesystem and network access before processing sensitive untrusted documents.

## Storage and deletion

`PrivateStorage` supports private local files and S3-compatible object storage. API and worker hosts must share a driver, bucket and prefix; the local adapter requires the same `PRIVATE_STORAGE_DIR`. Opaque keys never expose original filenames, and there is no public original-file download endpoint. Per-job temporary snapshots use restrictive permissions and are removed on normal success or failure. See [private storage](STORAGE.md) for configuration and recovery boundaries.

Deleting material removes database content and records its key in a durable cleanup outbox. The application attempts deletion immediately; maintenance retries failed storage deletion. Existing generated quizzes and attempt snapshots can still contain copied quotations. Legacy S3 profile uploads are separate from the platform adapter. Bucket versioning, provider retention and orphaned interrupted uploads require the operator controls described in [private storage](STORAGE.md).
