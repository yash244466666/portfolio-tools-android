# Performance certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #23; refreshed 2026-09-15 at `bd5b310` and
> 2026-10-30 for the 33-tool ADR 0025 scope. Bundle, artifact, and driver
> measurements below are from the 33-tool build; profiling-grade
> memory/responsiveness measurement still requires the physical-device matrix
> (#25) and remains open there.

## Bundle and load budgets (33-tool build, 2026-10-30)

| Item              | Value                                                                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 313.36 kB (98.38 kB gzip)                                                                                                                                                                                                                                         |
| Global stylesheet | 44.64 kB (9.02 kB gzip)                                                                                                                                                                                                                                           |
| Tool chunks       | 50 emitted JS chunks: 33 lazy tool chunks plus shared code; no tool implementation ships in the main chunk. The three ADR 0025 chunks are Recipe Scaler 8.74 kB (3.14 kB gzip), Date Calculator 6.42 kB (2.50 kB gzip), and Random Picker 5.46 kB (2.19 kB gzip). |
| Workers           | `pdf.worker.min` 1,269.40 kB, bundled locally and fetched only by PDF Converter. The `regex.worker` and `gif-worker` from the 100-tool candidate are no longer emitted because their tools are lifecycle `removed`.                                               |
| Sourcemaps        | Not emitted. Maps are opt-in via `VITE_SOURCEMAP=1`; the earlier unconditional setting shipped 123 `.map` files inside every artifact including the release AAB.                                                                                                  |

- The main chunk moved 311.11 → 313.36 kB (97.68 → 98.38 kB gzip) when the
  three tools and their registry/icon entries were added. The shipped shell is
  ~107 kB gzip including the stylesheet, well inside the plan's "initial web
  payload ≤ 500 KiB gzip excluding lazy tool chunks" target.
- App opens to a usable catalog without loading any tool library: the registry
  imports only metadata and every implementation remains a lazy import.
- The PDF worker's size is a deliberate tradeoff recorded with the PDF
  Converter review; it is fetched only when that tool is opened.
- Historical 100-tool figures are retained for comparison, not as current
  claims: main 323.57 kB (101.1 kB gzip), stylesheet 44.50 kB (8.98 kB gzip),
  `regex.worker` 1.47 kB and `gif-worker` 5.74 kB.

## Shipped-artifact size (33-tool build, 2026-10-30)

| Variant                | Bytes     | SHA-256                                                            |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| Debug APK              | 5,620,738 | `702c5c26fe22e0920c51a476f5447efec18a05a6f928c098ca2c1e19d20d63b3` |
| Internal APK           | 5,620,758 | `ab09e6ceb1ff782dc08c620db44b8c5c3bb36fb61cb223fb01ead76e448f559d` |
| Release AAB (unsigned) | 2,700,405 | `dd11b9a3fcf8dccdbf303f6495ab0e794c87104bcf0450bebf19a06ce37dcc78` |

The release AAB moved from 2,691,357 bytes (30-tool build) to 2,700,405 bytes
(+9,048 bytes, +0.34 %) for the three new tools. Removing sourcemaps from the
shipped bundle had earlier cut the AAB by 36 % (4,657,495 → 2,965,204 bytes)
with no change to executed code; the plan's "Play compressed download ≤ 30 MiB"
target remains far away.

## Installed-artifact behavior (33-tool run, 2026-10-30)

- On debug artifact `702c5c26…` (API 35 emulator, Android 15, WebView
  124.0.6367.219), the driver verified **33 enabled cards** and completed
  **45 PASS / 8 INFO / 4 PENDING_PHYSICAL / 0 FAIL (57 rows), exit 0**. The
  three new tools passed their per-tool probes (recipe scaling, month-end date
  arithmetic, secure list/number draw).
- The driver probes 32 of the 33 enabled tools. Audio Recorder has no capture
  probe; its coverage is disclosure-only E2E because the microphone path needs
  a physical device. Video to GIF, which shared that treatment in the 100-tool
  candidate, is cut by ADR 0023 and no longer ships a worker.
- The first run of the same artifact failed only the Back-key row, and the
  driver's Settings-app control probe failed identically; a re-run was green.
  This is the recorded emulator Back-delivery variance, not an app defect.
- Cancellation is component-tested where budgets demand it (PDF/image decode
  caps, GIF generation token/cancellation), and the host-orchestrated
  force-stop process-recreation script passes both phases on this artifact.
- **Not measured here:** startup timing, long-task (100 ms input) and
  unresponsive-frame (700 ms) budgets, continuous 60 fps, and
  memory-return-to-baseline on an approved mid-range physical device. Emulator
  measurements are not evidence for those rows.

## Pending physical-device rows (tracked with #25)

- Startup timing, long-task (100 ms input) and unresponsive-frame (700 ms)
  budgets, continuous 60 fps, and memory-return-to-baseline measurement on
  an approved mid-range physical device and the WebView update matrix.
- Emulator measurements are not evidence for these rows.
