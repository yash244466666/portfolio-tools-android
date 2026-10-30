# Physical Android Device Checklist

> Status: not yet executed on a physical device. Scope: the 38-tool public version-1 scope approved by ADR 0026 (2026-10-30), adding five permission-free sensor tools to ADR 0025's 33-tool scope. Automated emulator pre-verification is green on this scope: the 2026-10-30 38-tool run recorded **50 PASS / 8 INFO / 4 PENDING_PHYSICAL / 0 FAIL**; the earlier 2026-09-07 (25-tool), 2026-09-08 (100-tool), and 2026-09-15/2026-10-30 (30/33-tool) runs remain as history. Physical-device execution is still pending. Do not check an item without recording device/API/WebView/build evidence.

## Test record

| Field                          | Value                                |
| ------------------------------ | ------------------------------------ |
| Date/time                      | Pending                              |
| Tester                         | Pending                              |
| Git commit                     | Pending                              |
| APK/AAB hash                   | Pending                              |
| Install source                 | Pending: local debug / Play internal |
| Device model                   | Pending                              |
| Android/API                    | Pending                              |
| Android System WebView version | Pending                              |
| Navigation mode                | Pending                              |
| Available storage/memory class | Pending                              |

## Automated emulator pre-verification (2026-09-07 — 25-tool foundation artifact)

Executed with `scripts/device-checklist-emulator.mjs`, which drives the installed
debug artifact's WebView over the Chrome DevTools Protocol (raw page-target
WebSocket; Android WebView does not support Playwright's `connectOverCDP`).
Every CDP command is bounded, cold launches are verified and retried, and the
driver reconnects after Activity-recreating configuration changes. Two
consecutive runs of the final driver completed green.

| Field                          | Value                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-09-07 (two consecutive green runs of the final driver)                                        |
| Tester                         | Automated driver script, orchestrated by the coding agent                                          |
| Git commit                     | The change introducing the driver (branch `test/18-device-checklist`; artifact built at `e6620e1`) |
| APK hash                       | SHA-256 `4405784099c87b35faf1c762fed3715770a25ed43488e72da273d51b9a3b4543` (`app-debug.apk`)       |
| Install source                 | Local Gradle debug build via `adb install -r`                                                      |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                                 |
| Android/API                    | Android 15 (SDK 35)                                                                                |
| Android System WebView version | 124.0.6367.219                                                                                     |
| Security patch                 | 2024-09-05                                                                                         |
| Result                         | 39 PASS, 6 INFO, 4 PENDING_PHYSICAL, 0 FAIL (49 records)                                           |

Automated coverage that passed:

- Cold launch on the bundled production origin `https://app.yash.tools`
  (`isSecureContext` true, no route), catalog rendering all 25 enabled tool
  cards, catalog search filtering, labeled primary navigation with
  `aria-current`, system Back returning from a tool to the catalog, and theme
  choice restoring across process reconnect.
- Per-tool interaction for all 25 enabled tools on the installed artifact,
  including standard vectors on the artifact (SHA-256 of `abc`, epoch 0 →
  1970, Base64/percent-encoding vectors), Markdown sanitization (inline
  `<script>` stripped), QR canvas render, JSON format/invalid states, Notes
  autosave accounting, Pomodoro start/reset, and live Currency/DNS provider
  calls with attribution.
- Offline behavior under airplane mode (Currency Converter and DNS Lookup
  show offline state; local tools remain usable) and recovery after
  connectivity returns.
- Process death: force-stop then relaunch restores the durable theme and
  starts sensitive tool input empty.
- Landscape rotation (auto-rotate disabled, user rotation lock) relayouts
  without horizontal overflow; 200% font scale relayouts without horizontal
  overflow; "Don't keep activities" home/relaunch recovers with theme intact.

Recorded as INFO, not PASS, on this emulator image:

- Soft-IME appearance on focus (hardware-keyboard AVD profile suppresses the
  soft keyboard; requires physical-device IME verification).

Recorded as PENDING_PHYSICAL (not automatable on this emulator image):

- TalkBack reading order and spoken feedback.
- Real Doze and OEM battery behavior for timer alerts.
- OEM split-screen/multi-window behavior.
- WebView version-update smoke matrix.

This emulator record supplements but does not replace the physical-device
checklist below; every checkbox remains unchecked until physical-device
evidence exists.

## Automated emulator pre-verification (2026-09-08 — 100-tool artifact)

Re-executed `scripts/device-checklist-emulator.mjs` against the rebuilt debug
artifact containing all 100 enabled version-1 tools (ADR 0004/0021/0022).
Two consecutive green runs of the fixed driver completed. The first 100-tool
attempt reported 2 FAIL, both driver-side probe defects rather than tool
defects: the dice-roller probe anchored `^…$` against whole-page
`innerText` without the multiline flag, and `clickCheckbox` only accepted an
`aria-label` while the Fuel and Trip Cost Calculator exposes its round-trip
toggle through a wrapping `<label>`. Both probes were fixed and the two
consecutive green runs below used the fixed driver.

| Field                          | Value                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-09-08 (two consecutive green runs of the fixed driver)                                  |
| Tester                         | Automated driver script, orchestrated by the coding agent                                    |
| Git commit                     | Artifact built at `14a0f80` (batch 16); driver probe fixes in the evidence commit            |
| APK hash                       | SHA-256 `4ec71a06fa088cddbabb4e6c6185fafecd2251b76412191d28452adbe40bc08c` (`app-debug.apk`) |
| Install source                 | Local Gradle debug build via `adb install -r`                                                |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                           |
| Android/API                    | Android 15 (SDK 35)                                                                          |
| Android System WebView version | 124.0.6367.219                                                                               |
| Security patch                 | 2024-09-05                                                                                   |
| Result                         | 112 PASS, 6 INFO, 4 PENDING_PHYSICAL, 0 FAIL (122 records)                                   |

Automated coverage that passed:

- Cold launch on the bundled production origin, catalog rendering all 100
  enabled tool cards, catalog search filtering, labeled primary navigation
  with `aria-current`, system Back, and theme restoration across process
  reconnect.
- Per-tool interaction for all 100 enabled tools on the installed artifact,
  including the batch 14–16 additions: aspect-ratio, CSS unit,
  discount/tax, BMI, unit-price comparison, word frequency, text-binary,
  reading time, date difference with business days, time-zone gap handling,
  loan EMI with amortization, WCAG 2.2 color contrast, dice roller with
  repeat-last roll, and fuel/trip cost with round trip and passenger split.
- Offline behavior under airplane mode, process death and relaunch,
  landscape rotation, 200% text scale, and "Don't keep activities"
  recovery — the same environment rows as the 2026-09-07 run.

Recorded as INFO and PENDING_PHYSICAL items are unchanged from the
2026-09-07 record: soft-IME on the hardware-keyboard AVD profile (INFO), and
TalkBack, Doze/OEM battery, OEM split-screen, and the WebView update matrix
(PENDING_PHYSICAL). This record supplements but does not replace the
physical-device checklist below.

This record was measured on the then-current 100-tool candidate (ADR 0022
scope). The version-1 release candidate is now the 30-tool scope of ADR 0023,
so these rows were re-measured on a 30-tool artifact in the 2026-09-15 record
below; the results above are kept as measured and do not describe the current
scope.

## Automated emulator pre-verification (2026-09-15 — 30-tool artifact)

`node scripts/device-checklist-emulator.mjs`, run from the repository root,
re-executed the installed debug artifact against the 30-tool public version-1
scope approved by ADR 0023; the driver now scopes its probes to the 30
retained tools. The run completed green — 42 PASS, 8 INFO, 4 PENDING_PHYSICAL,
0 FAIL across 54 rows, driver exit 0.

Two driver mis-reports were corrected in the test harness; neither is an app
defect:

- The Back-key probe no longer depends on navigation mode. This run delivered
  Back correctly while `navigation_mode=2` (gesture), and an earlier attempt at
  `navigation_mode=0` saw Back silently dropped system-wide — the system
  Settings app ignored it identically. The driver therefore asserts the
  capability (a Settings-app control probe) instead of the configuration, and
  records a FAIL for that row rather than aborting the whole checklist when
  Back is not delivered.
- Two driver probes referenced tools ADR 0023 cut (`hash-generator` for the
  Back and IME-focus probes, and `hash-generator` again for the process-death
  probe), and the catalog search probe queried `hash`, which now matches
  nothing. They were repointed to retained tools: `unit-converter` for the
  Back and IME-focus probes, and `case-converter` for the process-death
  empty-input assertion — chosen because its input starts empty and is never
  persisted, where Unit Converter's From field legitimately defaults to `1`.

| Field                          | Value                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-09-15 (evening run)                                                                     |
| Tester                         | Automated driver script, orchestrated by the coding agent                                    |
| Artifact                       | `android/app/build/outputs/apk/debug/app-debug.apk` (versionName `1.0-debug`)                |
| APK hash                       | SHA-256 `a89e2d6a492469fcdc9332e21702f91af52ef4b45f179320ceff50b104c87f37` (`app-debug.apk`) |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                           |
| Android/API                    | Android 15 (SDK 35)                                                                          |
| Android System WebView version | 124.0.6367.219                                                                               |
| Security patch                 | 2024-09-05                                                                                   |
| Result                         | 42 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL (54 rows), driver exit 0                         |

Automated coverage that passed:

- `shell.catalogRendersAllEnabledTools` verified all 30 enabled tool cards of
  the retained version-1 scope on the installed artifact.
- `shell.systemBackReturnsToCatalog` passed: the system Back key returned the
  app from a tool to the catalog.

New control rows added by this run, recorded as INFO:

- `device.backKeyDelivered` confirms `input keyevent 4` propagates, by driving
  the system Settings app and observing the activity change.
- `device.navigationMode` is now reported for diagnosis only.

Recorded as PENDING_PHYSICAL (not automatable on this emulator image), the same
four rows as the earlier runs:

- TalkBack (not bundled with the emulator image).
- Real Doze and OEM battery behavior for timer alerts.
- OEM split-screen/multi-window behavior.
- WebView version-update smoke matrix.

This emulator record supplements but does not replace the physical-device
checklist below.

## Automated emulator pre-verification (2026-10-30 — audit-fix artifact)

`node scripts/device-checklist-emulator.mjs` was re-run on the debug APK built
from the 2026-10-30 audit fixes. The driver exited 0 with **42 PASS, 8 INFO,
4 PENDING_PHYSICAL, 0 FAIL** (54 rows); the same four physical-only rows remain
pending (TalkBack, Doze/OEM alerts, OEM multi-window, WebView-upgrade matrix).

| Field                          | Value                                                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-10-30 (automated run)                                                                                                                                                  |
| Tester                         | Automated driver script, orchestrated by the coding agent                                                                                                                   |
| Artifact                       | `android/app/build/outputs/apk/debug/app-debug.apk` (versionName `1.0-debug`)                                                                                               |
| APK hash                       | SHA-256 `0ab5bfd0f242e6add54291abd46d528a28af3869d3b08404a2c1311a9fea95f6` (`app-debug.apk`, final build; the earlier same-day `875d71f3…` build passed the same checklist) |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                                                                                                          |
| Android/API                    | Android 15 (SDK 35)                                                                                                                                                         |
| Android System WebView version | 124.0.6367.219                                                                                                                                                              |
| Security patch                 | 2024-09-05                                                                                                                                                                  |
| Result                         | 42 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL (54 rows), driver exit 0                                                                                                        |

The same artifact also passed the connected instrumentation suite (13 tests,
0 failures, 2 phase-gated skips) and both phases of the host-orchestrated
force-stop process-recreation script. That run exposed a stale-scope test
defect, not an app defect: `BundledAppInstrumentedTest` and
`ProcessRecreationInstrumentedTest` still navigated to the ADR 0023-cut
`hash-generator`, so the activity-recreation case timed out. Both were
repointed to the enabled, session-only Case Converter (`#/tool/case-converter`,
`#case-input`) before the green run.

A later same-day build added the bidi-safe generated-filename policy. The
checklist was re-run on that final artifact (`0ab5bfd0…`) with the same
42/8/4/0 result, and the connected suite re-ran green. The first full connected
run on that build timed out in `NotificationInstrumentedTest` after the
permission dialog; the class passed in isolation and the full suite passed on
the re-run, so that row is recorded as emulator timing variance rather than an
app regression.

## Automated emulator pre-verification (2026-10-30 — 33-tool ADR 0025 scope)

`node scripts/device-checklist-emulator.mjs` ran against the debug APK built
from the ADR 0025 scope expansion (Recipe Scaler, Date Calculator, Random
Picker). The driver verified **33 enabled cards** and exited 0 with
**45 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL** (57 rows). The first run of the
same artifact failed only the Back-key row, and its Settings-app control probe
failed identically; the re-run above was green, so that is the recorded
emulator Back-delivery variance, not an app defect.

| Field                          | Value                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-10-30 (automated run, 33-tool scope)                                                    |
| Tester                         | Automated driver script, orchestrated by the coding agent                                    |
| Artifact                       | `android/app/build/outputs/apk/debug/app-debug.apk` (versionName `1.0-debug`)                |
| APK hash                       | SHA-256 `702c5c26fe22e0920c51a476f5447efec18a05a6f928c098ca2c1e19d20d63b3` (`app-debug.apk`) |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                           |
| Android/API                    | Android 15 (SDK 35)                                                                          |
| Android System WebView version | 124.0.6367.219                                                                               |
| Security patch                 | 2024-09-05                                                                                   |
| Result                         | 45 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL (57 rows), driver exit 0                         |

The same artifact passed the connected instrumentation suite (13 tests, 0
failures, 2 phase-gated skips) and both phases of the force-stop
process-recreation script. The three new tools are session-only, add no
permission or network provider, and are covered by pure and component tests
plus their installed-artifact probes.

## Automated emulator pre-verification (2026-10-30 — 38-tool ADR 0026 scope)

`node scripts/device-checklist-emulator.mjs` ran against the debug APK built
from the ADR 0026 sensor expansion. The driver verified **38 enabled cards**
and exited 0 with **50 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL** (62 rows).
The Level, Compass, Barometer, and Light probes inject the emulator's virtual
sensors and assert live readings; the Vibration probe accepts a numeric
reading or the honest unsupported state. The first run failed only the Back
row with the Settings control probe also failing; the immediate re-run was
green.

| Field                          | Value                                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Date/time                      | 2026-10-30 (automated run, 38-tool scope)                                                                                                                                           |
| Tester                         | Automated driver script, orchestrated by the coding agent                                                                                                                           |
| Artifact                       | `android/app/build/outputs/apk/debug/app-debug.apk` (versionName `1.0-debug`)                                                                                                       |
| APK hash                       | SHA-256 `b9ec3312ee25c8acbff4effbc1e002f249782f72a8b292849389e6e76243d1d4` (`app-debug.apk`, final UX/motion build; the earlier sensor build `13ef843b…` passed the same checklist) |
| Device model                   | `sdk_gphone64_x86_64` (Android Studio AVD `yash_tools_api35_test`)                                                                                                                  |
| Android/API                    | Android 15 (SDK 35)                                                                                                                                                                 |
| Android System WebView version | 124.0.6367.219                                                                                                                                                                      |
| Security patch                 | 2024-09-05                                                                                                                                                                          |
| Result                         | 50 PASS, 8 INFO, 4 PENDING_PHYSICAL, 0 FAIL (62 rows), driver exit 0                                                                                                                |

The same artifact passed the connected instrumentation suite (13 tests, 0
failures, 2 phase-gated skips) and both phases of the force-stop
process-recreation script. Sensor accuracy, calibration behavior, OEM sensor
variation, and real background-stop behavior remain physical-device rows; the
emulator injection is a smoke test, not hardware validation.

## Installation and startup

- [ ] Clean install succeeds.
- [ ] Upgrade install preserves approved preferences.
- [ ] App opens without a development server or internet connection.
- [ ] Cold start reaches a usable catalog without visible blank/frozen state.
- [ ] Debug/internal variants install alongside the production application ID.
- [ ] App survives background/foreground and process recreation.

## Layout and system UI

- [ ] Status/navigation bars do not cover content.
- [ ] Gesture navigation works.
- [ ] Three-button navigation works.
- [ ] Portrait and landscape remain usable.
- [ ] Split-screen narrow/wide resizing remains usable.
- [ ] Display cutout and safe areas are respected.
- [ ] Keyboard/IME does not hide the focused input or action.
- [ ] 200% system text does not clip essential content.

## Navigation and state

- [ ] Bottom navigation labels and current state are clear.
- [ ] Expanded navigation rail is usable on a tablet/large window.
- [ ] Hardware/system Back returns from a tool predictably.
- [ ] Back from top level follows approved exit behavior.
- [ ] Rotation/process recreation does not restore sensitive tool input.
- [ ] Favorites and theme persist.
- [ ] Invalid/disabled tool routes recover safely.

## Enabled tools

The 33 tools of the approved version-1 scope (ADR 0025). The per-tool rows for
the 70 tools cut by ADR 0023 are retired along with their artifact
coverage; their source, pure logic, and tests remain in the repository, so
reinstating a tool restores its row here.

- [ ] Unit Converter matches unit fixtures and works offline.
- [ ] Recipe Scaler scales quantified ingredients, keeps units, and preserves unquantified lines.
- [ ] Currency Converter proves live and cached/offline states with provider attribution.
- [ ] Percentage Calculator computes percent-of and percent-change with strict input validation.
- [ ] Tip Calculator computes tip, total, and per-person amounts from presets and custom percentages.
- [ ] Discount and Tax Calculator applies discount then tax with exact-cent steps and rejects junk money.
- [ ] Unit Price Comparer ranks up to four mixed-unit items by base-unit cost.
- [ ] Loan EMI Calculator matches the reducing-balance vector and discloses its indicative nature.
- [ ] Fuel and Trip Cost Calculator handles round trip and passenger split.
- [ ] BMI Calculator shows the WHO band and the estimate-only disclaimer.
- [ ] Scientific Calculator evaluates precedence, functions, and invalid input.
- [ ] Stopwatch counts, laps, and resets from wall-clock anchors.
- [ ] Countdown Timer runs from presets, rejects zero durations, and completes best-effort.
- [ ] Pomodoro Timer reconstructs from its wall-clock anchor and handles denied/granted best-effort alerts.
- [ ] Time Zone Converter crosses zones and surfaces daylight-saving edges honestly.
- [ ] Date Difference Calculator reports exclusive spans and business days.
- [ ] Date Calculator adds/subtracts days, weeks, months, years, and business days with month-end clamping.
- [ ] Age Calculator computes age, lifetime totals, and next birthday.
- [ ] Notes loads, autosaves (including an edit made immediately before navigating away), imports, exports, and explicitly clears its bounded device-local payload.
- [ ] Character Counter counts Unicode code points including emoji.
- [ ] Word Counter matches its Unicode and limit fixtures.
- [ ] Case Converter exposes all eight conversions and copies results accessibly.
- [ ] Color Picker converts hex/RGB/HSL, renders harmony palettes, and checks WCAG contrast.
- [ ] QR Generator renders, shares, and saves the exact generated PNG.
- [ ] Image Compressor picks, bounds, re-encodes, previews, shares, and saves supported images.
- [ ] PDF Converter converts images/PDF, merges, extracts text, and reports encrypted files distinctly.
- [ ] Audio Recorder captures a take, finalizes on lifecycle inactive, and exports within its duration and size caps.
- [ ] Password Generator draws uniformly from the selected sets via the device secure random source.
- [ ] Password Strength Checker reports bands, entropy, and crack-time estimates with honest wording.
- [ ] vCard Generator escapes RFC 2426 (vCard 3.0) text fields and validates website links.
- [ ] iCalendar Generator escapes RFC 5545 text, emits a UTC DTSTAMP and fresh UID, treats the all-day end date as inclusive (exclusive DTEND), rejects an end before the start, and imports cleanly.
- [ ] Dice Roller rolls notation from secure bytes and repeats the last roll.
- [ ] Random Picker draws from a list, a coin, and an integer range without favoring any value.
- [ ] Level & Angle reads tilt, calibrates a zero reference, and reaches a text "Level" state.
- [ ] Compass combines magnetometer and accelerometer readings into headings and warns on magnetic interference.
- [ ] Barometer & Altitude reads pressure and estimates altitude from the entered sea-level reference.
- [ ] Light Meter reads ambient lux with a text level and session min/max.
- [ ] Vibration Meter reports linear-acceleration RMS and peak over a rolling second.

## Platform behavior

- [ ] Clipboard copy works and accessible feedback is announced.
- [ ] Network status changes show offline state without disabling local tools.
- [ ] External HTTPS links open outside the app WebView.
- [ ] Clear local preferences removes only the classes described.
- [ ] No unexpected permission prompt appears on first launch.
- [ ] Merged installed permissions match the permission budget.

## Accessibility

- [ ] TalkBack reads headings, nav, cards, buttons, inputs, state, and results logically.
- [ ] Switch Access reaches every action.
- [ ] Hardware keyboard focus is visible and ordered.
- [ ] Reduced-motion preference removes nonessential motion.
- [ ] Light/dark contrast remains readable.
- [ ] Status is not communicated through color alone.

## Resilience

- [ ] Airplane mode leaves all enabled version-1 tools usable.
- [ ] Low-storage behavior does not lose source/user data.
- [ ] “Don't keep activities” flows recover safely.
- [ ] WebView update/older supported WebView smoke test passes.
- [ ] Renderer termination recovers once, then shows the native safe-mode screen without looping.

## Result

- Overall: **PARTIAL — emulator pre-verification green on the current 38-tool scope; physical device pending**
- Emulator evidence: 2026-09-07 automated run on the 25-tool foundation artifact (39 PASS / 0 FAIL / 4 PENDING_PHYSICAL), the 2026-09-08 re-run on the 100-tool candidate at 100 enabled tools (112 PASS / 0 FAIL / 4 PENDING_PHYSICAL), and the 2026-09-15 re-run on the 30-tool version-1 scope of ADR 0023 (42 PASS / 8 INFO / 4 PENDING_PHYSICAL / 0 FAIL, 54 rows, exit 0), all on Android 15 SDK 35, WebView 124.0.6367.219; see "Automated emulator pre-verification" above. The 2026-09-15 and 2026-10-30 runs cover the then-current scopes; a 33-tool run on the ADR 0025 artifact and a 38-tool run on the ADR 0026 artifact are recorded in the 2026-10-30 sections. Only physical-device execution on that artifact is required before this checklist can be completed.
- Blocking issues:
  - Physical device has not been selected or tested.
  - The emulator record covers the 30-tool ADR 0023 artifact (2026-09-15) and the 33-tool ADR 0025 artifact `702c5c26…` and the current 38-tool ADR 0026 artifact `b9ec3312…` (2026-10-30 motion build; the earlier `13ef843b…` sensor build passed the same checklist); physical-device execution on that artifact remains outstanding.
  - The instrumentation suite and the emulator checklist driver supplement but do not replace the pending physical-device, OEM-picker/share-target, Doze, TalkBack, and WebView-update evidence.
- Evidence links/logs: `/tmp/device-checklist-results.json` (single-run record; regenerate with `node scripts/device-checklist-emulator.mjs` against an installed debug artifact).
