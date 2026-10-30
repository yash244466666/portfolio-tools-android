# Automated regression matrix

<!-- regression-matrix:generated:start -->

Registry: 30 enabled tools.
Pure test files: 29/30; component tests: 30/30.
E2E route coverage: 30/30; installed-artifact interaction (emulator driver per-tool check or E2E): 30/30.

| Tool                          | ID                           | Category | Network | Pure tests | Component tests | Fixtures | E2E | Artifact interaction |
| ----------------------------- | ---------------------------- | -------- | ------- | ---------- | --------------- | -------- | --- | -------------------- |
| Unit Converter                | `unit-converter`             | core     | local   | 1          | 1               | no       | yes | yes                  |
| QR Generator                  | `qr-generator`               | dev      | local   | 1          | 1               | no       | yes | yes                  |
| Notes                         | `notes-scratchpad`           | text     | local   | 1          | 1               | no       | yes | yes                  |
| Pomodoro Timer                | `pomodoro-timer`             | text     | local   | 1          | 1               | no       | yes | yes                  |
| Image Compressor              | `image-compressor`           | media    | local   | 1          | 1               | no       | yes | yes                  |
| Currency Converter            | `currency-converter`         | core     | network | 2          | 1               | no       | yes | yes                  |
| Word Counter                  | `word-counter`               | text     | local   | 1          | 1               | no       | yes | yes                  |
| Character Counter             | `character-counter`          | text     | local   | shared     | 1               | no       | yes | yes                  |
| Case Converter                | `case-converter`             | text     | local   | 1          | 1               | no       | yes | yes                  |
| Percentage Calculator         | `percentage-calculator`      | core     | local   | 1          | 1               | no       | yes | yes                  |
| Tip Calculator                | `tip-calculator`             | core     | local   | 1          | 1               | no       | yes | yes                  |
| Password Strength Checker     | `password-strength-checker`  | core     | local   | 1          | 1               | no       | yes | yes                  |
| Age Calculator                | `age-calculator`             | core     | local   | 1          | 1               | no       | yes | yes                  |
| Scientific Calculator         | `calculator`                 | core     | local   | 1          | 1               | no       | yes | yes                  |
| Password Generator            | `password-generator`         | dev      | local   | 1          | 1               | no       | yes | yes                  |
| Color Picker                  | `color-picker`               | dev      | local   | 1          | 1               | no       | yes | yes                  |
| Stopwatch                     | `stopwatch`                  | core     | local   | 1          | 1               | no       | yes | yes                  |
| Countdown Timer               | `countdown-timer`            | core     | local   | 1          | 1               | no       | yes | yes                  |
| iCalendar Generator           | `ical-generator`             | dev      | local   | 1          | 1               | no       | yes | yes                  |
| vCard Generator               | `vcard-generator`            | dev      | local   | 1          | 1               | no       | yes | yes                  |
| PDF Converter                 | `pdf-converter`              | core     | local   | 1          | 1               | no       | yes | yes                  |
| Audio Recorder                | `audio-recorder`             | media    | local   | 2          | 1               | no       | yes | yes                  |
| Discount and Tax Calculator   | `discount-tax-calculator`    | core     | local   | 1          | 1               | no       | yes | yes                  |
| BMI Calculator                | `bmi-calculator`             | core     | local   | 1          | 1               | no       | yes | yes                  |
| Unit Price Comparer           | `unit-price-comparer`        | core     | local   | 1          | 1               | no       | yes | yes                  |
| Date Difference Calculator    | `date-difference-calculator` | core     | local   | 1          | 1               | no       | yes | yes                  |
| Time Zone Converter           | `time-zone-converter`        | core     | local   | 1          | 1               | no       | yes | yes                  |
| Loan EMI Calculator           | `loan-emi-calculator`        | core     | local   | 1          | 1               | no       | yes | yes                  |
| Dice Roller                   | `dice-roller`                | core     | local   | 1          | 1               | no       | yes | yes                  |
| Fuel and Trip Cost Calculator | `fuel-trip-cost-calculator`  | core     | local   | 1          | 1               | no       | yes | yes                  |

<!-- regression-matrix:generated:end -->

## Purpose and layers

This matrix maps every enabled version-1 tool to its independent correctness
oracles and the test layers that execute them, per issue #21 (the automated
regression matrix for the release scope; the "all-87" title predates the ADR
0022 expansion to 100 tools, which ADR 0023 superseded with the approved
30-tool version-1 scope). The generated table above is derived from the
repository itself so it cannot silently drift:

- **Pure tests** — the tool directory's `*.test.ts` files with independent
  standard vectors and boundary cases. `shared` means the tool's pure logic
  lives in a documented shared module whose tests are its oracle (the
  `SHARED_TEST_PATHS` map in `scripts/build-regression-matrix.mjs`).
- **Component tests** — `*.test.tsx` interaction/accessibility files.
- **Fixtures** — whether the tool directory carries fixture files.
- **E2E** — the browser-harness spec exercises this tool's route.
- **Artifact interaction** — the installed debug artifact on the API 35
  emulator is driven through this tool, either by the checklist driver's
  per-tool check or by an E2E-harness-equivalent flow. Audio Recorder is
  counted through its E2E scenario only: the spec asserts disclosure and
  disabled/unsupported states, **not** capture interaction, and it has no
  driver probe or Android instrumentation test. This section previously
  attributed instrumentation coverage to it, which was false. The driver
  probes 29 of the 30 enabled tools; the microphone path needs physical-device
  evidence (#18/#25) in any case, and is recorded as a known gap rather than
  counted as covered.

The 70 tools cut by ADR 0023 keep their source directory, pure logic,
provenance record, and tests, but they are no longer `enabled`: their E2E
scenarios and installed-artifact interaction are retired, while their
pure-logic suites continue to run under `pnpm test`. The matrix therefore
scopes to the 30 retained tools, and the checklist driver keeps the cut tools'
probes in the file but runs only the retained 30, so a reversal stays a
manifest edit.

The script exits non-zero when any enabled tool lacks a pure oracle or any
installed-artifact interaction coverage, so it doubles as a coverage gate.
Regenerate the table with `node scripts/build-regression-matrix.mjs`; the
fixed sections around the markers are hand-maintained.

## Test layers that run per release candidate

| Layer                              | Command                                                                | Scope at the 2026-09-08 run                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting, actions, work items    | `pnpm format:check`, `github:actions:check`, `github:work-items:check` | Clean; actions immutable-pinned; work-items manifest consistent with remote                                                            |
| Typecheck and lint                 | `pnpm typecheck`, `pnpm lint`                                          | Strict types; zero warnings                                                                                                            |
| CSS token resolution               | `pnpm css:tokens:check`                                                | Every `var(--x)` / `getPropertyValue("--x")` under `src/` resolves to a declared token; fallback-protected references reported as INFO |
| WCAG token contrast                | `pnpm contrast:check`                                                  | Recomputed from `src/styles.css` per theme; all pairs meet their threshold                                                             |
| Pure/component/registry unit tests | `pnpm test`                                                            | Results below                                                                                                                          |
| Production build                   | `pnpm build`                                                           | Passes; tool chunks stay lazy                                                                                                          |
| Browser harness                    | `pnpm test:e2e`                                                        | Results below                                                                                                                          |
| Capacitor sync                     | `pnpm cap:sync`                                                        | Android receives current assets                                                                                                        |
| Native unit tests                  | `./android/gradlew -p android testDebugUnitTest`                       | Results below                                                                                                                          |
| Android lint and variants          | `lintDebug assembleDebug assembleInternal bundleRelease`               | Zero lint errors; debug/internal APKs and unsigned release AAB                                                                         |
| Merged-manifest budget             | `pnpm android:manifest:check debug\|internal\|release`                 | Reviewed permission/export budget for all three variants                                                                               |
| Installed-artifact interaction     | `node scripts/device-checklist-emulator.mjs`                           | 100-tool run: 112 PASS / 0 FAIL ×2 consecutive (see the device checklist doc)                                                          |
| Process recreation                 | `pnpm android:test:connected`, `pnpm android:test:process-recreation`  | Emulator evidence recorded with the instrumentation batch                                                                              |

## Gate-run evidence

### 2026-09-15 — refreshed baseline at `bd5b310` (branch `chore/release-hygiene-and-evidence-refresh`)

Run against `main` at `bd5b310` plus the sourcemap change in this branch. Every
command was run unpiped so exit codes are not masked. This branch is the last
of three in the merge order (#208 defect fixes → #209 js-yaml bump → this one),
so the table records the intended post-merge candidate; the two rows that
depend on #208 are marked.

Rows marked PASS were observed on this branch except where noted. This branch
is based on `main`, so `pnpm css:tokens:check` (added by #208) does not exist
in its working tree; its result is carried from #208's own gate run and the
row says so rather than being reported as observed here. The test, E2E, and
artifact numbers below **were** observed here, except that they do not include
#208's +1 component test and +1 web test.

This run predates the ADR 0023 rescope: it was measured on the 100-tool
candidate, so its enabled-tool count, its work-items manifest counts, its
212-check E2E run, and its 100-tool emulator-driver result describe that
scope, not the approved 30-tool version-1 scope. They are retained as the
record of what that run measured and are not renumbered.

| Gate                                                                                    | Result | Evidence                                                                                                                                        |
| --------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                                                     | PASS   | All files Prettier-clean                                                                                                                        |
| `pnpm css:tokens:check`                                                                 | PASS   | Landed by PR #208, which this branch builds on in the merge order; 953 references resolve against 27 declared tokens, 1 fallback-protected INFO |
| `pnpm contrast:check`                                                                   | PASS   | 36/36 token pairs meet their WCAG 2.2 threshold in both themes                                                                                  |
| `pnpm github:actions:check`                                                             | PASS   | 8 immutable action refs; read-only contents                                                                                                     |
| `pnpm github:work-items:check`                                                          | PASS   | 142-issue manifest valid (101 tool entries, 10 epics, 31 tasks)                                                                                 |
| `pnpm typecheck`                                                                        | PASS   | Strict TypeScript build                                                                                                                         |
| `pnpm lint`                                                                             | PASS   | Zero warnings (`--max-warnings 0`)                                                                                                              |
| `pnpm test`                                                                             | PASS   | 1,659 tests / 215 files, 0 failed                                                                                                               |
| `pnpm build`                                                                            | PASS   | Production build; no sourcemaps emitted; tool chunks stay lazy                                                                                  |
| `pnpm test:e2e`                                                                         | PASS   | 212 checks passed (106 scenarios × phone/tablet)                                                                                                |
| `pnpm cap:sync`                                                                         | PASS   | Android assets synced from the production build                                                                                                 |
| gradle `clean testDebugUnitTest lintDebug assembleDebug assembleInternal bundleRelease` | PASS   | Clean build, zero lint errors, all three variants produced                                                                                      |
| `pnpm android:manifest:check ×3`                                                        | PASS   | 8 reviewed permissions / 1 exported component for debug, internal, and release                                                                  |
| Installed-artifact interaction                                                          | PASS   | 100-tool emulator driver: 112 PASS / 6 INFO / 4 PENDING_PHYSICAL / 0 FAIL, exit 0, artifact `febb136f…`                                         |
| Process recreation                                                                      | PASS   | `android:test:process-recreation` recorded with the instrumentation batch                                                                       |

Clean-build artifacts at this commit: debug APK `febb136f…` (5,810,251 B),
internal APK `26f1b7ea…` (5,810,267 B), release AAB `5c93e874…` (2,965,204 B).
These are **not** byte-identical to the batch-16 inventory, and should not be:
five UI pull requests plus the sourcemap change shipped between them. Removing
sourcemaps from the bundled payload cut the release AAB by 36 %.

### 2026-09-08 — full suite at the matrix commit (branch `test/21-regression-matrix`, app source at `36bf51e`)

| Gate                                                    | Result | Evidence                                                                                              |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                     | PASS   | All files Prettier-clean                                                                              |
| `pnpm typecheck`                                        | PASS   | Strict TypeScript build                                                                               |
| `pnpm lint`                                             | PASS   | Zero warnings (`--max-warnings 0`)                                                                    |
| `pnpm test`                                             | PASS   | 1,655 tests / 215 files, 0 failed, 0 skipped                                                          |
| `pnpm build`                                            | PASS   | Production build; tool chunks stay lazy                                                               |
| `pnpm test:e2e`                                         | PASS   | 208 checks passed (104 scenarios × phone/tablet) — 13 tool gaps closed in this change                 |
| `pnpm cap:sync`                                         | PASS   | Android assets synced from the production build                                                       |
| `./android/gradlew -p android testDebugUnitTest`        | PASS   | Native unit/policy tests all pass (see Gradle output)                                                 |
| `./android/gradlew -p android lintDebug`                | PASS   | Zero lint errors                                                                                      |
| `assembleDebug` / `assembleInternal` / `bundleRelease`  | PASS   | Debug APK, internal APK, unsigned release AAB produced                                                |
| `pnpm android:manifest:check ×3`                        | PASS   | debug/internal/release merged-manifest permission/export budget                                       |
| `pnpm regression:matrix` (this script)                  | PASS   | Matrix complete for 100 enabled tools; no tool lacks its oracle                                       |
| `pnpm github:actions:check` / `github:work-items:check` | PASS   | 8 immutable action refs; 142-issue manifest consistent                                                |
| Installed-artifact interaction                          | PASS   | 100-tool emulator driver: 112 PASS / 0 FAIL ×2 consecutive (see the physical-device checklist record) |
| Process recreation                                      | PASS   | `android:test:connected` + force-stop script, recorded with the instrumentation batch                 |

Artifacts rebuilt during this run are byte-identical to the batch-16
inventory in `IMPLEMENTATION_TRACKER.md` (debug `4ec71a06…`, internal
`bab29fb8…`, release AAB `d0ef058f…`), confirming the harness and
documentation changes do not alter the shipped application.

No gate was weakened or skipped: there are no `skipIf`/`test.skip` release
gate relaxations introduced by this change, and the known phase-gated
instrumentation skips (2) and the emulator-image INFO/PENDING_PHYSICAL rows
are documented limitations recorded in their evidence documents, not skipped
gates.
