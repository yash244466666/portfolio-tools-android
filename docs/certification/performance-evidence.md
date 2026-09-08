# Performance certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #23. Bundle and artifact evidence is
> automated; profiling-grade memory/responsiveness measurement requires the
> physical-device matrix (#25) and remains open there.

## Bundle and load budgets (measured at the #21 matrix gate)

| Item              | Value                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Main index chunk  | 307.40 kB (95.87 kB gzip)                                                                                                    |
| Global stylesheet | 43.62 kB (8.78 kB gzip)                                                                                                      |
| Tool chunks       | Lazy per-tool chunks (wrapper chunks ~0.2 kB + shared libs split on demand); no tool ships in the main chunk                 |
| Workers           | `regex.worker` 1.47 kB, `gif-worker` 5.74 kB, `pdf.worker.min` 1,269 kB — all bundled locally and loaded only by their tools |

- App opens to a usable catalog without loading any tool library: lazy
  imports guarantee the main chunk carries no tool implementation.
- The PDF worker's size is a deliberate tradeoff recorded with the PDF
  Converter review; it is fetched only when that tool is opened.

## Installed-artifact behavior (checklist driver, two consecutive green runs)

- Bounded cold launches with verified retries on the API 35 emulator
  (Android 15, WebView 124): the driver launches, verifies the bundled
  origin, and interacts with all 100 tools without unresponsive-flow
  failures.
- Cancellation is component-tested where budgets demand it (regex Worker
  termination with wall-clock budget, PDF/image decode caps, GIF generation
  token/cancellation), and the process-recreation script proves
  reconstruction across force-stop.

## Pending physical-device rows (tracked with #25)

- Startup timing, long-task (100 ms input) and unresponsive-frame (700 ms)
  budgets, continuous 60 fps, and memory-return-to-baseline measurement on
  an approved mid-range physical device and the WebView update matrix.
- Emulator measurements are not evidence for these rows.
