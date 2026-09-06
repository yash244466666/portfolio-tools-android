# Android Tools Implementation Tracker

> Last updated: 2026-09-06 07:38 Europe/Berlin
> Tracker schema: 1
> Current milestone: Foundation pass
> Upstream portfolio commit: `61e54c64edbeffc9487239b6dae399e255c6a71d`
> Approved public version 1 scope: **all 87 audited catalog tools; 3 implemented, 84 remaining**
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

| Workstream                  | Status      | Current evidence                                                                            | Remaining gate                                                           |
| --------------------------- | ----------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Separate Git repository     | DONE        | Private GitHub repo; local `main` tracks `origin/main`                                      | Branch protection/required checks still require GitHub settings          |
| GitHub work management      | IN PROGRESS | Project #8; 128 reconciled issues including 87 tools; PR #130 green against `main`          | Merge setup PR; configure saved views; protected main needs GitHub Pro   |
| Web application scaffold    | DONE        | Production build, 58 tests, and 10 phone/tablet E2E scenarios                               | Continue extending tests with migrated tools                             |
| Capacitor Android scaffold  | DONE        | 13 official plugins plus one app-owned plugin; all Gradle variants pass                     | Install/smoke test requires an Android device                            |
| Adaptive application shell  | DONE        | Catalog, search, filters, Favorites/Recent, bottom nav/rail, overflow and screenshot review | Landscape, split-screen, 200% text, and physical-device review           |
| Tool registry               | PARTIAL     | Typed 12-tool milestone registry within the approved 87-tool public scope; unique-ID tests  | Add the remaining 75 entries only as their implementation batches mature |
| Enabled foundation tools    | DONE        | Unit, Timestamp, SHA Hash implementations and pure/E2E tests                                | Physical Android interaction check                                       |
| Platform contracts          | DONE        | Contracts plus shared web/Capacitor behavior tests across core adapter semantics            | Extend cases alongside each new native capability                        |
| Android platform adapters   | PARTIAL     | Core adapters plus versioned SAF Pick/Save As and native policy tests                       | Sensitive clipboard flag, share-cache cleanup, device tests              |
| Android hardening           | PARTIAL     | API 24/36, backup/network/file rules, shrink, three-variant manifest budget, artifacts      | WebView termination/native safe mode and final icon/splash work          |
| Agent documentation         | DONE        | Detailed synchronized `AGENT.md` and `CLAUDE.md`                                            | Recheck synchronization after future edits                               |
| Audited implementation plan | DONE        | Full plan copied into repository root                                                       | Reconcile if upstream reference changes                                  |
| Tracker and provenance      | DONE        | This file plus `docs/SOURCE_PROVENANCE.md`                                                  | Maintain every session                                                   |
| CI                          | PARTIAL     | Web/E2E and Android lint/debug/manifest-budget jobs defined                                 | Execute on hosted repository; pin actions by commit before production    |
| Physical device QA          | BLOCKED     | Checklist and installable debug APK exist; `adb devices -l` returned no devices             | Connect and authorize a device, then execute the checklist               |
| Play Console/release        | BLOCKED     | Release requirements documented                                                             | Requires approved identity, account, signing, store assets, declarations |

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
- [ ] WebView renderer-termination detection and native safe-mode screen.

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
- [ ] Android sensitive clipboard `EXTRA_IS_SENSITIVE` native bridge.
- [x] Android Storage Access Framework document picker with validated `content://` metadata.
- [x] Android `ACTION_CREATE_DOCUMENT` Save As bridge with a bounded private-cache handoff.
- [ ] Generated-file cache cleanup/retention scheduler; immediate Save As cleanup exists, but process-death/cleanup-failure orphans remain.
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
- [ ] WebView renderer termination recovery implemented.
- [ ] Native safe-mode/recovery surface implemented.
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

The first public Google Play release is approved to contain all 87 tools from the audited upstream catalog. The initial 12-tool vertical slice remains the first architecture milestone and contains the 3 currently implemented tools plus 9 planned tools. After the milestone, 75 additional catalog tools must be migrated; overall, 84 of 87 tools are not yet implemented.

| Public v1 category |  Tools |
| ------------------ | -----: |
| Core               |      7 |
| Developer          |     45 |
| Text               |     17 |
| Media              |      3 |
| Security           |      5 |
| Math               |     10 |
| **Total**          | **87** |

| Order | Tool                | Status  | Technical path proved                      | Next acceptance work                      |
| ----: | ------------------- | ------- | ------------------------------------------ | ----------------------------------------- |
|     1 | Unit Converter      | DONE    | Pure calculations, responsive form         | Physical device verification              |
|     2 | Timestamp Converter | DONE    | Date/time, live state, clipboard           | Locale/time-zone/device verification      |
|     3 | Hash Generator      | DONE    | Web Crypto, async state, clipboard         | Android WebView vectors/copy verification |
|     4 | Markdown Preview    | PLANNED | Sanitization, rich rendering               | Extract, DOMPurify/marked, CSP tests      |
|     5 | Regex Tester        | PLANNED | Worker, cancellation, hostile input        | Design worker protocol and time budget    |
|     6 | QR Generator        | PLANNED | Canvas, PNG output, Android sharing        | Finish share/file retention path          |
|     7 | JSON Editor         | PLANNED | CodeMirror, import/export, adaptive editor | Size/depth limits and accessible fallback |
|     8 | Notes/Scratchpad    | PLANNED | Durable preferences, migrations, export    | Storage schema and unencrypted-data UX    |
|     9 | Pomodoro Timer      | PLANNED | Lifecycle, notification, reconstruction    | Notification channel and reboot semantics |
|    10 | Image Compressor    | PLANNED | Picker, decoded limits, generated output   | SAF picker, EXIF/metadata policy          |
|    11 | File Hash Checker   | PLANNED | Large files, cancellation, streaming       | Native stream plugin or strict JS cap     |
|    12 | Currency Converter  | PLANNED | Network, cache, offline/stale              | Packaged-origin CORS and provider review  |

Vertical-slice completion requires all twelve to pass their Definition of Done in `AGENT.md`, not merely render. Public-release completion additionally requires the remaining 75 tools to pass the same gate; the 12-tool milestone is not an approved production subset.

## 5. Platform adapter status

| Adapter          | Web                | Android             | Automated tests                 | Device tests | Notes                                                |
| ---------------- | ------------------ | ------------------- | ------------------------------- | ------------ | ---------------------------------------------------- |
| Clipboard        | Implemented        | Implemented         | Shared contract tests           | Pending      | Sensitive flag needs custom native implementation    |
| Preferences      | Implemented        | Implemented         | Shared contract tests           | Pending      | Foundation values only; durable schema still pending |
| Secure random    | Implemented        | Same implementation | Shared utility tests            | Pending      | Web Crypto only                                      |
| Network state    | Implemented        | Implemented         | Shared contract tests           | Pending      | Connectivity is not reachability                     |
| External browser | Implemented        | Implemented         | Shared URL/adapter tests        | Pending      | HTTPS only; embedded credentials rejected            |
| Lifecycle        | Implemented        | Implemented         | Listener cleanup partly covered | Pending      | Process/renderer recovery still pending              |
| Haptics          | Best effort        | Implemented         | Not required                    | Pending      | Never blocks primary action                          |
| Notifications    | Permission only    | Implemented         | Schedule/cancel contract tests  | Pending      | No exact-alarm permission                            |
| File picker      | Browser input      | SAF Open Document   | Adapter + native policy tests   | Pending      | Metadata/content URI only; no broad permissions      |
| File share       | Download/Web Share | Cache + Share       | Bytes/name/cache-path tests     | Pending      | Retention cleanup pending                            |
| Save As          | Browser download   | SAF Create Document | Adapter + native policy tests   | Pending      | 5 MiB handoff; immediate best-effort cache cleanup   |

## 6. Quality-gate evidence

| Date/time        | Commit/worktree          | Command                                                            | Result  | Evidence/notes                                                                                |
| ---------------- | ------------------------ | ------------------------------------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| 2026-09-05 14:39 | Uncommitted foundation   | `pnpm format:check`                                                | PASS    | All tracked source/document formats accepted                                                  |
| 2026-09-05 14:39 | Uncommitted foundation   | `pnpm check`                                                       | PASS    | Strict typecheck; ESLint zero warnings; 6 files/16 tests; production build                    |
| 2026-09-05 14:39 | Uncommitted foundation   | `pnpm build`                                                       | PASS    | Main JS 240.43 kB / 76.32 kB gzip; enabled tools remain lazy chunks                           |
| 2026-09-05 14:40 | Uncommitted foundation   | `pnpm test:e2e`                                                    | PASS    | 8 scenarios across Pixel 5/tablet contexts; exact 320/375/600/768/1024 overflow loop          |
| 2026-09-05 14:35 | Uncommitted foundation   | Playwright full-page screenshot review                             | PASS    | Phone and 1024 px layouts visually inspected; no clipping or accidental desktop-only shell    |
| 2026-09-05 14:43 | Uncommitted foundation   | `./android/gradlew -p android lintDebug`                           | PASS    | Zero errors, 15 recorded warnings: generated icons/resources and available dependency updates |
| 2026-09-05 14:43 | Uncommitted foundation   | `assembleDebug assembleInternal bundleRelease`                     | PASS    | Final web assets packaged; debug/internal APKs and minified release AAB produced              |
| 2026-09-05 14:43 | Uncommitted foundation   | `pnpm android:manifest:check debug/internal/release`               | PASS    | Six reviewed permissions per variant; only `dev.yash.tools.MainActivity` exported             |
| 2026-09-05 14:43 | Uncommitted foundation   | APK signature and AAB native-library inspection                    | PASS    | APKs verify v2; AAB intentionally unsigned; no `.so` entries                                  |
| 2026-09-05 14:41 | Uncommitted foundation   | `cmp`/SHA-256 documentation integrity checks                       | PASS    | Agent files identical; copied plan checksum exactly matches upstream                          |
| 2026-09-05 14:41 | Uncommitted foundation   | `adb devices -l`                                                   | BLOCKED | ADB server available, but no emulator or authorized physical device is connected              |
| 2026-09-05 17:51 | Current foundation batch | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`                 | PASS    | Prettier accepted all files; strict TypeScript and ESLint completed with zero errors/warnings |
| 2026-09-05 17:51 | Current foundation batch | `pnpm test`                                                        | PASS    | 12 files/52 tests: shared adapter contracts and all enabled-tool component interactions       |
| 2026-09-05 17:51 | Current foundation batch | `pnpm build`                                                       | PASS    | Main JS 243.61 kB / 77.20 kB gzip; enabled tools remain lazy chunks                           |
| 2026-09-05 17:52 | Current foundation batch | `pnpm test:e2e`                                                    | PASS    | 10 scenarios across phone/tablet, including persisted Recent navigation                       |
| 2026-09-05 17:45 | Current foundation batch | Recent UI screenshot review                                        | PASS    | Empty-state phone dark and 1024 px light layouts inspected; labeled four-item adaptive nav    |
| 2026-09-05 17:52 | Current foundation batch | `pnpm cap:sync`                                                    | PASS    | Current production web bundle copied into the Android asset output                            |
| 2026-09-05 17:53 | Current foundation batch | `lintDebug`, `assembleDebug`, `assembleInternal`, `bundleRelease`  | PASS    | All required Gradle variants completed; existing flatDir/Gradle deprecation warnings remain   |
| 2026-09-05 17:54 | Current foundation batch | Manifest checks for debug/internal/release                         | PASS    | Six reviewed permissions per variant; only `dev.yash.tools.MainActivity` exported             |
| 2026-09-05 17:54 | Current foundation batch | APK signatures and AAB native-library inspection                   | PASS    | Debug/internal APK v2 signatures verify; release AAB remains unsigned; no `.so` entries       |
| 2026-09-05 18:55 | SAF document batch       | `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm test`    | PASS    | Formatting, strict types, zero lint warnings, and 12 files/58 tests                           |
| 2026-09-05 18:49 | SAF document batch       | `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`                     | PASS    | Main JS 246.85 kB/78.32 kB gzip; 10 E2E cases; packaged config disables bridge logging        |
| 2026-09-05 18:50 | SAF document batch       | `testDebugUnitTest`, `lintDebug`, all variant builds               | PASS    | 6 native policy tests; zero lint errors; debug/internal APK and minified release AAB built    |
| 2026-09-05 18:51 | SAF document batch       | Manifest, signing, R8, and native-library audits                   | PASS    | Six reviewed permissions; one exported Activity; APK v2; plugin methods kept; no AAB `.so`    |
| 2026-09-05 20:24 | GitHub management batch  | Work-item/action audits, `pnpm typecheck`, `pnpm lint`             | PASS    | 128-issue/87-tool manifest and 8 immutable action references valid; strict checks pass        |
| 2026-09-05 20:24 | GitHub management batch  | Idempotent remote provisioning and read-back audit                 | PASS    | Project #8; 128 markers/87 tools; 29 labels; 6 milestones; 90 dependencies; 7 custom fields   |
| 2026-09-05 20:24 | Repository governance    | GitHub branch-protection and ruleset API checks                    | BLOCKED | Private-repository account plan returns HTTP 403 and requires GitHub Pro or public visibility |
| 2026-09-05 20:27 | GitHub management batch  | `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm cap:sync`        | PASS    | 12 files/58 tests; 10 E2E scenarios; production bundle packaged into the Android project      |
| 2026-09-05 20:27 | GitHub management batch  | Native unit, lint, debug/internal/release builds and manifests     | PASS    | Gradle passed; six permissions/variant; one exported Activity; no AAB `.so` files             |
| 2026-09-06 07:08 | PR #1 pre-merge audit    | Full web, E2E, sync, native unit/lint/variant/manifest gates       | PASS    | 58 web tests, 10 E2E; 7 native policy tests; explicit Save As truncation regression covered   |
| 2026-09-06 07:25 | GitHub issue gap audit   | Manifest validation, remote reconciliation, and read-back          | PASS    | 87-tool catalog exact; 128 managed bodies; no duplicate, stale dependency, or hierarchy drift |
| 2026-09-06 07:32 | PR #1 merge and retarget | Hosted `web-quality`/`android-debug`; post-merge Project read-back | PASS    | PR #1 merged as `7d3b2d7`; issue #13 and PR item Done; PR #130 clean against `main`           |

Android Lint currently reports warnings, not errors: generated Capacitor launcher/splash resources need final replacement/cleanup; some generated resources appear unused; Gradle 8.14.5 and AppCompat 1.8.0 updates are available; generated `flatDir`/Gradle 9 deprecation and Capacitor Filesystem deprecation notices remain. Review rather than suppress them during the relevant dependency/icon pass.

## 7. Artifact inventory

| Artifact     | Package/role              |     Bytes | SHA-256                                                            | Signing/status                           |
| ------------ | ------------------------- | --------: | ------------------------------------------------------------------ | ---------------------------------------- |
| Debug APK    | `dev.yash.tools.debug`    | 4,871,624 | `8222ec12a5fdc8d2930b859cce1317e3ffb7543c1cb10466e132b0edb2a112a1` | Local debug key; APK v2 verified         |
| Internal APK | `dev.yash.tools.internal` | 4,872,212 | `fd7d9243f88e5e4fcb35fbbbfab2f8e7c3006b94bc4c552a0657dee72f9873a5` | Local debug key; APK v2 verified         |
| Release AAB  | `dev.yash.tools`          | 2,113,313 | `0f5fd65d7bbcc507120489ae48162fbace47f2274202fb40c7dc7ab148ffd360` | Build proof only; intentionally unsigned |

These are reproducibility evidence, not publication candidates. Rebuild after any source/config change and never distribute a debug-key artifact as production.

## 8. Active risks, blockers, and assumptions

| ID    | Type       | Severity | Item                                                                                                   | Safe next action                                                                                                    |
| ----- | ---------- | -------: | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| D-001 | Decision   |     High | `Yash Tools`, `dev.yash.tools`, and `app.yash.tools` are provisional                                   | Approve/change before Play application creation                                                                     |
| B-001 | Blocker    |     High | No physical Android device evidence yet                                                                | Build APK, connect/authorize device, execute checklist                                                              |
| B-002 | Blocker    |     High | No Play account/signing identity supplied                                                              | User completes account/identity and key-custody decision later; do not request passwords                            |
| B-003 | Blocker    |   Medium | GitHub branch protection/rulesets are unavailable for this private repository on the current plan      | Keep the repository private; upgrade the account plan, then enforce PRs/checks/no-force-push via issue #129         |
| R-001 | Risk       |     High | A future Android plugin update may add permissions/components                                          | Keep the merged-manifest CI check mandatory and review every allowlist change                                       |
| R-002 | Risk       |     High | Renderer termination could lose current nonsensitive work or loop                                      | Implement host recovery/native safe mode before beta                                                                |
| R-003 | Risk       |   Medium | SAF selection returns metadata/URI; file-consuming tools still need bounded/streamed reads             | Add a separate reviewed content-URI read/stream method with the first file-consuming tool                           |
| R-004 | Risk       |   Medium | Current Capacitor Clipboard cannot express Android sensitive metadata                                  | Add reviewed narrow native method before secret-copy tools                                                          |
| R-005 | Risk       |   Medium | Share and Save As caches lack orphan cleanup after process death or failed immediate deletion          | Implement bounded generated-file retention through issue #15 before QR/export tools                                 |
| R-006 | Risk       |   Medium | `INTERNET` exists before network tools are enabled due to planned app scope/plugins                    | Keep disclosed; verify no runtime requests from offline tools                                                       |
| R-007 | Risk       |     High | The all-87 first-release scope creates a long critical path and concentrates tool-specific policy risk | Use the 12-tool milestone and controlled migration batches; any smaller production scope requires a superseding ADR |
| A-001 | Assumption |   Medium | API 24 remains product minimum                                                                         | Revalidate against audience/device distribution before beta                                                         |
| A-002 | Assumption |   Medium | Strict local-only backup policy is preferred                                                           | User approves before durable Notes/Bookmarks release                                                                |
| A-003 | Assumption |      Low | Initial public app is free, no ads/account/analytics                                                   | Any change requires ADR/privacy/Play review                                                                         |

## 9. Next executable queue

1. Review and merge work-management PR #130, now retargeted directly to `main` with both hosted checks passing.
2. Configure the recommended saved Project views in GitHub's UI; upgrade the account plan before completing protected-main issue #129.
3. Implement sensitive clipboard metadata and deterministic generated-file cache cleanup/retention for Share and Save As.
4. Implement WebView renderer-termination handling and a native safe-mode/recovery surface.
5. Add process-recreation, permission, picker, Save As, share, and notification instrumentation/UI Automator coverage.
6. Connect/authorize a physical Android device (or approved emulator), install the debug APK, and execute the physical checklist.
7. Add a bounded or streamed `content://` read path alongside the first file-consuming tool that needs it.
8. Begin Markdown Preview only after the preceding device-level foundation gates remain green.
9. Complete and Android-validate all 12 tools in the architecture milestone.
10. Migrate the remaining 75 audited tools in controlled, risk-ordered batches until all 87 pass their Definition of Done.
11. Replace generated launcher/splash assets, including adaptive and monochrome icons, after final visual identity approval.
12. Approve or revise the provisional app name, application ID, bundled origin, and privacy posture before release work; public v1 tool count is resolved at 87 by ADR 0004.
13. Freeze release-signing/key-custody strategy without committing secrets.

## 10. Release-gate snapshot

### Architecture gate

- Status: **FOUNDATION PASS COMPLETE; FULL GATE IN PROGRESS**.
- Passed: stack, bundled/minified builds, typed registry, adapter boundary, three representative tools, browser QA, manifest budget, baseline security config.
- Missing: complete 12-tool internal slice, native renderer recovery, file-content streaming, and physical/Play-installed artifact evidence.

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
