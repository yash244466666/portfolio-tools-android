# ADR 0011: QR Generation and Generated-Image Sharing

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: another tool needs generated binary-image output, the `qrcode` library releases a new version, or device testing shows scanner or memory problems at the 512 px size.

## Context

QR Generator is the sixth vertical-slice tool and the first tool with a generated binary-image output. The audited upstream implementation draws with the `qrcode` library directly into a canvas and exports through a hidden `<a download>` anchor — a pattern forbidden in this repository because tools must route files through the platform `FileService` so Android sharing uses the reviewed cache/FileProvider path with deterministic cleanup. The upstream also rendered white modules on a transparent background for its dark theme, which is hostile to scanners, and applied a 2-module quiet zone against the QR specification's recommendation of 4.

## Decision

Enable the `qr-generator` tool with a pure generation module and the existing generated-file bridges:

- **Dependency**: pin `qrcode` 1.5.4 (MIT) with `@types/qrcode` 1.5.6 for typings. The library is a widely used QR-spec implementation, bundled offline with no network or native surface. No other new dependency is introduced; the addition follows the dependency policy (exact pin, lockfile reviewed, license recorded in `docs/SOURCE_PROVENANCE.md`).
- **Typed generation** (`src/tools/qr-generator/qr.ts`): the library is consulted only behind typed results. Input is capped at 4 000 UTF-8 bytes (below the 2 953-byte version-40/level-L byte-mode maximum, bounding generation cost); per-level capacity failures become an invalid state that suggests level L or shorter text.
- **Rendering**: black modules on a white background with the spec 4-module quiet zone, at whole-pixel module scaling. Canvas output dimensions come from a pure `planQrRender` (testable without a canvas, and asserted in E2E against the on-screen description), independent of the CSS display size — the plan's exact output size is what the PNG contains.
- **Accessibility**: the canvas carries `role="img"` with a non-echoing label, and a visible text equivalent states version, module count, exact pixel dimensions, error-correction level, and encoded byte count. If a 2D context is unavailable the tool degrades to an explicit unsupported note while sharing/saving still work.
- **Sharing**: the PNG is encoded from the same canvas bytes shown on screen and exported exclusively through `FileService.share` (Android: `cache/share/` + system share sheet, swept by the generated-cache janitor) and `FileService.saveAs` (SAF `ACTION_CREATE_DOCUMENT`). No hidden download anchors, no direct Capacitor use, no new permissions — the 5 MiB generated-file bridge bound is far above any QR PNG.
- Nothing is persisted or logged; text input clears only through the explicit Reset.

## Alternatives considered

- **Keep the upstream hidden-anchor download**: rejected; forbidden pattern, and it bypasses the reviewed FileProvider/cache-retention path.
- **A different QR library (e.g. `qr-code-styling`, `qrcode.react`)**: rejected; `qrcode` is the smallest reviewed dependency that exposes a pure `create()` data model, letting rendering and export stay repository-owned and testable.
- **White-on-transparent rendering for dark themes**: rejected for scannability; the QR image is a scanned artifact, not UI chrome, so it is always black on white.
- **2-module quiet zone (upstream margin)**: rejected; the specification recommends 4 and scanner reliability wins over 2 modules of compactness.

## Consequences

- The tool chunk bundles the QR encoder (29.29 kB / 10.94 kB gzip lazy chunk); the main bundle is unaffected.
- Generated PNGs are identical to the previewed canvas bytes, so preview and output cannot diverge.
- Device evidence (real scanner round-trip, share-sheet behavior, TalkBack) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
- Future generated-image tools should reuse this pattern: pure plan → canvas → same-bytes export through `FileService`.
