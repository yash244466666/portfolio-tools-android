# Accessibility certification evidence (automated portions)

> Compiled: 2026-09-08 for issue #22; refreshed 2026-09-15 at `bd5b310` and 2026-10-30 for the ADR 0025 expansion.
> Scope: the 33-tool public version-1 scope approved by ADR 0025 (2026-10-30), which expands ADR 0023's 30-tool scope.
> Figures recorded at `bd5b310` were measured on the earlier 100-tool
> candidate; they are kept as measured and are not claims about the 33-tool
> scope.
> Automated evidence supplements but does not replace the pending
> physical-device TalkBack/Switch Access rows.

## What is already automated (per release candidate)

| Layer                | Coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component tests      | All 33 enabled tools have interaction tests asserting semantic roles, labels, and accessible names; live-region assertions for important feedback. The 70 tools cut by ADR 0023 keep their component tests in-tree, but that coverage is retired and is not counted here. Of the 104 tool component files (the file set includes the 70 cut tools, whose component tests remain in-tree), **87 use `aria-live` regions and 102 use ARIA attributes** (measured on 2026-10-30; the three ADR 0025 tools add one live region and ARIA use each). |
| Route focus          | ToolScreen moves focus to the destination heading on route change (focusable heading). The search-clear focus test in `src/app/App.test.tsx` is the only current `toHaveFocus` assertion; a dedicated ToolScreen route-focus assertion is still outstanding and is recorded as a gap rather than claimed.                                                                                                                                                                                                                                      |
| Navigation semantics | Labeled primary navigation with `aria-current`; toggles use state attributes; skip link present (`Skip to content`)                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Contrast             | WCAG 2.2 AA token pairs in `src/styles.css` light/dark, recomputed by `scripts/check-token-contrast.mjs` — **36/36 pairs** pass, wired into `pnpm check` and CI; the Color Contrast Checker (cut from the version-1 scope by ADR 0023; its pure module and vectors remain in-tree) implements the WCAG 2.2 relative-luminance algorithm with vectors                                                                                                                                                                                           |
| Token resolution     | `scripts/check-css-tokens.mjs` fails the build when a component references a custom property that no stylesheet declares — the defect class that shipped invisible fills and a sub-AA selected state twice                                                                                                                                                                                                                                                                                                                                     |
| Reduced motion       | `prefers-reduced-motion` CSS block constrains animation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Touch targets        | Shared controls carry `min-height: 3rem/3.25rem` (48–52 px) with adequate separation; the E2E floor scenario now also asserts `.text-link`, which previously rendered ~24 px tall                                                                                                                                                                                                                                                                                                                                                              |
| 200% text            | Checklist driver row: 200% font scale relayouts without horizontal overflow on the installed artifact                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Landscape/foldable   | Checklist driver row: landscape relayout without horizontal overflow; E2E breakpoint sweep 320–1024 px                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Offline/status       | Status never relies on color alone (typed text states)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

## Pending physical-device rows (keep #22 open)

- TalkBack reading order and spoken feedback.
- Switch Access.
- OEM split-screen/multi-window behavior (PENDING_PHYSICAL in the driver).
- Soft-IME interaction on a physical device (hardware-keyboard AVD suppresses it).
- Magnification/color-correction manual review.

## How to reproduce the automated evidence

- `pnpm test` (component/a11y assertions), `pnpm css:tokens:check`,
  `pnpm contrast:check`, `pnpm test:e2e` (**38 scenarios** × phone/tablet
  under the 33-tool scope, including the 48 dp touch-floor, theme, and
  overflow sweeps; the 100-tool candidate measured at `bd5b310` reported 106
  scenarios / 212 checks), `node scripts/device-checklist-emulator.mjs`
  (artifact interaction: the driver probes 32 of the 33 retained tools, with
  Audio Recorder covered by its E2E scenario only; 200 % text, landscape
  rows) per `docs/certification/regression-matrix.md`.
