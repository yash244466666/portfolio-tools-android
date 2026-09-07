# ADR 0015: Image Compression Limits and Content-Read Flow

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: device testing shows the 24 MP decoded-pixel bound or the decode-time memory spike is a problem, WebP/AVIF output is requested, or batch compression is proposed.

## Context

The audited upstream Image Compressor accepts a dropped file, decodes it with `new Image()`, draws to a canvas, and exports through a hidden `<a download>` anchor with object URLs never revoked. The plan flags exactly these hazards: unbounded decoded pixels (decompression bombs), no EXIF orientation handling, undisclosed metadata stripping, and the forbidden download pattern. The bounded/streamed `content://` read bridge (ADR 0009) exists precisely for this first file-consuming tool.

## Decision

Enable the `image-compressor` tool with an explicit limit set and the reviewed file bridges:

- **Input**: system picker only (`files.pick`, SAF `ACTION_OPEN_DOCUMENT` on Android) restricted to PNG/JPEG/WebP with a 16 MiB byte bound — matching the content-read bridge cap so oversized content never crosses the bridge. Bytes arrive through `files.readContent` (bounded copy); on Android no `content://` URI is ever assumed to be a filesystem path.
- **Decode**: `createImageBitmap(blob, { imageOrientation: "from-image" })`, which normalizes EXIF orientation before drawing, and `bitmap.close()` on every path including rejection. A 24-megapixel decoded-pixel bound rejects oversized images with a typed recovery message before any drawing or re-encoding.
- **Resize**: discrete maximum-width options (800/1280/1920/2560); aspect-preserving downscale only, never upscale, at least one pixel per side — computed by a pure, canvas-free `planResize`.
- **Re-encode**: PNG stays PNG (lossless); JPEG and WebP re-encode as JPEG with the quality slider (0.1–1, clamped). Canvas re-encoding strips EXIF/camera/location metadata; the UI discloses this. The preview `<img>` uses an object URL that is revoked on every replacement and on unmount; the shared/saved file is the exact encoded byte set shown in the preview.
- **Export**: Share (`cache/share/` + system share sheet) and Save (SAF `ACTION_CREATE_DOCUMENT`) through the `FileService` bridges. Output above the 5 MiB Save As bridge bound fails with the typed too-large state. The upstream hidden download anchor is not copied.

## Alternatives considered

- **Native image decoding (Android `BitmapFactory`)**: rejected for this milestone; adds a native bridge surface. Decode is bounded by the input byte cap and the pixel bound; the residual decode-time memory spike is documented and assigned to device QA.
- **WebP output**: rejected; JPEG covers the quality-slider use case and WebP encode support varies across WebView versions.
- **Direct `URL.createObjectURL(pickedFile)` use (upstream)**: rejected on Android, where picked documents have no File object; every byte goes through the versioned read bridge instead.
- **Quality slider for PNG**: rejected; PNG is lossless and the slider would be a lie.

## Consequences

- The first file-consuming tool proves the full SAF pick → bounded read → decode → generate → share/save path with the cache janitor (ADR 0006) sweeping abandoned outputs.
- The 1×1-pixel floor and integer rounding keep hostile aspect ratios valid.
- A hostile image can still spike memory during the engine's internal decode even though the tool immediately rejects it afterwards; the input byte cap bounds the attack, and real-device validation is recorded as pending (issues #17/#18).
- Device evidence (decoder behavior on real WebViews, memory on mid-range devices, share sheet, Save As) remains assigned to issues #17/#18; automated, E2E (real file chooser → decode → canvas → re-encode), and artifact gates pass.
