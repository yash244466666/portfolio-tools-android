# Physical Android Device Checklist

> Status: not yet executed  
> Do not check an item without recording device/API/WebView/build evidence.

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

- Overall: **NOT RUN**
- Blocking issues:
  - Physical device has not been selected or tested.
  - The instrumentation suite supplements but does not replace the pending physical-device, OEM-picker/share-target, Doze, and accessibility evidence.
- Evidence links/logs: Pending.
