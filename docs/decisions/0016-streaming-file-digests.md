# ADR 0016: Streaming File Digests and Legacy SHA-1 Labeling

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: more algorithms are requested (they must be added to the contract first), the picker bound changes, or device testing shows native digest performance problems on large files.

## Context

The audited upstream File Hash Checker reads the entire selected file into one `ArrayBuffer` and hashes it in JavaScript — exactly the defect the implementation plan flags as non-streaming, and one the repository forbids ("never read unbounded files into one ArrayBuffer"). The versioned content-read bridge (ADR 0009) already provides `digestContent`: a native streaming digest over picked `content://` URIs with real NIST vectors, a 1 GiB hard cap, and abort support — this tool is the bridge's first consumer.

## Decision

Enable the `file-hash-checker` tool on the streaming contract:

- **Selection**: system/SAF picker for any file type, bounded at 100 MiB (the reviewed picker policy bound; the native digest bridge itself streams up to 1 GiB, so the picker bound is the effective limit).
- **Computation**: SHA-256, SHA-1, and SHA-512 in a fixed order through `files.digestContent(file, { algorithm }, signal)`. On Android the content streams natively — no full-file copy ever crosses the bridge or exists in JavaScript; the web adapter hashes in-page with its documented 50 MiB JavaScript limit. Results appear progressively as each digest lands.
- **Cancellation**: a Cancel button aborts the in-flight digest through the contract's `AbortSignal`; cancellation surfaces as a distinct "Hashing cancelled." state, separate from failures.
- **SHA-1 labeling**: SHA-1 is labeled "Legacy — not collision-secure" in the UI per the repository's hash-tool rule; it is offered for compatibility only and never marketed as secure.
- Copy actions use the shared clipboard service; the tool stores nothing, uploads nothing, and logs neither digests nor filenames.

## Alternatives considered

- **JavaScript hashing of a full read** (upstream): rejected; a 100 MiB file fully copied into memory on a mid-range phone is exactly the failure mode the plan prohibits.
- **Hashing inside a Worker**: rejected; the native stream is strictly better on Android, and the work already runs off the UI thread natively.
- **Dropping SHA-1 entirely**: rejected; checksum verification against legacy artifacts is a legitimate compatibility use, and honest labeling satisfies the rule.
- **All-at-once parallel digests**: rejected; sequential streaming keeps one native read pass in flight at a time and lets cancellation be precise.

## Consequences

- The tool proves the digest contract end to end with an independent oracle: E2E asserts the exact SHA-256/SHA-1/SHA-512 of a synthetic fixture computed through the real web adapter on both device profiles.
- Files up to the picker bound hash without a memory spike on Android; the web adapter's 50 MiB limit is its own documented bound.
- Device evidence (native stream on real DocumentsProviders, timing on large files, picker behavior) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
