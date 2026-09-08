# Physical Android Device Checklist

> Status: not yet executed on a physical device; automated emulator pre-verification executed 2026-09-07 and re-executed 2026-09-08 against the 100-tool artifact. Do not check an item without recording device/API/WebView/build evidence.

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

## Automated emulator pre-verification (2026-09-07)

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

- [ ] Unit Converter matches unit fixtures and works offline.
- [ ] Timestamp Converter handles seconds, milliseconds, local time, and invalid input.
- [ ] Hash Generator matches SHA vectors, handles Unicode, copies output, and works offline.
- [ ] Leaving Hash Generator does not retain sensitive input after the approved lifecycle boundary.
- [ ] Markdown Preview sanitizes hostile markup and remains usable offline.
- [ ] Regex Tester enforces its deadline, cancellation, and recovery behavior.
- [ ] QR Generator renders, shares, and saves the exact generated PNG.
- [ ] JSON Editor validates, formats, and inspects bounded input without restoring sensitive content.
- [ ] Notes loads, autosaves, imports, exports, and explicitly clears its bounded device-local payload.
- [ ] Pomodoro Timer reconstructs from its wall-clock anchor and handles denied/granted best-effort alerts.
- [ ] Image Compressor picks, bounds, re-encodes, previews, shares, and saves supported images.
- [ ] File Hash Checker streams exact SHA-256/SHA-1/SHA-512 results and cancels cleanly.
- [ ] Currency Converter proves live and cached/offline states with provider attribution.
- [ ] DNS Lookup proves live, invalid, no-record, offline, and recovery states with provider attribution.
- [ ] Word Counter matches its Unicode and limit fixtures.
- [ ] Character Counter counts Unicode code points and spaces correctly.
- [ ] Case Converter exposes all eight conversions and copies results accessibly.
- [ ] Reverse Text keeps grapheme clusters intact in character mode.
- [ ] Number Base Converter strictly validates and converts large integers.
- [ ] Base64 Encode/Decode round-trips UTF-8 and rejects malformed input.
- [ ] URL Encoder/Decoder handles malformed escapes and clearly labels assumed schemes.
- [ ] Text to Slug discloses normalization, stop-word, and truncation behavior.
- [ ] Sort Lines covers alphabetical, numeric, reverse, shuffle, blank, and duplicate options.
- [ ] Add Line Numbers validates starts and all separator options.
- [ ] Trim Whitespace covers per-line trim and space-run collapse.
- [ ] Remove Duplicates covers stable, case-insensitive, and sorted output.

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

- [ ] Airplane mode leaves all enabled foundation tools usable.
- [ ] Low-storage behavior does not lose source/user data.
- [ ] “Don't keep activities” flows recover safely.
- [ ] WebView update/older supported WebView smoke test passes.
- [ ] Renderer termination recovers once, then shows the native safe-mode screen without looping.

## Result

- Overall: **PARTIAL — emulator pre-verification passed; physical device pending**
- Emulator evidence: 2026-09-07 automated run (39 PASS / 0 FAIL / 4 PENDING_PHYSICAL) and the 2026-09-08 re-run at 100 enabled tools (112 PASS / 0 FAIL / 4 PENDING_PHYSICAL), both on Android 15 SDK 35, WebView 124.0.6367.219; see "Automated emulator pre-verification" above.
- Blocking issues:
  - Physical device has not been selected or tested.
  - The instrumentation suite and the emulator checklist driver supplement but do not replace the pending physical-device, OEM-picker/share-target, Doze, TalkBack, and WebView-update evidence.
- Evidence links/logs: `/tmp/device-checklist-results.json` (single-run record; regenerate with `node scripts/device-checklist-emulator.mjs` against an installed debug artifact).
