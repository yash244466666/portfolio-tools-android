# Accessibility certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #22. Automated evidence supplements but does
> not replace the pending physical-device TalkBack/Switch Access rows.

## What is already automated (per release candidate)

| Layer                | Coverage                                                                                                                                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component tests      | Every enabled tool has interaction tests asserting semantic roles, labels, and accessible names; live-region assertions for important feedback (84 tool components use `aria-live` regions; 107 use ARIA attributes) |
| Route focus          | ToolScreen moves focus to the destination heading on route change (focusable heading; shell/component tests)                                                                                                         |
| Navigation semantics | Labeled primary navigation with `aria-current`; toggles use state attributes; skip link present (`Skip to content`)                                                                                                  |
| Contrast             | WCAG 2.2 AA token pairs in `src/styles.css` light/dark; the Color Contrast Checker itself implements the WCAG 2.2 relative-luminance algorithm with vectors                                                          |
| Reduced motion       | `prefers-reduced-motion` CSS block constrains animation                                                                                                                                                              |
| Touch targets        | Shared controls carry `min-height: 3rem/3.25rem` (48–52 px) with adequate separation                                                                                                                                 |
| 200% text            | Checklist driver row: 200% font scale relayouts without horizontal overflow on the installed artifact (two consecutive green runs)                                                                                   |
| Landscape/foldable   | Checklist driver row: landscape relayout without horizontal overflow; E2E breakpoint sweep 320–1024 px                                                                                                               |
| Offline/status       | Status never relies on color alone (typed text states)                                                                                                                                                               |

## Pending physical-device rows (keep #22 open)

- TalkBack reading order and spoken feedback.
- Switch Access.
- OEM split-screen/multi-window behavior (PENDING_PHYSICAL in the driver).
- Soft-IME interaction on a physical device (hardware-keyboard AVD suppresses it).
- Magnification/color-correction manual review.

## How to reproduce the automated evidence

- `pnpm test` (component/a11y assertions), `pnpm test:e2e` (208 checks incl.
  focus/theme/overflow), `node scripts/device-checklist-emulator.mjs`
  (artifact interaction, 200% text, landscape rows) per
  `docs/certification/regression-matrix.md`.
