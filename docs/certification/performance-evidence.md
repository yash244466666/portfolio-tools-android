# Performance certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #23; refreshed 2026-09-15 at `bd5b310`,
> 2026-10-30 for the 38-tool ADR 0026 UX/motion build, and 2026-11-02 for the
> 39-tool ADR 0027 build. Bundle, artifact, and driver measurements below are
> current as of the 2026-11-02 build; profiling-grade memory/responsiveness
> measurement still requires the physical-device matrix (#25) and remains open
> there.

## Current build (39-tool ADR 0027, 2026-11-02)

| Item              | Value                                                                                                                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 324.12 kB (101.44 kB gzip), +3.97 kB (+1.23 kB gzip) for the new registry entry and metadata                                                                                                                   |
| Global stylesheet | 50.32 kB (10.17 kB gzip)                                                                                                                                                                                       |
| Tool chunks       | 58 emitted JS chunks: 39 lazy tool chunks plus shared code. Internet Speed Meter is 13.65 kB (4.71 kB gzip); no implementation ships in the main chunk                                                         |
| Workers           | `pdf.worker.min` 1,269.40 kB, fetched only by PDF Converter; no new worker or dependency was added for the speed meter                                                                                         |
| Network behavior  | The live meter samples once per second only while foregrounded and stops on lifecycle inactive; the provider test is explicit, bounded to 8 MiB down / 4 MiB up / 15 s per phase / 40 s total, and cancellable |

The new tool adds no dependency and no permission. The release AAB grew
**2,722,171 → 2,731,400 bytes (+9,229 bytes, +0.34 %)**, consistent with one
lazy chunk plus the app-owned native bridge classes. The shipped shell remains
well inside the plan's "initial web payload ≤ 500 KiB gzip excluding lazy tool
chunks" target.

## Shipped-artifact size (39-tool ADR 0027 build, 2026-11-02)

| Variant                |     Bytes | SHA-256                                                            |
| ---------------------- | --------: | ------------------------------------------------------------------ |
| Debug APK              | 5,657,413 | `ccdca084b022dd31bff3b826a7ee177130cc90056506ac316ccb73a0904f7947` |
| Internal APK           | 5,657,425 | `2f18aad0606344fdf25c8bb1a895e4f307e4d61144e7447d001ad336ce5ce155` |
| Release AAB (unsigned) | 2,731,400 | `ad3c9db0bca9e5cc9aa3033616b0f830bfa61f9b144fd23e3f21849dc962cc29` |

## Installed-artifact behavior (39-tool run, 2026-11-02)

- On debug artifact `ccdca084…` (API 35 emulator, Android 15, WebView
  124.0.6367.219), the driver verified **39 enabled cards** and completed
  **52 PASS / 8 INFO / 4 PENDING_PHYSICAL / 0 FAIL (64 rows), exit 0**. The
  `tool.internet-speed-meter` row exercised the native counters and a real
  Cloudflare measurement, and `offline.speedTestState` verified the explicit
  test reports offline/timeout without a result under airplane mode.
- The driver probes 38 of the 39 enabled tools. Audio Recorder has no capture
  probe; its coverage is disclosure-only E2E because the microphone path needs
  a physical device.
- Connected instrumentation reported **13 tests, 0 failures, 2 phase-gated
  skips** on the re-run; the first run hit the known notification-dialog timing
  flake (`NotificationInstrumentedTest`) and the class/suite passed on the
  re-run. The host-orchestrated force-stop process-recreation script passed
  both processes.
- A provider-size finding is recorded: Cloudflare rejects a single download
  above 10,000,000 bytes with a 429 response that omits CORS headers, which a
  browser surfaces as a network failure. The download phase is capped at 8 MiB
  (safely below the provider limit) and the failure text now says the provider
  could not be reached rather than claiming the device is offline.

## Historical bundle and load budgets (38-tool UX build, 2026-10-30)

| Item              | Value                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 320.15 kB (100.21 kB gzip)                                                                                                                                                                                                                                                                                                                                                  |
| Global stylesheet | 50.28 kB (10.17 kB gzip)                                                                                                                                                                                                                                                                                                                                                    |
| Tool chunks       | 57 emitted JS chunks: 38 lazy tool chunks plus shared code; no tool implementation ships in the main chunk. The ADR 0025 chunks are Recipe Scaler 8.74 kB, Date Calculator 6.42 kB, and Random Picker 5.46 kB; the ADR 0026 sensor chunks are Level 4.67 kB, Compass 4.30 kB, Barometer 3.62 kB, Light Meter 2.82 kB, and Vibration Meter 2.89 kB (1.13–1.76 kB gzip each). |
| Workers           | `pdf.worker.min` 1,269.40 kB, bundled locally and fetched only by PDF Converter. The `regex.worker` and `gif-worker` from the 100-tool candidate are no longer emitted because their tools are lifecycle `removed`.                                                                                                                                                         |
| Sourcemaps        | Not emitted. Maps are opt-in via `VITE_SOURCEMAP=1`; the earlier unconditional setting shipped 123 `.map` files inside every artifact including the release AAB.                                                                                                                                                                                                            |

- The main chunk moved 313.36 → 320.15 kB (98.38 → 100.21 kB gzip) when the
  sensor service, five tools, the motion primitives, and their registry/icon
  entries were added. The stylesheet grew 45.78 → 50.28 kB for the motion
  primitives. The shipped shell is ~110 kB gzip including the stylesheet, well inside the
  plan's "initial web payload ≤ 500 KiB gzip excluding lazy tool chunks" target.
- App opens to a usable catalog without loading any tool library: the registry
  imports only metadata and every implementation remains a lazy import.
- The PDF worker's size is a deliberate tradeoff recorded with the PDF
  Converter review; it is fetched only when that tool is opened.
- Historical 100-tool figures are retained for comparison, not as current
  claims: main 323.57 kB (101.1 kB gzip), stylesheet 44.50 kB (8.98 kB gzip),
  `regex.worker` 1.47 kB and `gif-worker` 5.74 kB.

## Shipped-artifact size (38-tool UX build, 2026-10-30)

| Variant                | Bytes     | SHA-256                                                            |
| ---------------------- | --------- | ------------------------------------------------------------------ |
| Debug APK              | 5,623,578 | `b9ec3312ee25c8acbff4effbc1e002f249782f72a8b292849389e6e76243d1d4` |
| Internal APK           | 5,623,598 | `62ee8ae6f19ea7d5a7ed52e6f6255af100d3edc7b83aa4747699417eae4698ff` |
| Release AAB (unsigned) | 2,722,171 | `93bb27ad23ec046c6913bd720cfcd29cba19f486dbefb1f4874cb8671ba1fce3` |

The release AAB moved from 2,715,422 bytes (sensor build) to 2,722,171 bytes
(+6,749 bytes, +0.25 %) for the shared motion primitives and per-tool visual
feedback; no new dependency was added. Removing sourcemaps from the
shipped bundle had earlier cut the AAB by 36 % (4,657,495 → 2,965,204 bytes)
with no change to executed code; the plan's "Play compressed download ≤ 30 MiB"
target remains far away.

## Installed-artifact behavior (38-tool UX run, 2026-10-30)

- On debug artifact `b9ec3312…` (API 35 emulator, Android 15, WebView
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
- The first run of the motion artifact failed only the Back-key row, and the
  driver's Settings-app control probe failed identically; a re-run was green.
  This is the recorded emulator Back-delivery variance, not an app defect. Two
  sensor probes were also hardened to tolerate retained emulator sensor values
  and on-change light events. Connected instrumentation hit the known
  notification-dialog timing flake once; the class and the full suite passed on
  the re-run.
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
