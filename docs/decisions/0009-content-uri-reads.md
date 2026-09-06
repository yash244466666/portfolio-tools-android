# ADR 0009: Bounded and Streamed Content-URI Reads

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: a file-consuming tool needs access beyond the documented bounds, a provider requires random-access reads, or larger bridge payloads become necessary after device profiling.

## Context

The scoped document picker (ADR 0003) returns validated `content://` metadata but deliberately does not make content readable from JavaScript. File-consuming tools (File Hash Checker, Image Compressor) therefore need a reviewed read path. The repository rules require streaming over bridge-Base64 for large files, strict limits displayed before processing, cancellation, typed errors for provider failures, and no broad storage permissions or arbitrary paths.

## Decision

Extend the version-1 `DocumentFiles` bridge with three operations, all validated natively and restricted to content URIs the picker returned in this process (process-local `PickedUriRegistry`), so the bridge can never read an arbitrary provider URI:

- `digestContent` streams the selected document through a JCA `MessageDigest` in 64 KiB chunks on a background thread. Only the lowercase hex digest, byte count, and algorithm cross the bridge; the file never enters memory as a whole and never crosses the bridge. Supported algorithms are SHA-1, SHA-256, and SHA-512 (contract names `sha-1`, `sha-256`, `sha-512`); MD5 remains excluded. The hard cap is 1 GiB.
- `cancelDigest` sets a process-local cancellation flag checked between chunks, so a cancelled hash stops early. Cancellation is idempotent and unknown operations resolve silently.
- `readContent` copies the selected document into a bounded in-memory handoff (default and hard cap 16 MiB; tools may pass smaller limits) and returns Base64. Oversized content is rejected, never truncated, so a tool cannot receive partial bytes presented as complete.

Key protections:

- URIs are validated for the `content://` scheme in JavaScript and natively, plus registry membership; `file://` and other schemes are always rejected.
- Provider stream failures, null streams, unexpected ends, and `SecurityException` map to typed `FILE_READ_FAILED`; cancellation maps to `FILE_READ_CANCELLED`; oversized content to `FILE_TOO_LARGE`; concurrent content operations to `FILE_OPERATION_IN_PROGRESS` (single-flight across digest and read operations).
- The pure `ContentReadPolicy` (digest streaming, bounded read, limits, hex encoding) is unit-tested with real SHA vectors including empty-stream, multi-chunk, oversized, and mid-stream-cancellation cases.
- On the web adapter, `readContent` uses the browser `File` with the same 16 MiB cap and `digestContent` uses Web Crypto with the documented 50 MiB JavaScript hashing limit; Android streams up to 1 GiB natively. `AbortSignal` cancellation is honored before and after asynchronous reads.
- URI grants are not persisted (`takePersistableUriPermission` is still not used), so after process death a stale URI fails with a typed read error; the user re-picks. No new permission, exported component, dependency, or ProGuard rule is added.

## Alternatives considered

- Reading file bytes over the bridge for hashing: rejected because it violates the stream-don't-Base64 rule and would cap useful file sizes to bridge memory limits.
- Persistable URI grants for long-lived access: rejected because current tools process selections immediately; silent long-term provider access expands the privacy surface without need.
- JavaScript streaming hash in a Worker: rejected because a JS incremental SHA-256 implementation is an additional dependency and the native path is faster and memory-bounded; the web adapter keeps the documented 50 MiB JS limit.
- Allowing multiple concurrent content operations: rejected for version 1 because bounded memory behavior is easier to reason about single-flight; tools process one selection at a time.

## Consequences

- The first file-consuming tools can hash large files natively (File Hash Checker) and obtain bounded bytes for decoding or inspection (Image Compressor, small text formats) without new permissions.
- The 1 GiB digest cap and 16 MiB read cap are foundation defaults to be re-validated against device memory/space profiling before release; changing them requires an ADR update.
- Provider-interoperability behavior (real DocumentsProvider quirks, process interruption) still requires instrumentation and physical-device evidence, tracked by issues #17 and #18.
