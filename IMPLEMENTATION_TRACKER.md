# Android Tools Implementation Tracker

> Last updated: 2026-09-07 00:30 Europe/Berlin
> Tracker schema: 1
> Current milestone: Foundation pass
> Upstream portfolio commit: `61e54c64edbeffc9487239b6dae399e255c6a71d`
> Approved public version 1 scope: **all 87 audited catalog tools; 8 implemented, 79 remaining**
> Public release readiness: **NO — foundation only**

This is the living operational record for what is implemented, what is verified, what remains, and what is blocked. Update it in every implementation session. A checked item requires evidence; generated or coded does not automatically mean tested.

## 1. Status legend

| Status      | Meaning                                                                          |
| ----------- | -------------------------------------------------------------------------------- |
| DONE        | Implemented and verified at the level named in the evidence column               |
| IN PROGRESS | Active work exists but its acceptance gate is not complete                       |
| PARTIAL     | Some contract/path exists; important behavior remains deliberately unavailable   |
| PLANNED     | Approved in the roadmap but not started                                          |
| BLOCKED     | Cannot safely continue without a decision, credential, device, or external state |
| DEFERRED    | Intentionally outside the current release/milestone                              |
| EXCLUDED    | Not permitted in current scope without a new review                              |

## 2. Foundation dashboard

| Workstream                  | Status  | Current evidence                                                                                                                          | Remaining gate                                                           |
| --------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Separate Git repository     | DONE    | Private GitHub repo; local `main` tracks `origin/main`                                                                                    | Branch protection/required checks still require GitHub settings          |
| GitHub work management      | DONE    | Project #8; 128 reconciled issues including 87 tools; PR #130 merged as `1fbd6af`                                                         | Optional saved views are a UI step; protected main needs GitHub Pro      |
| Web application scaffold    | DONE    | Production build, 123 tests, and 14 phone/tablet E2E scenarios                                                                            | Continue extending tests with migrated tools                             |
| Capacitor Android scaffold  | DONE    | 13 official plugins plus one app-owned plugin; all Gradle variants pass                                                                   | Install/smoke test requires an Android device                            |
| Adaptive application shell  | DONE    | Catalog, search, filters, Favorites/Recent, bottom nav/rail, overflow and screenshot review                                               | Landscape, split-screen, 200% text, and physical-device review           |
| Tool registry               | PARTIAL | Typed 12-tool milestone registry within the approved 87-tool public scope; unique-ID tests                                                | Add the remaining 75 entries only as their implementation batches mature |
| Enabled foundation tools    | DONE    | Unit, Timestamp, SHA Hash, Markdown Preview, Regex Tester, QR Generator, JSON Editor, Notes/Scratchpad implementations and pure/E2E tests | Physical Android interaction check                                       |
| Platform contracts          | DONE    | Contracts plus shared web/Capacitor behavior tests across core adapter semantics                                                          | Extend cases alongside each new native capability                        |
| Android platform adapters   | PARTIAL | Core adapters, SAF Pick/Save As, sensitive-clipboard bridge, generated-cache janitor, streamed/bounded content reads, native policy tests | Instrumentation/device tests                                             |
| Android hardening           | PARTIAL | API 24/36, backup/network/file rules, shrink, three-variant manifest budget, artifacts                                                    | WebView termination/native safe mode and final icon/splash work          |
| Agent documentation         | DONE    | Detailed synchronized `AGENT.md` and `CLAUDE.md`                                                                                          | Recheck synchronization after future edits                               |
| Audited implementation plan | DONE    | Full plan copied into repository root                                                                                                     | Reconcile if upstream reference changes                                  |
| Tracker and provenance      | DONE    | This file plus `docs/SOURCE_PROVENANCE.md`                                                                                                | Maintain every session                                                   |
| CI                          | PARTIAL | Web/E2E and Android lint/debug/manifest-budget jobs defined                                                                               | Execute on hosted repository; pin actions by commit before production    |
| Physical device QA          | BLOCKED | Checklist and installable debug APK exist; `adb devices -l` returned no devices                                                           | Connect and authorize a device, then execute the checklist               |
| Play Console/release        | BLOCKED | Release requirements documented                                                                                                           | Requires approved identity, account, signing, store assets, declarations |

## 3. Foundation acceptance checklist

### Repository and configuration

- [x] Separate repository initialized.
- [x] Single pnpm lockfile and pnpm workspace policy created.
- [x] Node and pnpm versions pinned.
- [x] React, Vite, TypeScript, Tailwind, Capacitor, test, lint, and formatting dependencies pinned.
- [x] Strict TypeScript project references configured.
- [x] `@/` alias works in TypeScript, Vite, tests, and production build.
- [x] ESLint flat configuration exists and warnings fail the command.
- [x] Prettier configuration exists.
- [x] CSP meta policy restricts code/content and allowlists planned provider connections.
- [x] No PWA/service worker registered.
- [x] Full implementation plan copied.
- [x] `AGENT.md` created.
- [x] `CLAUDE.md` created and synchronized.
- [x] README, architecture, design, provenance, ADRs, and device checklist created.
- [x] Private GitHub repository created: `yash244466666/portfolio-tools-android`.
- [x] All-87 GitHub issue hierarchy, dependencies, milestones, labels, Project fields, templates, and reproducible provisioning added.
- [ ] Default branch protection and required CI configured.
- [x] CI actions pinned by immutable commit.

### Web/application shell

- [x] Hash route parser for catalog, favorites, settings, and tool screens.
- [x] Unknown tool route recovery.
- [x] Planned tool explanation state.
- [x] Typed static registry with lazy components.
- [x] Search across labels, descriptions, categories, and tags.
- [x] Category filtering.
- [x] Device-local favorites.
- [x] Device-local recent-tool ID tracking.
- [x] System/light/dark theme preference.
- [x] Online/offline status presentation.
- [x] Compact labeled bottom navigation.
- [x] Expanded labeled navigation rail.
- [x] Safe-area CSS for top/bottom/left/right insets.
- [x] Reduced-motion CSS.
- [x] Visible focus states and skip link.
- [x] Minimum 48 px/dp-class actions for shared controls.
- [x] Offline/system font stack; no font network dependency.
- [x] One vector icon family (Lucide); no emoji navigation icons.
- [x] Exact-width overflow review at 320/375/600/768/1024 px plus phone/tablet screenshots.
- [ ] Landscape and split-screen browser/device review.
- [ ] 200% text and TalkBack manual review.
- [x] Visible Recent destination with most-recent-first order, stale-ID filtering, empty state, and clear action.
- [x] React render-error boundary with private recovery screen.
- [x] WebView renderer-termination detection and native safe-mode screen; installed-artifact behavior verification remains pending.

### Platform layer

- [x] Stable typed service interfaces.
- [x] Stable platform error codes.
- [x] Web versus Android runtime selection.
- [x] Clipboard web/Capacitor implementation.
- [x] Namespaced Preferences web/Capacitor implementation.
- [x] Secure random bytes and UUID fallback.
- [x] Network state web/Capacitor implementation.
- [x] HTTPS-only external-browser web/Capacitor implementation.
- [x] Lifecycle web/Capacitor implementation.
- [x] Optional haptics web/Capacitor implementation.
- [x] Best-effort notification permission/schedule/cancel implementation.
- [x] Cache file generation and Android share adapter.
- [x] Android sensitive clipboard `EXTRA_IS_SENSITIVE` native bridge with adapter/native policy tests; installed-artifact device verification remains pending.
- [x] Android Storage Access Framework document picker with validated `content://` metadata.
- [x] Android `ACTION_CREATE_DOCUMENT` Save As bridge with a bounded private-cache handoff.
- [x] Versioned bounded/streamed `content://` read bridge (native digest streaming with cancellation, bounded in-memory copy) with real SHA policy vectors; provider-interoperability device evidence pending.
- [x] Generated-file cache cleanup/retention janitor for `cache/share/` and `cache/save/<operation>/` with policy tests; installed-artifact retention/device verification remains pending.
- [x] Shared web/Capacitor adapter contract tests for clipboard, preferences, browser, network, files, and notifications.
- [x] Native document validation policy tests wired into local and CI Gradle gates.
- [ ] Picker/share/notification UI Automator tests.

### Android project

- [x] Capacitor Android platform generated.
- [x] Minimum SDK 24.
- [x] Compile/target SDK 36.
- [x] Debug application ID suffix.
- [x] Internal application ID suffix.
- [x] Release minification and resource shrinking configured.
- [x] Cleartext traffic disabled in manifest and Network Security Configuration.
- [x] Auto Backup disabled.
- [x] Legacy backup exclusion rules.
- [x] Android 12+ cloud/device-transfer exclusion rules.
- [x] FileProvider non-exported.
- [x] FileProvider narrowed to cache `share/` only.
- [x] Only launcher Activity explicitly exported by app manifest.
- [x] No App Link/share-target intent filters added.
- [x] Only baseline Internet permission explicitly requested by app manifest.
- [x] Merged debug/internal/release manifest permission and exported-component budget recorded.
- [x] Automated manifest denylist/allowlist runs locally and in CI.
- [x] Capacitor exact-alarm and reboot permissions/receiver explicitly removed.
- [x] Tooling-only AndroidX exported profile receiver explicitly removed.
- [x] App-owned `DocumentFiles` plugin registered with a versioned, metadata-only bridge and no new permission/component.
- [x] Capacitor bridge logging disabled so plugin arguments cannot enter Logcat.
- [x] `lintDebug` passes with zero errors; generated-resource/dependency warnings are recorded below.
- [x] Debug APK builds and verifies with APK Signature Scheme v2 debug signing.
- [x] Internal APK builds and verifies with APK Signature Scheme v2 debug signing.
- [x] Minified/resource-shrunk release bundle compiles; it is intentionally unsigned.
- [x] 16 KB native-library compatibility inspected: current AAB contains no `.so` libraries.
- [x] WebView renderer termination recovery implemented (bridge listener, rate-limited recreation, native safe mode).
- [x] Native safe-mode/recovery surface implemented (theme-aware overlay, manual reload, TalkBack announcement).
- [ ] Final adaptive/monochrome/legacy launcher icons.
- [ ] Final splash resources.

### Foundation tools

- [x] Unit conversion logic extracted/reworked.
- [x] Unit tests cover metric, temperature, binary data, unknown units.
- [x] Unit UI has explicit categories/units, swap, labels, mobile layout, and duration/data clarification.
- [x] Timestamp logic requires explicit seconds/milliseconds.
- [x] Timestamp tests cover epoch, units, invalid input, and local date conversion.
- [x] Timestamp UI exposes local/UTC/ISO/seconds/milliseconds and copy actions.
- [x] Hash logic uses Web Crypto SHA-1/SHA-256/SHA-512.
- [x] Hash tests use known empty and UTF-8 vectors.
- [x] Hash UI labels SHA-1 as legacy and does not auto-persist input.
- [x] MD5 implementation intentionally excluded from the foundation.
- [x] Component interaction tests for each enabled tool.
- [ ] Copy behavior verified in installed Android app.
- [ ] Enabled tool routes verified through process recreation.

## 4. Approved 87-tool public scope and twelve-tool architecture milestone

The first public Google Play release is approved to contain all 87 tools from the audited upstream catalog. The initial 12-tool vertical slice remains the first architecture milestone and contains the 4 currently implemented tools plus 8 planned tools. After the milestone, 75 additional catalog tools must be migrated; overall, 83 of 87 tools are not yet implemented.

| Public v1 category |  Tools |
| ------------------ | -----: |
| Core               |      7 |
| Developer          |     45 |
| Text               |     17 |
| Media              |      3 |
| Security           |      5 |
| Math               |     10 |
| **Total**          | **87** |

| Order | Tool                | Status  | Technical path proved                                                | Next acceptance work                      |
| ----: | ------------------- | ------- | -------------------------------------------------------------------- | ----------------------------------------- |
|     1 | Unit Converter      | DONE    | Pure calculations, responsive form                                   | Physical device verification              |
|     2 | Timestamp Converter | DONE    | Date/time, live state, clipboard                                     | Locale/time-zone/device verification      |
|     3 | Hash Generator      | DONE    | Web Crypto, async state, clipboard                                   | Android WebView vectors/copy verification |
|     4 | Markdown Preview    | DONE    | Sanitizer allowlist, GFM vectors, hostile-input corpus, lazy chunk   | Android artifact interaction/device check |
|     5 | Regex Tester        | DONE    | Terminable Worker, budgets, cancellation, hostile-input recovery     | Android artifact interaction/device check |
|     6 | QR Generator        | DONE    | Pure render plan, canvas, bridge share/Save As, spec vectors         | Android artifact interaction/device check |
|     7 | JSON Editor         | DONE    | Bounded parsing, plain-text editor, view-only tree, tab/panel layout | Android artifact interaction/device check |
|     8 | Notes/Scratchpad    | DONE    | Versioned durable store, migration gate, export/import, honest copy  | Android artifact interaction/device check |
|     9 | Pomodoro Timer      | PLANNED | Lifecycle, notification, reconstruction                              | Notification channel and reboot semantics |
|    10 | Image Compressor    | PLANNED | Picker, decoded limits, generated output                             | SAF picker, EXIF/metadata policy          |
|    11 | File Hash Checker   | PLANNED | Large files, cancellation, streaming                                 | Native stream plugin or strict JS cap     |
|    12 | Currency Converter  | PLANNED | Network, cache, offline/stale                                        | Packaged-origin CORS and provider review  |

Vertical-slice completion requires all twelve to pass their Definition of Done in `AGENT.md`, not merely render. Public-release completion additionally requires the remaining 75 tools to pass the same gate; the 12-tool milestone is not an approved production subset.

## 5. Platform adapter status

| Adapter          | Web                | Android                           | Automated tests                 | Device tests | Notes                                                                                 |
| ---------------- | ------------------ | --------------------------------- | ------------------------------- | ------------ | ------------------------------------------------------------------------------------- |
| Clipboard        | Implemented        | Implemented                       | Shared contract tests           | Pending      | Android 13+ sensitive flag via custom native bridge; 1 MiB write limit both platforms |
| Preferences      | Implemented        | Implemented                       | Shared contract tests           | Pending      | Foundation values only; durable schema still pending                                  |
| Secure random    | Implemented        | Same implementation               | Shared utility tests            | Pending      | Web Crypto only                                                                       |
| Network state    | Implemented        | Implemented                       | Shared contract tests           | Pending      | Connectivity is not reachability                                                      |
| External browser | Implemented        | Implemented                       | Shared URL/adapter tests        | Pending      | HTTPS only; embedded credentials rejected                                             |
| Lifecycle        | Implemented        | Implemented                       | Listener cleanup partly covered | Pending      | Renderer recovery policy unit-tested; device verification pending                     |
| Haptics          | Best effort        | Implemented                       | Not required                    | Pending      | Never blocks primary action                                                           |
| Notifications    | Permission only    | Implemented                       | Schedule/cancel contract tests  | Pending      | No exact-alarm permission                                                             |
| File picker      | Browser input      | SAF Open Document                 | Adapter + native policy tests   | Pending      | Metadata/content URI only; no broad permissions                                       |
| Content reads    | Browser File reads | Native digest stream/bounded copy | Contract + SHA policy tests     | Pending      | 1 GiB digest cap; 16 MiB read cap; single-flight                                      |
| File share       | Download/Web Share | Cache + Share                     | Bytes/name/cache-path tests     | Pending      | Retention cleanup pending                                                             |
| Save As          | Browser download   | SAF Create Document               | Adapter + native policy tests   | Pending      | 5 MiB handoff; immediate best-effort cache cleanup                                    |

## 6. Quality-gate evidence

| Date/time                                                                                                                                                                                                                                                                                                                                                                                                    | Commit/worktree           | Command                                                                                    | Result  | Evidence/notes                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| 2026-09-05 14:39                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `pnpm format:check`                                                                        | PASS    | All tracked source/document formats accepted                                                  |
| 2026-09-05 14:39                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `pnpm check`                                                                               | PASS    | Strict typecheck; ESLint zero warnings; 6 files/16 tests; production build                    |
| 2026-09-05 14:39                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `pnpm build`                                                                               | PASS    | Main JS 240.43 kB / 76.32 kB gzip; enabled tools remain lazy chunks                           |
| 2026-09-05 14:40                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `pnpm test:e2e`                                                                            | PASS    | 8 scenarios across Pixel 5/tablet contexts; exact 320/375/600/768/1024 overflow loop          |
| 2026-09-05 14:35                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | Playwright full-page screenshot review                                                     | PASS    | Phone and 1024 px layouts visually inspected; no clipping or accidental desktop-only shell    |
| 2026-09-05 14:43                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `./android/gradlew -p android lintDebug`                                                   | PASS    | Zero errors, 15 recorded warnings: generated icons/resources and available dependency updates |
| 2026-09-05 14:43                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `assembleDebug assembleInternal bundleRelease`                                             | PASS    | Final web assets packaged; debug/internal APKs and minified release AAB produced              |
| 2026-09-05 14:43                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `pnpm android:manifest:check debug/internal/release`                                       | PASS    | Six reviewed permissions per variant; only `dev.yash.tools.MainActivity` exported             |
| 2026-09-05 14:43                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | APK signature and AAB native-library inspection                                            | PASS    | APKs verify v2; AAB intentionally unsigned; no `.so` entries                                  |
| 2026-09-05 14:41                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `cmp`/SHA-256 documentation integrity checks                                               | PASS    | Agent files identical; copied plan checksum exactly matches upstream                          |
| 2026-09-05 14:41                                                                                                                                                                                                                                                                                                                                                                                             | Uncommitted foundation    | `adb devices -l`                                                                           | BLOCKED | ADB server available, but no emulator or authorized physical device is connected              |
| 2026-09-05 17:51                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`                                         | PASS    | Prettier accepted all files; strict TypeScript and ESLint completed with zero errors/warnings |
| 2026-09-05 17:51                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `pnpm test`                                                                                | PASS    | 12 files/52 tests: shared adapter contracts and all enabled-tool component interactions       |
| 2026-09-05 17:51                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `pnpm build`                                                                               | PASS    | Main JS 243.61 kB / 77.20 kB gzip; enabled tools remain lazy chunks                           |
| 2026-09-05 17:52                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `pnpm test:e2e`                                                                            | PASS    | 10 scenarios across phone/tablet, including persisted Recent navigation                       |
| 2026-09-05 17:45                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | Recent UI screenshot review                                                                | PASS    | Empty-state phone dark and 1024 px light layouts inspected; labeled four-item adaptive nav    |
| 2026-09-05 17:52                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `pnpm cap:sync`                                                                            | PASS    | Current production web bundle copied into the Android asset output                            |
| 2026-09-05 17:53                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | `lintDebug`, `assembleDebug`, `assembleInternal`, `bundleRelease`                          | PASS    | All required Gradle variants completed; existing flatDir/Gradle deprecation warnings remain   |
| 2026-09-05 17:54                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | Manifest checks for debug/internal/release                                                 | PASS    | Six reviewed permissions per variant; only `dev.yash.tools.MainActivity` exported             |
| 2026-09-05 17:54                                                                                                                                                                                                                                                                                                                                                                                             | Current foundation batch  | APK signatures and AAB native-library inspection                                           | PASS    | Debug/internal APK v2 signatures verify; release AAB remains unsigned; no `.so` entries       |
| 2026-09-05 18:55                                                                                                                                                                                                                                                                                                                                                                                             | SAF document batch        | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting, strict types, zero lint warnings, and 12 files/58 tests                           |
| 2026-09-05 18:49                                                                                                                                                                                                                                                                                                                                                                                             | SAF document batch        | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | Main JS 246.85 kB/78.32 kB gzip; 10 E2E cases; packaged config disables bridge logging        |
| 2026-09-05 18:50                                                                                                                                                                                                                                                                                                                                                                                             | SAF document batch        | `testDebugUnitTest`, `lintDebug`, all variant builds                                       | PASS    | 6 native policy tests; zero lint errors; debug/internal APK and minified release AAB built    |
| 2026-09-05 18:51                                                                                                                                                                                                                                                                                                                                                                                             | SAF document batch        | Manifest, signing, R8, and native-library audits                                           | PASS    | Six reviewed permissions; one exported Activity; APK v2; plugin methods kept; no AAB `.so`    |
| 2026-09-05 20:24                                                                                                                                                                                                                                                                                                                                                                                             | GitHub management batch   | Work-item/action audits, `pnpm typecheck`, `pnpm lint`                                     | PASS    | 128-issue/87-tool manifest and 8 immutable action references valid; strict checks pass        |
| 2026-09-05 20:24                                                                                                                                                                                                                                                                                                                                                                                             | GitHub management batch   | Idempotent remote provisioning and read-back audit                                         | PASS    | Project #8; 128 markers/87 tools; 29 labels; 6 milestones; 90 dependencies; 7 custom fields   |
| 2026-09-05 20:24                                                                                                                                                                                                                                                                                                                                                                                             | Repository governance     | GitHub branch-protection and ruleset API checks                                            | BLOCKED | Private-repository account plan returns HTTP 403 and requires GitHub Pro or public visibility |
| 2026-09-05 20:27                                                                                                                                                                                                                                                                                                                                                                                             | GitHub management batch   | `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                | PASS    | 12 files/58 tests; 10 E2E scenarios; production bundle packaged into the Android project      |
| 2026-09-05 20:27                                                                                                                                                                                                                                                                                                                                                                                             | GitHub management batch   | Native unit, lint, debug/internal/release builds and manifests                             | PASS    | Gradle passed; six permissions/variant; one exported Activity; no AAB `.so` files             |
| 2026-09-06 07:08                                                                                                                                                                                                                                                                                                                                                                                             | PR #1 pre-merge audit     | Full web, E2E, sync, native unit/lint/variant/manifest gates                               | PASS    | 58 web tests, 10 E2E; 7 native policy tests; explicit Save As truncation regression covered   |
| 2026-09-06 07:25                                                                                                                                                                                                                                                                                                                                                                                             | GitHub issue gap audit    | Manifest validation, remote reconciliation, and read-back                                  | PASS    | 87-tool catalog exact; 128 managed bodies; no duplicate, stale dependency, or hierarchy drift |
| 2026-09-06 07:32                                                                                                                                                                                                                                                                                                                                                                                             | PR #1 merge and retarget  | Hosted `web-quality`/`android-debug`; post-merge Project read-back                         | PASS    | PR #1 merged as `7d3b2d7`; issue #13 and PR item Done; PR #130 clean against `main`           |
| 2026-09-06 07:50                                                                                                                                                                                                                                                                                                                                                                                             | PR #130 completion        | Review state, hosted CI, issue evidence, and squash merge                                  | PASS    | Both hosted jobs passed; issue #12 completed; PR #130 merged as `1fbd6af`                     |
| 2026-09-06 14:05                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 12 files/65 tests                   |
| 2026-09-06 14:06                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | Main JS 247.52 kB/78.45 kB gzip; 10 E2E scenarios; assets packaged into the Android project   |
| 2026-09-06 14:10                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | `testDebugUnitTest`                                                                        | PASS    | 7 ClipboardPolicy tests plus 7 existing DocumentFilePolicy tests; zero failures               |
| 2026-09-06 14:12                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | `lintDebug assembleDebug assembleInternal bundleRelease`                                   | PASS    | Zero lint errors; debug/internal APKs and minified release AAB rebuilt                        |
| 2026-09-06 14:13                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | Manifest checks debug/internal/release                                                     | PASS    | Six reviewed permissions per variant; only `dev.yash.tools.MainActivity` exported             |
| 2026-09-06 14:14                                                                                                                                                                                                                                                                                                                                                                                             | Sensitive clipboard batch | APK v2 signature, AAB native-library, work-items/actions, `git diff --check`               | PASS    | APK v2 verified; AAB unsigned with no `.so`; manifests valid; no whitespace errors            |
| 2026-09-06 14:40                                                                                                                                                                                                                                                                                                                                                                                             | Generated-cache batch     | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 12 files/66 tests                   |
| 2026-09-06 14:41                                                                                                                                                                                                                                                                                                                                                                                             | Generated-cache batch     | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | Main JS 247.61 kB/78.49 kB gzip; 10 E2E scenarios; assets packaged into the Android project   |
| 2026-09-06 14:42                                                                                                                                                                                                                                                                                                                                                                                             | Generated-cache batch     | `testDebugUnitTest`                                                                        | PASS    | 8 GeneratedCachePolicy tests plus existing policy suites (22 native tests); zero failures     |
| 2026-09-06 14:43                                                                                                                                                                                                                                                                                                                                                                                             | Generated-cache batch     | `lintDebug assembleDebug assembleInternal bundleRelease`                                   | PASS    | Zero lint errors; debug/internal APKs and minified release AAB rebuilt                        |
| 2026-09-06 14:44                                                                                                                                                                                                                                                                                                                                                                                             | Generated-cache batch     | Manifest checks, APK v2, AAB `.so`, work-items/actions, `git diff --check`                 | PASS    | Six permissions/variant; one exported Activity; unsigned AAB with no `.so`; audits valid      |
| 2026-09-06 15:00                                                                                                                                                                                                                                                                                                                                                                                             | Renderer-recovery batch   | `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync` | PASS    | Strict types; zero lint warnings; 12 files/66 tests; 10 E2E scenarios; assets synced          |
| 2026-09-06 15:01                                                                                                                                                                                                                                                                                                                                                                                             | Renderer-recovery batch   | `testDebugUnitTest`                                                                        | PASS    | 5 new RendererRecoveryPolicy tests (27 native tests total); zero failures                     |
| 2026-09-06 15:02                                                                                                                                                                                                                                                                                                                                                                                             | Renderer-recovery batch   | `lintDebug assembleDebug assembleInternal bundleRelease`                                   | PASS    | Zero lint errors; debug/internal APKs and minified release AAB rebuilt                        |
| 2026-09-06 15:03                                                                                                                                                                                                                                                                                                                                                                                             | Renderer-recovery batch   | Manifest checks, APK v2, AAB `.so`, work-items audit, `git diff --check`                   | PASS    | Six permissions/variant; one exported Activity; unsigned AAB with no `.so`; audits valid      |
| 2026-09-06 19:20                                                                                                                                                                                                                                                                                                                                                                                             | Markdown Preview batch    | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 14 files/80 tests                   |
| 2026-09-06 19:21                                                                                                                                                                                                                                                                                                                                                                                             | Markdown Preview batch    | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | Markdown lazy chunk 73.78 kB/25.09 kB gzip; 12 E2E scenarios; assets synced                   |
| 2026-09-06 19:23                                                                                                                                                                                                                                                                                                                                                                                             | Markdown Preview batch    | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 27 native tests; zero lint errors; debug/internal APKs and minified release AAB built         |
| 2026-09-06 19:24                                                                                                                                                                                                                                                                                                                                                                                             | Markdown Preview batch    | Manifest checks, APK v2, AAB `.so`, work-items/actions, `git diff --check`                 | PASS    | Six permissions/variant; one exported Activity; unsigned AAB with no `.so`; audits valid      |
| 2026-09-06 20:20                                                                                                                                                                                                                                                                                                                                                                                             | Content-read batch        | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 14 files/93 tests                   |
| 2026-09-06 20:21                                                                                                                                                                                                                                                                                                                                                                                             | Content-read batch        | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | Main JS 250.70 kB/79.28 kB gzip; 12 E2E scenarios; assets synced                              |
| 2026-09-06 20:22                                                                                                                                                                                                                                                                                                                                                                                             | Content-read batch        | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 11 new ContentReadPolicy tests (38 native tests); zero lint errors; all variants built        |
| 2026-09-06 20:23                                                                                                                                                                                                                                                                                                                                                                                             | Content-read batch        | Manifest checks, APK v2, AAB `.so`, work-items/actions, `git diff --check`                 | PASS    | Six permissions/variant; one exported Activity; unsigned AAB with no `.so`; audits valid      |
| 2026-09-06 21:00                                                                                                                                                                                                                                                                                                                                                                                             | Regex Tester batch        | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 17 files/123 tests                  |
| 2026-09-06 21:01                                                                                                                                                                                                                                                                                                                                                                                             | Regex Tester batch        | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | RegexTester lazy chunk 6.78 kB/2.49 kB gzip plus 1.47 kB worker chunk; 14 E2E scenarios       |
| 2026-09-06 21:02                                                                                                                                                                                                                                                                                                                                                                                             | Regex Tester batch        | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 38 native tests unchanged; zero lint errors; debug/internal APKs and minified release AAB     |
| 2026-09-06 21:03                                                                                                                                                                                                                                                                                                                                                                                             | Regex Tester batch        | Manifest checks, APK v2, AAB contents, work-items/actions, `git diff --check`              | PASS    | Six permissions/variant; one exported Activity; worker chunk in all artifacts; audits valid   |
| 2026-09-06 21:50                                                                                                                                                                                                                                                                                                                                                                                             | QR Generator batch        | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 19 files/139 tests                  |
| 2026-09-06 21:51                                                                                                                                                                                                                                                                                                                                                                                             | QR Generator batch        | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | QrGenerator lazy chunk 29.29 kB/10.94 kB gzip; 16 E2E scenarios; assets synced                |
| 2026-09-06 21:52                                                                                                                                                                                                                                                                                                                                                                                             | QR Generator batch        | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 38 native tests; zero lint errors; debug/internal APKs and minified release AAB built         |
| 2026-09-06 21:53                                                                                                                                                                                                                                                                                                                                                                                             | QR Generator batch        | Manifest checks, APK v2, artifact contents, work-items/actions, `git diff --check`         | PASS    | Six permissions/variant; one exported Activity; tool chunk in all artifacts; audits valid     |
| 2026-09-06 23:05                                                                                                                                                                                                                                                                                                                                                                                             | JSON Editor batch         | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 21 files/158 tests                  |
| 2026-09-06 23:06                                                                                                                                                                                                                                                                                                                                                                                             | JSON Editor batch         | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | JsonEditor lazy chunk 7.14 kB/2.79 kB gzip; 18 E2E scenarios; assets synced                   |
| 2026-09-06 23:07                                                                                                                                                                                                                                                                                                                                                                                             | JSON Editor batch         | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 38 native tests; zero lint errors; debug/internal APKs and minified release AAB built         |
| 2026-09-06 23:08                                                                                                                                                                                                                                                                                                                                                                                             | JSON Editor batch         | Manifest checks, APK v2, artifact contents, work-items/actions, `git diff --check`         | PASS    | Six permissions/variant; one exported Activity; tool chunk in all artifacts; audits valid     |
| 2026-09-07 00:25                                                                                                                                                                                                                                                                                                                                                                                             | Notes batch               | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`                            | PASS    | Formatting accepted; strict types and zero lint warnings; 23 files/176 tests                  |
| 2026-09-07 00:26                                                                                                                                                                                                                                                                                                                                                                                             | Notes batch               | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                                             | PASS    | NotesScratchpad lazy chunk 4.64 kB/2.07 kB gzip; 20 E2E scenarios; assets synced              |
| 2026-09-07 00:27                                                                                                                                                                                                                                                                                                                                                                                             | Notes batch               | `testDebugUnitTest`, `lintDebug`, all variants                                             | PASS    | 38 native tests; zero lint errors; debug/internal APKs and minified release AAB built         |
| 2026-09-07 00:28                                                                                                                                                                                                                                                                                                                                                                                             | Notes batch               | Manifest checks, APK v2, artifact contents, work-items/actions, `git diff --check`         | PASS    | Six permissions/variant; one exported Activity; tool chunk in all artifacts; audits valid     |
| Android Lint currently reports warnings, not errors: generated Capacitor launcher/splash resources need final replacement/cleanup; some generated resources appear unused; Gradle 8.14.5 and AppCompat 1.8.0 updates are available; generated `flatDir`/Gradle 9 deprecation and Capacitor Filesystem deprecation notices remain. Review rather than suppress them during the relevant dependency/icon pass. |

## 7. Artifact inventory

| Artifact     | Package/role              |     Bytes | SHA-256                                                            | Signing/status                           |
| ------------ | ------------------------- | --------: | ------------------------------------------------------------------ | ---------------------------------------- |
| Debug APK    | `dev.yash.tools.debug`    | 5,445,131 | `b24af37d8a2054738f67710cd92b58a326ab72e6d3cd098d35ce593a79262bd2` | Local debug key; APK v2 verified         |
| Internal APK | `dev.yash.tools.internal` | 5,447,023 | `1c7dac35e93bf09426bfc9c491ea07c4034e3340b1844ba96814b63aa93545b5` | Local debug key; APK v2 verified         |
| Release AAB  | `dev.yash.tools`          | 2,218,800 | `c7437cb2722d030ba7e2b1db25a862097471f9d5d4dd659a6cc23fea25dec004` | Build proof only; intentionally unsigned |

These are reproducibility evidence, not publication candidates. Rebuild after any source/config change and never distribute a debug-key artifact as production.

## 8. Active risks, blockers, and assumptions

| ID    | Type       | Severity | Item                                                                                                   | Safe next action                                                                                                    |
| ----- | ---------- | -------: | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| D-001 | Decision   |     High | `Yash Tools`, `dev.yash.tools`, and `app.yash.tools` are provisional                                   | Approve/change before Play application creation                                                                     |
| B-001 | Blocker    |     High | No physical Android device evidence yet                                                                | Build APK, connect/authorize device, execute checklist                                                              |
| B-002 | Blocker    |     High | No Play account/signing identity supplied                                                              | User completes account/identity and key-custody decision later; do not request passwords                            |
| B-003 | Blocker    |   Medium | GitHub branch protection/rulesets are unavailable for this private repository on the current plan      | Keep the repository private; upgrade the account plan, then enforce PRs/checks/no-force-push via issue #129         |
| R-001 | Risk       |     High | A future Android plugin update may add permissions/components                                          | Keep the merged-manifest CI check mandatory and review every allowlist change                                       |
| R-002 | Risk       |     High | Renderer termination could lose current nonsensitive work or loop                                      | Implemented rate-limited native recovery and safe mode; verify on device                                            |
| R-003 | Risk       |   Medium | SAF selection returns metadata/URI; file-consuming tools still need bounded/streamed reads             | Add a separate reviewed content-URI read/stream method with the first file-consuming tool                           |
| R-004 | Risk       |   Medium | Current Capacitor Clipboard cannot express Android sensitive metadata                                  | Add reviewed narrow native method before secret-copy tools                                                          |
| R-005 | Risk       |   Medium | Share and Save As caches lack orphan cleanup after process death or failed immediate deletion          | Implement bounded generated-file retention through issue #15 before QR/export tools                                 |
| R-006 | Risk       |   Medium | `INTERNET` exists before network tools are enabled due to planned app scope/plugins                    | Keep disclosed; verify no runtime requests from offline tools                                                       |
| R-007 | Risk       |     High | The all-87 first-release scope creates a long critical path and concentrates tool-specific policy risk | Use the 12-tool milestone and controlled migration batches; any smaller production scope requires a superseding ADR |
| A-001 | Assumption |   Medium | API 24 remains product minimum                                                                         | Revalidate against audience/device distribution before beta                                                         |
| A-002 | Assumption |   Medium | Strict local-only backup policy is preferred                                                           | User approves before durable Notes/Bookmarks release                                                                |
| A-003 | Assumption |      Low | Initial public app is free, no ads/account/analytics                                                   | Any change requires ADR/privacy/Play review                                                                         |

## 9. Next executable queue

1. Configure the recommended saved Project views in GitHub's UI; upgrade the account plan before completing protected-main issue #129.
2. Add process-recreation, permission, picker, Save As, share, notification, and renderer-recovery instrumentation/UI Automator coverage.
3. Connect/authorize a physical Android device (or approved emulator), install the debug APK, and execute the physical checklist.
4. Port Pomodoro Timer with best-effort notifications and process reconstruction (issue #101).
5. Complete and Android-validate all 12 tools in the architecture milestone.
6. Migrate the remaining 75 audited tools in controlled, risk-ordered batches until all 87 pass their Definition of Done.
7. Replace generated launcher/splash assets, including adaptive and monochrome icons, after final visual identity approval.
8. Approve or revise the provisional app name, application ID, bundled origin, and privacy posture before release work; public v1 tool count is resolved at 87 by ADR 0004.
9. Freeze release-signing/key-custody strategy without committing secrets.

## 10. Release-gate snapshot

### Architecture gate

- Status: **FOUNDATION PASS COMPLETE; FULL GATE IN PROGRESS**.
- Passed: stack, bundled/minified builds, typed registry, adapter boundary, three representative tools, browser QA, manifest budget, baseline security config.
- Missing: complete 12-tool internal slice, file-content streaming, and physical/Play-installed artifact evidence.

### Closed-beta gate

- Status: **NOT READY**.
- Scope: **FROZEN at all 87 audited tools by ADR 0004**.
- Missing: all 87 tools complete, policy/privacy/license/SBOM artifacts, device matrix, support/incident procedures exercised.

### Production gate

- Status: **NOT READY**.
- Missing: verified identity/package, signing, closed testing eligibility, Play declarations, store assets, final manifest, rollout plan, and every release gate in the implementation plan.

## 11. Decision register summary

| Decision                     | Current state                                                                   | Authority                                                 |
| ---------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Stack                        | Accepted                                                                        | `docs/decisions/0001-foundation-stack.md`                 |
| App identity/origin          | Provisional                                                                     | `docs/decisions/0002-provisional-identity-and-privacy.md` |
| v1 privacy posture           | Provisional recommended default                                                 | ADR 0002 and implementation plan                          |
| Android document boundary    | Versioned SAF picker/Save As with bounded private handoff                       | `docs/decisions/0003-scoped-document-bridge.md`           |
| Public v1 tool scope         | All 87 audited catalog tools; 12-tool slice remains an internal milestone       | `docs/decisions/0004-all-87-tools-first-release-scope.md` |
| Backup policy                | Strict exclusion configured, awaiting product approval before durable-data beta | ADR 0002                                                  |
| Internal routing             | Hash routes accepted for foundation                                             | Architecture document                                     |
| App Links                    | Deferred until website/domain/certificate work exists                           | Implementation plan                                       |
| First production publication | Managed-publishing staffed launch; no percentage staging                        | Implementation plan                                       |
| Later updates                | Staged rollout with halt/forward-fix plan                                       | Implementation plan                                       |

## 12. Session change log

### 2026-09-05 — Foundation creation

- Created separate Git repository.
- Pinned current compatible React/Vite/TypeScript/Tailwind/Capacitor stack.
- Corrected an initial TypeScript 7 selection because the current typed ESLint toolchain supports TypeScript below 6.1; pinned TypeScript 6.0.3.
- Implemented typed platform contracts and web/Android adapters.
- Implemented adaptive shell, routes, catalog, settings, themes, favorites, recents, and offline status.
- Implemented Unit Converter, Timestamp Converter, and Hash Generator with pure tests.
- Generated Android project and applied strict network, backup, FileProvider, variant, and release-shrinking defaults.
- Added CI, Playwright configuration, agent manuals, architecture/design/provenance/device documentation, ADRs, copied plan, and tracker.
- Added the React recovery boundary and corrected the expanded rail's accessible navigation semantics.
- Added exact-width phone/tablet E2E coverage and visually reviewed phone/tablet screenshots.
- Removed plugin-implied exact-alarm/reboot capability and the tooling-only exported profile receiver.
- Added an executable merged-manifest permission/export budget and wired it into CI/build scripts.
- Passed final web, E2E, Gradle lint, debug/internal APK, minified release AAB, manifest, signature, native-library, and documentation-integrity checks.
- Recorded final artifact hashes and the physical-device blocker; no device was connected.
- Created the private GitHub repository, configured `origin`, pushed `main`, and verified `visibility=PRIVATE`.

### 2026-09-05 — Foundation UI and adapter-contract batch

- Added a visible Recent destination to compact and expanded navigation, ordered by last-opened tool, with stale-ID filtering, a useful empty state, device-local wording, and explicit history clearing.
- Prevented the asynchronous initial Recent load from overwriting a newly opened tool.
- Added shared contract coverage for web and Capacitor clipboard, preferences, external browser, and network adapters.
- Added file/share and notification adapter cases, typed share cancellation/save failure codes, shared external-URL validation, and generated-filename sanitization.
- Corrected web Base64 sharing so Save/Share use decoded bytes and changed timed clipboard clearing to preserve newer clipboard contents.
- Added interaction tests for Unit Converter, Timestamp Converter, and Hash Generator.
- Passed all required web, E2E, Capacitor sync, Gradle variant, merged-manifest, signature, and native-library gates; no physical device was connected.

### 2026-09-05 — Scoped Android document batch

- Added the manually registered, bridge-contract-v1 `DocumentFiles` plugin for `ACTION_OPEN_DOCUMENT` and `ACTION_CREATE_DOCUMENT`.
- Added native validation for operation IDs, MIME filters, URI schemes, selection counts, sizes, filenames, cache paths, concurrency, cancellation, and interrupted calls.
- Kept selected content outside the JavaScript bridge and used a 5 MiB private-cache handoff for generated Save As output; cache data is removed after success, cancellation, or failure.
- Disabled Capacitor bridge logging in every variant so plugin arguments cannot expose clipboard values, generated bytes, or filenames in Logcat.
- Added adapter contract cases for valid/malformed/cancelled picker results and Save As handoff/cleanup, plus six native policy tests and CI execution.
- Added ADR 0003 and updated architecture/provenance records.
- Passed web, E2E, Capacitor sync, native unit, Gradle lint/variant, merged-manifest, signature, R8 retention, and native-library gates; system-picker/device behavior remains unverified without a connected device.

### 2026-09-05 — Public version 1 scope decision

- Recorded the product owner's approval that the first public Google Play release must include all 87 tools from the audited upstream catalog.
- Retained the 12-tool vertical slice as an architecture milestone and made the remaining 75-tool migration an explicit post-milestone requirement.
- Replaced the earlier approximate 70-tool target and later-version deferrals with an all-87 release gate; unresolved tool-specific technical, policy, legal, privacy, accessibility, or device evidence now blocks production unless a superseding ADR explicitly changes scope.
- Added ADR 0004 and synchronized the operating guides, architecture overview, README, roadmap, tracker, release gates, and schedule assumptions.
- Passed `pnpm format:check`, `git diff --check`, the `AGENT.md`/`CLAUDE.md` byte-identity check, and local ADR-reference existence checks. This planning-only batch changed no application artifact; the hashes in Section 7 remain current for commit `7866734`.

### 2026-09-05 — GitHub work-management and governance batch

- Added issue forms for bugs, tools, foundation work, and release gates plus a verification-oriented pull-request template.
- Added a typed, linted, idempotent manifest/provisioner containing the complete 87-tool catalog and all foundation, quality, policy, device, signing, store, closed-test, and explicitly authorized launch gates.
- Provisioned private Project #8, 128 marked issues, 29 labels, 6 milestones, 90 native blocking relationships, and 7 custom planning fields; linked PR #1 to its scoped SAF work item.
- Added stable repository/Project/epic links and synchronized the GitHub execution rules across `AGENT.md`, `CLAUDE.md`, README, tracker, and work-management guide.
- Pinned every CI action to an audited immutable commit SHA while retaining the documented release line.
- Verified that both branch-protection and repository-ruleset APIs return HTTP 403 for the current private-repository plan. The repository remains private; issue #129 tracks the account-plan prerequisite and protected-main configuration.
- Pushed `chore/github-work-management`, opened stacked PR #130 against the SAF branch, linked it to issue #12, and added it to Project #8 with all planning fields.
- Passed manifest/action-policy validation, strict typecheck, ESLint with zero warnings, all 58 unit/component tests, 10 E2E scenarios, the production build, Capacitor sync, native unit tests, Android Lint, all required variants, manifest budgets, APK v2 signature checks, and remote read-back counts.
- Changed no Android application source. The validation run regenerated and re-hashed the build artifacts recorded in Section 7; the release AAB remains intentionally unsigned and contains no native `.so` entries.

### 2026-09-06 — PR #1 pre-merge audit

- Reviewed the scoped picker and Save As bridge, TypeScript adapter, native policy, recovery assumptions, cache boundaries, error mapping, tests, ADR, generated manifests, and hosted PR state before merge.
- Changed the destination stream mode from generic write (`w`) to explicit write-and-truncate (`wt`) so a provider cannot retain stale trailing bytes when replacing output, and added native policy regression coverage.
- Re-ran formatting, strict typecheck/lint, 58 unit/component tests, production build, 10 E2E scenarios, Capacitor sync, 7 native policy tests, Android Lint, debug/internal APKs, release AAB, three manifest-budget checks, APK v2 signatures, and native-library inspection successfully.
- Physical system-picker, provider-interoperability, and process-recreation evidence remains assigned to the existing instrumentation and device issues; it is not claimed by this merge.

### 2026-09-06 — GitHub issue and Project gap audit

- Reconciled the issue manifest against the exact 87-tool upstream catalog and confirmed no missing or extra tool work items.
- Expanded issue #15 from share-only cleanup to bounded generated-file retention for both `cache/share/` and orphaned `cache/save/<operation>/` handoffs, including process death, failed immediate deletion, active-operation protection, and lazy-reader/provider tests.
- Made provisioning reconcile managed issue titles, bodies, labels, milestones, parent relationships, and dependency removals/additions instead of only creating missing records; unmanaged labels, checked criteria, and notes outside managed markers are preserved.
- Added manifest hierarchy/dependency cycle checks, duplicate blocker/marker detection, Project option validation, closed-item Done mapping, and remote Project field-shape verification.
- Applied the updated manifest successfully: 128 existing issues reconciled, zero duplicates, zero reparenting, zero dependency drift, and 128 closing markers confirmed by read-back. All 87 tool issues remain present.
- Merged fully described and green PR #1 into `main` as merge commit `7d3b2d7`, automatically closed issue #13, and reconciled both the issue and pull-request Project items to Done.
- Retargeted PR #130 from the merged feature branch to `main`, replaced its stale stacking notes with the gap-audit evidence, and confirmed a clean merge state with both hosted CI jobs passing.
- Generalized bootstrap pull-request reconciliation so a rebuilt Project restores and state-maps both PR #1 and PR #130 instead of only the original SAF pull request.
- Recorded completion evidence on issue #12, checked both acceptance criteria, and squash-merged PR #130 into `main` as `1fbd6af` after both hosted jobs passed.

### 2026-09-06 — Sensitive Android clipboard batch

- Added the app-owned, version-1 `SensitiveClipboard` Capacitor plugin with a single `write` operation that carries the bridge contract version, value, and sensitive flag.
- On Android 13+ the plugin attaches `ClipDescription.EXTRA_IS_SENSITIVE` through `setExtras(PersistableBundle)`; older versions degrade to a normal write. The write runs on the main thread with an empty clip label, performs no logging or clipboard reads, and adds no permission, exported component, dependency, or ProGuard rule.
- Routed every Android clipboard write through the new bridge so normal and sensitive copies share one native policy path; clipboard reads and the stale-timer-protected timed clear remain on the official plugin and adapter.
- Added a 1 MiB UTF-8 clipboard write limit enforced in both adapters before the bridge and validated again natively; typed `CLIPBOARD_INVALID_ARGUMENT` and `CLIPBOARD_WRITE_FAILED` codes now cover invalid requests, write failures, and over-limit values.
- Added shared adapter contract cases (sensitive copy semantics, over-limit rejection on both platforms), Capacitor-specific bridge routing/error mapping cases, and seven pure `ClipboardPolicy` native tests including the API 33 gating decision.
- Added ADR 0005 and updated the architecture overview and source provenance. Physical verification of the sensitive extra, preview suppression, and timed clear inside the installed artifact remains assigned to the instrumentation and device issues.
- Passed formatting, strict typecheck, zero-warning lint, 65 web tests (12 files), 10 E2E scenarios, production build, Capacitor sync, 14 native policy tests, Android Lint, debug/internal APK and minified release AAB builds, three manifest budgets, APK v2 signatures, AAB native-library inspection, work-item/action audits, and `git diff --check`.

### 2026-09-06 — Generated-file cache cleanup batch

- Added the app-owned, version-1 `GeneratedCache` Capacitor plugin with a single `cleanup` operation and a pure `GeneratedCachePolicy` for every deletion decision; the pass runs when the bridge loads so process-death orphans are recovered before JavaScript executes, and Android share/Save As adapters request additional passes before generated-file operations.
- Retention is bounded and deterministic: `cache/share/` files older than 6 hours and operation-owned `cache/save/<operation>/` directories older than 1 hour are deleted oldest-first with per-pass caps of 200 files and 50 operations; files with unreadable modification times stay protected for lazily reading share targets.
- Added active-operation protection through a process-local registry shared with the document plugin so an in-flight Save As handoff is never deleted, added low-space behavior that ignores age below 64 MiB free (but never overrides active-operation protection), and enforced canonical-path containment so only the two owned subtrees are ever touched.
- The pass is single-flight with typed `CACHE_CLEANUP_INVALID`/`CACHE_CLEANUP_IN_PROGRESS`/`CACHE_CLEANUP_FAILED` rejections that adapters swallow; Save As immediate cleanup, cancellation handling, and the 5 MiB handoff limit are unchanged.
- Added shared adapter contract coverage for the janitor trigger on share/Save As and eight pure `GeneratedCachePolicyTest` native cases covering retention, unknown-mtime protection, low-space eligibility, UUID-only ownership, active-operation protection, pass caps, deterministic ordering, and registry cleanup.
- Added ADR 0006 and updated the architecture overview and source provenance. Physical verification of retention behavior inside the installed artifact remains assigned to the interop and device issues.
- Passed formatting, strict typecheck, zero-warning lint, 66 web tests (12 files), 10 E2E scenarios, production build, Capacitor sync, 22 native policy tests, Android Lint, debug/internal APK and minified release AAB builds, three manifest budgets, APK v2 signatures, AAB native-library inspection, work-item/action audits, and `git diff --check`.

### 2026-09-06 — Renderer-recovery and native safe-mode batch

- Registered an app-owned `WebViewListener` on the Capacitor bridge after bridge initialization; its `onRenderProcessGone` implementation always returns true so the app owns recovery and the process stays alive.
- Added the pure, process-scoped `RendererRecoveryPolicy`: at most one automatic `Activity.recreate()` per 60-second window, after which recovery falls back to the native safe-mode screen; manual reload always recreates. A never-started window is represented as an expired one so ordinary arithmetic treats the first decision as fresh.
- Added the native safe-mode screen: a theme-aware full-screen overlay with string resources, an idempotent tag guard, a 48 dp-class Reload action, and an explicit title announcement for assistive technology; the crashed WebView is never touched.
- Added five pure `RendererRecoveryPolicyTest` native cases (window/limit behavior, window expiry, multiple records, stale state) and ADR 0007; updated the architecture overview and source provenance.
- Recorded a new toolchain observation: two builds of an identical committed web tree can produce different Vite 8/Rolldown bundle hashes with near-identical sizes. Generated `android/app/src/main/assets/public/` is gitignored, so this does not affect commits; artifact SHA-256 evidence remains per-build-run.
- Passed strict typecheck, zero-warning lint, 66 web tests (12 files), 10 E2E scenarios, production build, Capacitor sync, 27 native policy tests, Android Lint, debug/internal APK and minified release AAB builds, three manifest budgets, APK v2 signatures, AAB native-library inspection, the work-item audit, and `git diff --check`.
- Installed-artifact renderer-gone behavior (overlay, loop bounds, TalkBack) remains assigned to issues #17 and #18 and is not claimed here.

### 2026-09-06 — Foundation P0 merge reconciliation

- Merged and reconciled PR #132 (sensitive clipboard, issue #14), PR #133 (generated-cache cleanup, issue #15), and PR #134 (renderer recovery/safe mode, issue #16) into `main` as `e6241df`, `306bda6`, and `b112128`; all three issues closed by their pull requests and their Project items were mapped to Done.
- Verified `main` == `origin/main` with a clean worktree, all three hosted CI jobs green on each PR before merge, and no open pull requests remaining.
- Confirmed no physical device or configured emulator is connected (`adb devices -l` empty; no AVD present), so issues #17 and #18 remain hardware-blocked.
- Next executable item: the Markdown Preview tool migration; the foundation gates required before it (sensitive clipboard, cache cleanup, renderer recovery) are complete.

### 2026-09-06 — Markdown Preview tool migration batch

- Implemented the `markdown-preview` tool from the audited upstream component as pure typed logic plus a mobile UI: labeled input, debounced live preview, empty/invalid/over-limit/error/success states, copy actions for Markdown and HTML, and an explicit Reset; no persistence, no network, and no platform-sensitive API use outside the shared components.
- Added pinned dependencies `marked` 18.0.11 (MIT) and `dompurify` 3.4.14 (MPL-2.0 OR Apache-2.0), deliberately taking the most recent release outside the repository's release-age window instead of excluding a same-day sanitizer release with lockfile-only additions and no transitive duplicates; licenses recorded in provenance (ADR 0008).
- Added an explicit narrow sanitizer allowlist (document tags and attributes only), an enforced 256 KiB UTF-8 input limit checked before rendering, and a 150 ms render debounce; CSP remains defense in depth.
- Added 11 pure logic tests (standard GFM vectors plus a hostile-input corpus: scripts, styles, event handlers, javascript:/data: URIs, iframes/embeds/forms/SVG/MathML/media, disallowed attributes, content preservation) and 3 component tests; enabled the tool in the registry as a lazy chunk and added a sanitized-rendering E2E scenario.
- Updated the operating guides, README, tool table, and tracker counts to four enabled tools (83 remaining of the approved 87); synchronized `AGENT.md` and `CLAUDE.md` and refreshed their stale status warnings for this session's completed foundation work.
- Added ADR 0008 and provenance entries. Physical-device interaction evidence for Markdown Preview and the other enabled tools remains assigned to issue #18.
- Passed formatting, strict typecheck, zero-warning lint, 80 web tests (14 files), 12 E2E scenarios, production build, Capacitor sync, 27 native policy tests, Android Lint, debug/internal APK and minified release AAB builds, three manifest budgets, APK v2 signatures, AAB native-library inspection, work-item/action audits, and `git diff --check`.

### 2026-09-06 — Markdown Preview merge reconciliation

- Merged PR #135 into `main` as `9f08c2f`, closing issue #55; the Project item is Done. `main` == `origin/main` with a clean worktree, both hosted CI jobs green before merge, and no open pull requests remain.
- Four tools are now enabled (Unit Converter, Timestamp Converter, Hash Generator, Markdown Preview); 83 of the approved 87 remain.
- Next executable item: issue #19, bounded/streamed `content://` reads, which unblocks the first file-consuming tools.

### 2026-09-06 — Bounded/streamed content-URI read batch

- Extended the version-1 `DocumentFiles` bridge with `digestContent`, `cancelDigest`, and `readContent`, all natively validated and restricted to content URIs the picker returned in this process through a process-local `PickedUriRegistry`, so the bridge can never read an arbitrary provider URI.
- Native digest streaming hashes in 64 KiB chunks on a background thread and never sends file bytes over the bridge; the stream enforces a 1 GiB cap and a cancellation flag between chunks (`cancelDigest`, idempotent). Supported algorithms are SHA-1/SHA-256/SHA-512; MD5 remains excluded.
- Native bounded reads copy a picked document into memory with a 16 MiB hard cap (tools may pass smaller limits) and return Base64; oversized content is rejected, never truncated. Content operations are single-flight across digest and read.
- Added typed `FILE_READ_FAILED` and `FILE_READ_CANCELLED` codes plus the cancellation contract; added `readContent`/`digestContent` to the platform `FileService` contract with `AbortSignal` cancellation, a same-cap web `File` implementation, and a Web Crypto web digest implementation with the documented 50 MiB JavaScript limit.
- Added 11 pure `ContentReadPolicyTest` native cases with real SHA vectors (empty stream, `abc` vectors, multi-chunk streams, oversized rejection, mid-stream cancellation, hex encoding) and shared/native/web adapter contract cases (bounded reads, digest vectors, invalid limits/URIs/algorithms, pre-aborted signals, mid-flight cancellation wiring, native failure mapping).
- Added ADR 0009 and updated the architecture overview and provenance. Provider interoperability and process-interruption behavior with real DocumentsProviders remains assigned to issues #17/#18.
- Passed formatting, strict typecheck, zero-warning lint, 93 web tests (14 files), 12 E2E scenarios, production build, Capacitor sync, 38 native policy tests, Android Lint, debug/internal APK and minified release AAB builds, three manifest budgets, APK v2 signatures, AAB native-library inspection, work-item/action audits, and `git diff --check`.

### 2026-09-06 — Content-read bridge merge reconciliation

- Merged PR #136 into `main` as `c56cd26`, closing issue #19; the Project item is Done. `main` == `origin/main` with a clean worktree, both hosted CI jobs green before merge, and no open pull requests remain.
- The foundation now includes the bounded/streamed `content://` read path, so the file-consuming tools (Image Compressor, File Hash Checker) are unblocked; the vertical slice still needs Regex Tester, QR Generator, JSON Editor, Notes, Pomodoro, Image Compressor, File Hash Checker, and Currency Converter.
- Next executable item: the Regex Tester tool migration (terminable Worker, hostile-input time budgets).

### 2026-09-06 — Regex Tester tool migration batch

- Implemented the `regex-tester` tool from the audited upstream component as a pure bounded engine plus a terminable classic Web Worker (ADR 0010): 512-character pattern limit, 128 KiB test-string byte budget, 1000-match cap, 750 ms soft in-Worker budget, and a 3000 ms wall-clock deadline on the UI thread that terminates and replaces a wedged Worker. There is deliberately no main-thread fallback; unavailable Workers render an explicit unsupported state.
- Flag input is restricted to a narrow `d g i m s u v y` allowlist; stale responses are ignored by run id; new runs, cancels, and worker faults terminate the Worker so hostile patterns can wedge exactly one run and never the tool. Nothing is persisted, logged, or uploaded; inputs clear only through the explicit Reset.
- Added pure engine vectors (global/case-insensitive/multiline/dot-all/unicode/zero-width, match cap, byte-limit including multi-byte boundary, invalid flags/patterns, soft-budget timeout), eight terminable-client contract cases (success, stale id, deadline termination and recovery, run-supersedes-wedged-run, explicit cancel, unavailable Worker, worker fault, disposal), and six component cases (empty, matches with groups, invalid, timeout guidance, over-limit without running, reset). The browser E2E corpus grew to 14 scenarios and proves a `(a+)+$` near-miss that would block ~19 s is stopped and recovered in ~3.3 s on both phone and tablet profiles.
- Added ADR 0010 and updated the architecture overview and provenance. The registry now marks `regex-tester` enabled with a lazy component; the app-shell enabled-count test now derives from the registry instead of a hardcoded number. Physical-device evidence for Regex Tester (classic-Worker behavior on old WebViews, TalkBack) remains assigned to issues #17/#18.
- Passed formatting, strict typecheck, zero-warning lint, 123 web tests (17 files), 14 E2E scenarios, production build (RegexTester lazy chunk 6.78 kB/2.49 kB gzip plus a 1.47 kB worker chunk), Capacitor sync, 38 native policy tests, Android Lint, debug/internal APK and minified release AAB builds with the worker chunk present in every artifact, three manifest budgets, APK v2 signatures on both APKs, work-item/action audits, and `git diff --check`.
- Next executable item: the QR Code Generator tool migration (issue #51), which also exercises real Android file sharing.

### 2026-09-06 — Regex Tester merge reconciliation

- Merged PR #137 into `main` as `b401d4c`, closing issue #56; the Project item is Done and the issue carries `status:device-qa`. `main` == `origin/main` with a clean worktree, both hosted CI jobs green before merge, and no open pull requests remain.
- Five of the 87 approved tools are implemented. The vertical slice still needs QR Generator, JSON Editor, Notes/Scratchpad, Pomodoro Timer, Image Compressor, File Hash Checker, and Currency Converter.
- Next executable item: the QR Code Generator tool migration (issue #51), which also exercises real Android file sharing through the existing share bridge.

### 2026-09-06 — QR Generator tool migration batch

- Implemented the `qr-generator` tool from the audited upstream component as a pure generation/render-plan module plus a mobile UI (ADR 0011): typed results, a 4 000-byte input cap, per-level capacity errors with recovery guidance, whole-pixel module scaling, the spec 4-module quiet zone, and scannable black-on-white rendering instead of the upstream white-on-transparent symbol.
- Output flows exclusively through the platform `FileService`: Share PNG uses the reviewed `cache/share/` + system-share-sheet path (janitor-swept) and Save PNG uses the SAF `ACTION_CREATE_DOCUMENT` bridge; the upstream hidden download anchor is intentionally not copied. The canvas carries `role="img"` with a non-echoing label plus a visible text equivalent (version, module count, exact pixel size, level, byte count), and an explicit unsupported note appears when no 2D context exists. Nothing is persisted or logged.
- Added the pinned `qrcode` 1.5.4 (MIT) dependency with `@types/qrcode` 1.5.6; lockfile reviewed, license recorded in provenance, no native or network surface.
- Added 10 pure generation vectors (version-1 spec structure: finder patterns, separators, timing row; version growth; per-level capacities at the version-40 boundary; multi-byte byte-cap counting; over-limit before the library; render-plan whole-pixel math including the one-pixel-per-module floor; base64 vectors and chunk-boundary round-trip) and 7 component cases (empty, render + text equivalent, share, save, share failure recovery, over-limit, per-level capacity, reset). E2E grew to 16 scenarios and asserts the canvas backing size equals the documented output size exactly.
- Passed formatting, strict typecheck, zero-warning lint, 139 web tests (19 files), 16 E2E scenarios, production build (QrGenerator lazy chunk 29.29 kB/10.94 kB gzip), Capacitor sync, 38 native tests, Android Lint, debug/internal APK and minified release AAB builds with the tool chunk present, three manifest budgets, APK v2 signatures, work-item/action audits, and `git diff --check`.
- Next executable item: the JSON Editor tool migration (issue #49), which needs compact/expanded layouts, size/depth limits, and an accessible plain-text fallback.

### 2026-09-06 — QR Generator merge reconciliation

- Merged PR #138 into `main` as `9355fe9`, closing issue #51; the Project item is Done and the issue carries `status:device-qa`. `main` == `origin/main` with a clean worktree, both hosted CI jobs green before merge, and no open pull requests remain. An initial hosted lint failure (unused mock parameter in the new component test, missed by a local gate ordering mistake) was fixed and re-verified before merge; the failure never touched product code.
- Six of the 87 approved tools are implemented. The vertical slice still needs JSON Editor, Notes/Scratchpad, Pomodoro Timer, Image Compressor, File Hash Checker, and Currency Converter.
- Next executable item: the JSON Editor tool migration (issue #49).

### 2026-09-06 — JSON Editor tool migration batch

- Implemented the `json-editor` tool from the audited upstream component as bounded pure parsing plus a plain-text-first editor and a view-only inspector tree (ADR 0012): 256 KiB input cap checked before parsing, typed invalid/over-limit results with truncated messages, a recoverable RangeError branch for engines that recurse, and the upstream CodeMirror dependency and in-tree editing intentionally not copied. The tree renders only expanded paths with 48 dp `aria-expanded` rows, 80-character previews, a 1000-node render cap, a 64-level depth cap, and an expand-all refusal beyond 2000 nodes. Compact windows switch Editor/Tree through a tablist; expanded windows show both panels. Export is Copy/Share/Save through the `FileService` bridges; the upstream hidden download anchor is not copied.
- Fixed a parse-order defect found by the new vectors (oversized whitespace-only input previously reported `invalid` instead of `over-limit`) and documented the `1e999` engine serialization quirk and duplicate/`__proto__` key handling in tests.
- Added 11 pure vectors (representative and malformed documents, 60 000-deep nesting never crashing, size cap, duplicate and prototype-named keys as plain data, format/minify, tree expansion paths, render/depth/preview caps, expand-all cap) and 7 component cases (empty/valid/invalid, format/minify round-trip, disabled transforms, tree expand/collapse, share payload, over-limit, reset). E2E grew to 18 scenarios covering format, disabled transforms, and tree inspection on both device profiles.
- Passed formatting, strict typecheck, zero-warning lint, 158 web tests (21 files), 18 E2E scenarios, production build (JsonEditor lazy chunk 7.14 kB/2.79 kB gzip), Capacitor sync, 38 native tests, Android Lint, debug/internal APK and minified release AAB builds with the tool chunk present, three manifest budgets, APK v2 signatures, work-item/action audits, and `git diff --check`.
- Next executable item: the Notes/Scratchpad tool migration (issue #109) with durable storage, schema migration, export/import, and honest unencrypted-storage copy.

### 2026-09-07 — Notes/Scratchpad tool migration batch

- Implemented the `notes-scratchpad` tool from the audited upstream component as the repository's first durable tool data, recorded in ADR 0013: a versioned `{ schemaVersion, text, updatedAt }` payload in the platform `PreferenceStore` under `notes:scratchpad`, a migration gate where corrupt payloads start fresh and newer-schema payloads stay untouched with editing blocked, load-before-save autosave (500 ms debounce, unchanged-skip, 256 KiB bound with the previous note preserved on refusal), a two-step explicit Clear that removes the key, and two-step Import through the SAF picker with a non-throwing UTF-8 decode. Share/Save export as UTF-8 `scratchpad.txt` through the file bridges; the upstream `localStorage` use and hidden download anchor are not copied.
- Updated the Settings screen and app Clear-all flow for real durable data: the local-data panel and confirmation now enumerate the scratchpad note and state the unencrypted/not-recoverable truth, the storage-claims header no longer says only theme/favorites/recents are stored, and the hardcoded enabled-tools count now derives from the registry.
- Added 7 pure cases (round-trip, newer-schema refusal, corrupt-payload corpus, byte bounds, import decode with invalid UTF-8 replacement, word counting) and 10 component cases (load, empty, autosave, unchanged-skip, two-step clear, over-limit preservation, newer-schema blocking, two-step import, cancelled import, share payload). E2E grew to 20 scenarios and proves the note survives a full reload and clears only through the two-step confirmation on both device profiles.
- Passed formatting, strict typecheck, zero-warning lint, 176 web tests (23 files), 20 E2E scenarios, production build (NotesScratchpad lazy chunk 4.64 kB/2.07 kB gzip), Capacitor sync, 38 native tests, Android Lint, debug/internal APK and minified release AAB builds with the tool chunk present, three manifest budgets, APK v2 signatures, work-item/action audits, and `git diff --check`.
- Next executable item: the Pomodoro Timer tool migration (issue #101) with best-effort notifications and process reconstruction.

### 2026-09-06 — JSON Editor merge reconciliation

- Merged PR #139 into `main` as `d900561`, closing issue #49; the Project item is Done and the issue carries `status:device-qa`. `main` == `origin/main` with a clean worktree, both hosted CI jobs green before merge, and no open pull requests remain.
- Seven of the 87 approved tools are implemented. The vertical slice still needs Notes/Scratchpad, Pomodoro Timer, Image Compressor, File Hash Checker, and Currency Converter.
- Next executable item: the Notes/Scratchpad tool migration (issue #109) with durable storage, schema migration, export/import, and honest unencrypted-storage copy.

### 2026-09-07 — Notes/Scratchpad tool migration batch

- Implemented the `notes-scratchpad` tool from the audited upstream component as the repository's first durable tool data, recorded in ADR 0013: a versioned `{ schemaVersion, text, updatedAt }` payload in the platform `PreferenceStore` under `notes:scratchpad`, a migration gate where corrupt payloads start fresh and newer-schema payloads stay untouched with editing blocked, load-before-save autosave (500 ms debounce, unchanged-skip, 256 KiB bound with the previous note preserved on refusal), a two-step explicit Clear that removes the key, and two-step Import through the SAF picker with a non-throwing UTF-8 decode. Share/Save export as UTF-8 `scratchpad.txt` through the file bridges; the upstream `localStorage` use and hidden download anchor are not copied.
- Updated the Settings screen and app Clear-all flow for real durable data: the local-data panel and confirmation now enumerate the scratchpad note and state the unencrypted/not-recoverable truth, the storage-claims header no longer says only theme/favorites/recents are stored, and the hardcoded enabled-tools count now derives from the registry.
- Added 7 pure cases (round-trip, newer-schema refusal, corrupt-payload corpus, byte bounds, import decode with invalid UTF-8 replacement, word counting) and 10 component cases (load, empty, autosave, unchanged-skip, two-step clear, over-limit preservation, newer-schema blocking, two-step import, cancelled import, share payload). E2E grew to 20 scenarios and proves the note survives a full reload and clears only through the two-step confirmation on both device profiles.
- Passed formatting, strict typecheck, zero-warning lint, 176 web tests (23 files), 20 E2E scenarios, production build (NotesScratchpad lazy chunk 4.64 kB/2.07 kB gzip), Capacitor sync, 38 native tests, Android Lint, debug/internal APK and minified release AAB builds with the tool chunk present, three manifest budgets, APK v2 signatures, work-item/action audits, and `git diff --check`.
- Next executable item: the Pomodoro Timer tool migration (issue #101) with best-effort notifications and process reconstruction.
