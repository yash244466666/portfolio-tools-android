# Performance certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #23; refreshed 2026-09-15 at `bd5b310` for the
> then-current 100-tool candidate. Every measurement recorded below was taken on
> that 100-tool scope; ADR 0023 has since rescoped version 1 to 30 tools, and
> this dossier has **not** been re-measured against the 30-tool candidate. Bundle
> and artifact evidence is automated; profiling-grade memory/responsiveness
> measurement requires the physical-device matrix (#25) and remains open there.

## Bundle and load budgets (re-measured 2026-09-15 at `bd5b310`; 100-tool scope)

| Item              | Value                                                                                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 323.57 kB (101.1 kB gzip)                                                                                                                                                                                                                           |
| Global stylesheet | 44.50 kB (8.98 kB gzip)                                                                                                                                                                                                                             |
| Tool chunks       | Lazy per-tool chunks (wrapper chunks ~0.2 kB + shared libs split on demand); no tool ships in the main chunk                                                                                                                                        |
| Workers           | `regex.worker` 1.47 kB, `gif-worker` 5.74 kB, `pdf.worker.min` 1,269 kB — all bundled locally and loaded only by their tools                                                                                                                        |
| Sourcemaps        | Not emitted. `vite.config.ts` previously set `sourcemap: true` unconditionally, so 123 `.map` files (7.02 of 10.44 MiB of the bundled payload) shipped inside every artifact including the release AAB. Maps are now opt-in via `VITE_SOURCEMAP=1`. |

- These are 100-tool-scope figures and none has been re-measured for the
  30-tool candidate. The lazy tool-chunk set is the part the rescope changes:
  `regex.worker` belongs to Regex Tester and `gif-worker` to Video to GIF, both
  cut by ADR 0023, while `pdf.worker.min` stays with the retained PDF
  Converter. The 30-tool candidate's emitted worker set and chunk inventory are
  not measured in this dossier.
- The main chunk grew 307.40 → 323.57 kB (95.87 → 101.1 kB gzip) across the
  five UI pull requests #203–#207. Against the plan's "initial web payload
  ≤ 500 KiB gzip excluding lazy tool chunks" target, the shipped shell is
  ~110 kB gzip, so the budget holds with wide margin.
- App opens to a usable catalog without loading any tool library: lazy
  imports guarantee the main chunk carries no tool implementation.
- The PDF worker's size is a deliberate tradeoff recorded with the PDF
  Converter review; it is fetched only when that tool is opened.

## Shipped-artifact size (clean build at `bd5b310`, 2026-09-15; 100-tool scope)

| Variant                | Bytes     | SHA-256                                                            |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| Debug APK              | 5,810,251 | `febb136fd161e00bd424899b26641ad792f63eead61d1faf9dc21d31447c9928` |
| Internal APK           | 5,810,267 | `26f1b7ea9e76e33688a6b412330f92fb68d4338e4b3cbffeddd7b62c23a9d2b8` |
| Release AAB (unsigned) | 2,965,204 | `5c93e87429f26da969ce32040acd4b6612e8701fb3be9573c311e3fbd5b8c32a` |

Removing sourcemaps from the shipped bundle cut the release AAB by 36 %
(4,657,495 → 2,965,204 bytes) and the debug APK by 29 %, with no change to the
executed code. The plan's "Play compressed download ≤ 30 MiB" target was never
at risk, but download size drives acquisition, so the reduction is kept.

Those sizes and hashes are the 100-tool artifact and must not be read as the
30-tool candidate's. No 30-tool build has been measured in this dossier, so no
byte size, SHA-256, or size-reduction percentage is recorded for it; the
rescope removes 70 tools' lazy chunks from the shipped payload, so the earlier
figures will not apply unchanged.

## Installed-artifact behavior (checklist driver; 100-tool run at `bd5b310`)

- Bounded cold launches with verified retries on the API 35 emulator
  (Android 15, WebView 124.0.6367.219): the driver launches, verifies the
  bundled origin, and interacts with 98 of the 100 enabled tools without
  unresponsive-flow failures. **112 PASS / 6 INFO / 4 PENDING_PHYSICAL /
  0 FAIL, exit 0**, on artifact `febb136f…` at `bd5b310`. The 98-of-100 count
  and the PASS tally are the 100-tool scope; the driver now runs only the 30
  retained tools' probes, and no 30-tool run is recorded in this dossier.
- Audio Recorder has **no** driver probe; its coverage is disclosure-only E2E
  (the microphone interaction path needs a physical device anyway). Video to
  GIF had the same disclosure-only E2E coverage and is cut by ADR 0023. This
  dossier previously attributed Android instrumentation coverage to both — that
  was wrong and is corrected here.
- Cancellation is component-tested where budgets demand it (regex Worker
  termination with wall-clock budget, PDF/image decode caps, GIF generation
  token/cancellation), and the process-recreation script proves
  reconstruction across force-stop.

## Pending physical-device rows (tracked with #25)

- Startup timing, long-task (100 ms input) and unresponsive-frame (700 ms)
  budgets, continuous 60 fps, and memory-return-to-baseline measurement on
  an approved mid-range physical device and the WebView update matrix.
- Emulator measurements are not evidence for these rows.
