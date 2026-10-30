# Performance certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #23; refreshed 2026-09-15 at `bd5b310` and
> 2026-10-30 for the 38-tool ADR 0026 scope. Bundle, artifact, and driver
> measurements below are from the 38-tool build; profiling-grade
> memory/responsiveness measurement still requires the physical-device matrix
> (#25) and remains open there.

## Bundle and load budgets (38-tool build, 2026-10-30)

| Item              | Value                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 319.90 kB (100.15 kB gzip)                                                                                                                                                                                                                                                                                                                                                  |
| Global stylesheet | 45.78 kB (9.20 kB gzip)                                                                                                                                                                                                                                                                                                                                                     |
| Tool chunks       | 56 emitted JS chunks: 38 lazy tool chunks plus shared code; no tool implementation ships in the main chunk. The ADR 0025 chunks are Recipe Scaler 8.74 kB, Date Calculator 6.42 kB, and Random Picker 5.46 kB; the ADR 0026 sensor chunks are Level 4.67 kB, Compass 4.30 kB, Barometer 3.62 kB, Light Meter 2.82 kB, and Vibration Meter 2.89 kB (1.13–1.76 kB gzip each). |
| Workers           | `pdf.worker.min` 1,269.40 kB, bundled locally and fetched only by PDF Converter. The `regex.worker` and `gif-worker` from the 100-tool candidate are no longer emitted because their tools are lifecycle `removed`.                                                                                                                                                         |
| Sourcemaps        | Not emitted. Maps are opt-in via `VITE_SOURCEMAP=1`; the earlier unconditional setting shipped 123 `.map` files inside every artifact including the release AAB.                                                                                                                                                                                                            |

- The main chunk moved 313.36 → 319.90 kB (98.38 → 100.15 kB gzip) when the
  sensor service, five tools, and their registry/icon entries were added. The
  shipped shell is ~109 kB gzip including the stylesheet, well inside the
  plan's "initial web payload ≤ 500 KiB gzip excluding lazy tool chunks" target.
- App opens to a usable catalog without loading any tool library: the registry
  imports only metadata and every implementation remains a lazy import.
- The PDF worker's size is a deliberate tradeoff recorded with the PDF
  Converter review; it is fetched only when that tool is opened.
- Historical 100-tool figures are retained for comparison, not as current
  claims: main 323.57 kB (101.1 kB gzip), stylesheet 44.50 kB (8.98 kB gzip),
  `regex.worker` 1.47 kB and `gif-worker` 5.74 kB.

## Shipped-artifact size (38-tool build, 2026-10-30)

| Variant                | Bytes     | SHA-256                                                            |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| Debug APK              | 5,623,407 | `13ef843bc29d634d020465a86f6aa83c0142cc1cb71d368f25aa95b2f76942e7` |
| Internal APK           | 5,623,427 | `8b2835dc925364c1bc203e193925a53be77e0b6652e85b997bc9a6b01f0ebb83` |
| Release AAB (unsigned) | 2,715,422 | `1ebf79f2886eaba55acca47ddd4860abe627db232d757f8792669372fab6e1a5` |

The release AAB moved from 2,700,405 bytes (33-tool build) to 2,715,422 bytes
(+15,017 bytes, +0.56 %) for the sensor platform and five new tools. Removing sourcemaps from the
shipped bundle had earlier cut the AAB by 36 % (4,657,495 → 2,965,204 bytes)
with no change to executed code; the plan's "Play compressed download ≤ 30 MiB"
target remains far away.

## Installed-artifact behavior (38-tool run, 2026-10-30)

- On debug artifact `13ef843b…` (API 35 emulator, Android 15, WebView
  124.0.6367.219), the driver verified **38 enabled cards** and completed
  **50 PASS / 8 INFO / 4 PENDING_PHYSICAL / 0 FAIL (62 rows), exit 0**. The
  five sensor probes passed against the emulator's virtual accelerometer,
  magnetometer, pressure, and light sensors; the Level, Compass, Barometer,
  and Light probes inject values and the Vibration probe accepts a numeric
  reading or the honest unsupported state.
- The driver probes 37 of the 38 enabled tools. Audio Recorder has no capture
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
