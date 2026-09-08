# Release Review: Video to GIF

- Review issue: #35 (tool issue: #112)
- Status: **APPROVED 2026-09-08** — the product owner approved proceeding with the 16 MiB input reconciliation (PDF Converter precedent) and the Worker-based design; codec-floor store wording per the dossier. Device-matrix rows in section 5 gate #112's closure.
- Date: 2026-09-08
- Upstream reference: `portfolio-v2` commit `61e54c64edbeffc9487239b6dae399e255c6a71d`, `components/tools/media/video-to-gif.tsx` (413 lines, includes a self-contained pure-JS GIF89a/LZW encoder)
- Scope: technical evidence and a proposed design for the tier-4 gate ("Video to GIF worker, codec, memory, metadata, and device review"). Implementation work on #112 must not start before the decision is recorded.

## 1. Upstream implementation and its defects

The upstream tool decodes a picked video by seeking an off-DOM `<video>` element through `video.currentTime`, drawing each frame into a hidden `<canvas>`, accumulating every frame's full RGBA `Uint8Array` in a pure-JS GIF89a encoder (fixed 6×6×6 palette, hand-rolled LZW), and downloading the result through a hidden `<a download>` anchor.

Defects the Android product must not copy:

| Upstream behavior                                                                                                                                                                 | Repository rule violated                                                            | Required fix                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Hidden `<a download>` anchor                                                                                                                                                      | Section 11                                                                          | FileService Save As bridge                                                |
| Dropzone advertises `maxSizeMB={50}`                                                                                                                                              | Plan 1505-class dishonesty; the platform `readContent` cap is 16 MiB (ADR 0009)     | Label the effective input budget; reject oversized picks before decoding  |
| All frames held simultaneously as RGBA buffers, plus the GIF output assembled in a JS `number[]` (per-element boxed overhead)                                                     | Section 21 memory budgets; plan 2125 (WebView as a memory consumer during GIF work) | Bounded frame budget in a Worker; typed-array output                      |
| Encoding and frame extraction run on the main renderer thread                                                                                                                     | Plan: heavy work moves to a Worker                                                  | Worker-based pipeline                                                     |
| No cancellation of any kind once conversion starts                                                                                                                                | Section 21: cancel expensive work when navigating away                              | Abortable conversion with Worker termination                              |
| `totalFrames = Math.min(100, duration*fps)` silently truncates long videos; `duration` can be `NaN`/`Infinity` for streams; a sub-1/fps video produces a zero-frame (invalid) GIF | Section 16: distinct states; correctness                                            | Distinct over-limit state, validated duration, zero-frame rejection       |
| `video.onerror` and encoder failures both collapse into a generic "try a different file"                                                                                          | Section 16: distinct unsupported/error states                                       | Distinguish unsupported-codec, decode-failure, and encoder-failure states |
| No rotation-metadata handling; `videoWidth/Height` are coded dimensions while rendering may apply rotation                                                                        | Section 13 metadata rules                                                           | Explicit orientation handling with device verification                    |
| No output-size bound; GIF output can balloon on noisy content                                                                                                                     | Section 13                                                                          | Hard output-byte cap with a distinct over-limit state                     |

The pure encoder itself is a genuinely valuable upstream artifact: the GIF89a structure, the 6×6×6 palette indexing (`r*36 + g*6 + b`), and the LZW encoder are self-contained and testable against an independent oracle (a reference GIF parser/decoder), which satisfies the repository's independent-oracle requirement. It must be ported with regression tests rather than rewritten, and its edge cases (zero frames, dictionary reset at the 4096 limit, `minCodeSize` handling) covered explicitly.

## 2. Platform capability evidence

- **Codec floor**: decoding relies on the WebView's platform media pipeline. On the repository's emulator floor (WebView 124.0.6367.219), H.264/MP4 decode is universal on Android; VP9 is broadly available; AV1/HEVC are device-dependent. The implementation must treat unsupported codecs as a distinct, expected state — never as a generic failure — and the store listing must not promise specific input formats. This is a device-matrix item, not a solvable code problem.
- **WebCodecs is available** on the WebView floor (Chromium 94+), so a `VideoDecoder`-based path exists. However, `VideoDecoder` requires explicit codec strings and configuration probing (`VideoDecoder.isConfigSupported`), and its hardware-decoder behavior varies by device; the `<video>`-seek path is simpler and closer to upstream. The proposed design keeps the `<video>`-seek extraction (moved into a Worker through `OffscreenCanvas`/`createImageBitmap` where verified, otherwise sequenced off the UI thread) and does not adopt WebCodecs in version 1.
- **Input size**: ADR 0009 caps `readContent` at 16 MiB (hard), and `FileService.pick` returns bounded reads — the same reconciliation the PDF Converter recorded in the tracker (effective 16 MiB per-file budget in version 1). A 50 MiB upstream budget is impossible without a new streaming/native decode path, which is a version-1.1 option, not a version-1 requirement. The tool's picker therefore enforces a 16 MiB budget and states it in the UI.
- **No new permissions**: no manifest change is required; video decode uses the existing WebView media pipeline, and export uses the existing Save As bridge. No native library, no wasm dependency, no 16 KB page-alignment implications (which removes the riskiest item in #35's acceptance list).

## 3. Proposed design (for approval)

- **Worker pipeline**: a dedicated Worker owns frame extraction scheduling and GIF encoding; the main thread only renders progress. The Worker is terminated on unmount, reset, over-limit, and cancellation, per the plan's cleanup rules. `ImageData` buffers are released per frame; at most a bounded number of encoded frames are retained (the GIF encoder writes incrementally rather than retaining raw frames — the port restructures `GifEncoder` to encode per frame instead of accumulating all frames).
- **Limits (initial)**: input ≤ 16 MiB; output dimensions ≤ 640 px width (clamped aspect ratio, even dimensions); FPS 1–15 (default 5); duration ≤ 30 s per take; ≤ 100 frames; output ≤ 32 MiB hard cap with a distinct over-limit state; per-frame delay derived from the requested FPS with the GIF minimum of 2 (20 ms) honored.
- **Cancellation**: an explicit Cancel state plus automatic cancellation on tool unmount and navigation; the Worker is terminated and every object URL revoked on every path.
- **Correctness oracle**: the ported encoder gets pure unit tests with independent vectors — GIF headers parsed back with a reference decoder fixture, LZW round-trips, palette-index identity for solid colors, the 4096-dictionary-reset path, and the zero-frame/one-frame boundaries. Byte-exact expectations are fixed for deterministic inputs.
- **Metadata and orientation**: rotation metadata is read via `video.videoWidth/Height` plus explicit handling documented as device-verified (the upstream ignores it); EXIF-style rotation for videos is a device-matrix check.
- **States**: initial, empty, picking, invalid-MIME, over-size, unsupported-codec, decode-failure, extracting, encoding, done, over-limit-output, cancelled, reset — each with non-color cues and a text status; the preview `<img>` has a text/table equivalent (dimensions, frame count, size, duration).
- **Privacy**: the selected video and the output GIF are sensitive session data; nothing persists, nothing is logged, export is Save As-only with a sanitized suggested filename, and previews use object URLs revoked on every path.

## 4. Decision points requiring product-owner approval

1. **Input budget**: accept the 16 MiB version-1 reconciliation (matching the PDF Converter precedent) or schedule the streamed/native decode path first (larger scope, version-1.1 candidate).
2. **Codec floor and store wording**: approve listing MP4/H.264 as the supported baseline with honest "many WebM/VP9 inputs also supported" phrasing, subject to the device matrix.
3. **Proceed or defer**: as with Audio Recorder, ADR 0004 requires all 87 tools, so deferral is a deliberate scope decision, not a silent one.

## 5. Device evidence still required after approval (blocks #112 closure)

- Decode behavior across the device codec matrix (H.264 baseline, VP9, HEVC/AV1 absence), including a distinct unsupported state on a device that cannot decode the input.
- Rotation-metadata correctness on portrait-recorded phone videos.
- Memory ceiling on a maximum-length take (30 s, 100 frames, 640 px) on a mid-range device; renderer responsiveness during extraction; no-frame drop above 700 ms.
- Low-storage Save As failure recovery; interruption (call, backgrounding) mid-conversion; cancellation leaving no retained buffers.
- Emulator evidence does not substitute for the codec/matrix rows.

## 6. Alternatives considered

- **`ffmpeg.wasm`**: rejected — multi-megabyte dependency, shared-array-buffer requirements, and a 16 KB/native-library review surface vastly heavier than the tool's value; the plan's PDF.js exception would not cover it.
- **WebCodecs `VideoDecoder` pipeline**: more deterministic frame timing, but device-variable hardware decoder behavior and configuration probing complexity for version 1; revisitable if the `<video>`-seek path proves inadequate on device.
- **Third-party GIF encoders (e.g., gif.js/gifenc)**: the upstream pure encoder already exists, is dependency-free, and is testable; adding a dependency contradicts the minimal-dependency policy without correctness gain.

## 7. Conclusion

Video to GIF is implementable within the existing architecture with no permission, dependency, or native-library changes: the work is a Worker restructure of a testable pure encoder plus honest limits. The binding risks are the 16 MiB input reconciliation and the device codec matrix, both of which need explicit product-owner sign-off recorded against #35 before #112 starts.
