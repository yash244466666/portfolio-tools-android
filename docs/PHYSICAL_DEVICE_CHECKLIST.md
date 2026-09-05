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

## Foundation tools

- [ ] Unit Converter matches unit fixtures and works offline.
- [ ] Timestamp Converter handles seconds, milliseconds, local time, and invalid input.
- [ ] Hash Generator matches SHA vectors, handles Unicode, copies output, and works offline.
- [ ] Leaving Hash Generator does not retain sensitive input after the approved lifecycle boundary.

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
- [ ] Renderer termination recovery test passes after that host feature is implemented.

## Result

- Overall: **NOT RUN**
- Blocking issues:
  - Physical device has not been selected or tested.
  - Renderer host recovery is not implemented yet.
- Evidence links/logs: Pending.
