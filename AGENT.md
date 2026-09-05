# Repository Operating Guide for Coding Agents

> Last verified: 2026-09-05  
> Applies to: the complete `portfolio-tools-android` repository  
> Synchronization rule: `AGENT.md` and `CLAUDE.md` intentionally contain identical guidance. Any change to one must be copied to the other in the same change.  
> Project status: foundation implementation; not yet approved for public release.

## 1. Mission

This repository is a separate Android application derived from the client-side tools in Yash Sikdar's portfolio repository. It is not the portfolio site, a Trusted Web Activity, or a remote website wrapper.

The intended product is a fast, privacy-conscious collection of developer and everyday utilities that:

- Works offline for all tools classified as offline.
- Clearly labels the small number of tools that contact a network provider.
- Uses no account, advertising, analytics, cloud synchronization, or automatic crash upload in version 1.
- Ships application code and workers inside the signed Android artifact.
- Uses Android system facilities for files, sharing, notifications, lifecycle, and external links.
- Remains usable on phones, tablets, landscape, split-screen, foldable layouts, keyboards, and assistive technology.
- Publishes only tools that meet the repository's Definition of Done.
- Ships all 87 tools from the audited upstream catalog in the first public Google Play release; the 12-tool vertical slice is an internal milestone, not the public scope.

The source portfolio is an upstream reference, not a runtime dependency.

## 2. Current foundation status

Implemented now:

- React/Vite/TypeScript/Tailwind application.
- Capacitor Android project.
- Typed tool registry containing the initial 12-tool architecture milestone within the approved 87-tool public-release scope.
- Three enabled tools: Unit Converter, Timestamp Converter, and Hash Generator.
- Catalog search and category filters.
- Favorites and recent-tool persistence.
- System/light/dark theme preferences.
- Compact bottom navigation and expanded navigation rail.
- Offline/network status service.
- Web and Capacitor platform-service implementations.
- Versioned Android Storage Access Framework picker and Save As bridge.
- Debug, internal, and release Android variants.
- API 24 minimum and API 36 compile/target configuration.
- Cleartext-network rejection, backup exclusions, cache-only FileProvider paths, and release shrinking.
- Unit, shell, registry, and initial Playwright tests.

Not yet implemented:

- Remaining nine vertical-slice tools.
- Remaining 75 catalog tools after the vertical slice; 84 of the approved 87 are not yet implemented overall.
- Fully sensitive Android clipboard metadata through a custom native bridge.
- Deterministic share-cache cleanup and retention.
- Renderer-termination recovery host and native safe-mode screen.
- Final icons, splash assets, app name, application ID approval, App Links, and Play signing.
- Physical-device verification and Play-distributed artifact testing.

The detailed, authoritative status belongs in `IMPLEMENTATION_TRACKER.md`. Update it whenever a task changes state.

## 3. Sources of truth and precedence

When documents conflict, use this precedence:

1. Current source code and generated merged Android manifest.
2. Tests and signed/enabled tool manifest behavior.
3. `IMPLEMENTATION_TRACKER.md` for current completion status and active blockers.
4. Architecture Decision Records under `docs/decisions/`.
5. `ANDROID_APP_IMPLEMENTATION_PLAN.md` for the complete roadmap and policy reasoning.
6. `AGENT.md` and `CLAUDE.md` for repository-working conventions.
7. `README.md` for contributor onboarding.

The copied implementation plan is a reference baseline. Time-sensitive Capacitor, Android, Google Play, provider, policy, and dependency requirements must be revalidated before implementation or release decisions.

Important implementation files:

- `package.json` — exact dependency pins and commands.
- `capacitor.config.ts` — provisional app identity, bundled origin, Android Capacitor settings.
- `vite.config.ts` — aliases, build target, test configuration.
- `src/tools/registry.ts` — current runtime tool manifest.
- `src/tools/types.ts` — tool metadata contract.
- `src/platform/contracts.ts` — only interfaces tools may use for platform operations.
- `src/platform/services.ts` — runtime service selection.
- `src/platform/web/services.ts` — browser development/test adapters.
- `src/platform/capacitor/services.ts` — installed Android adapters.
- `src/app/App.tsx` — top-level route and application state.
- `src/styles.css` — design tokens, adaptive layout, safe-area behavior.
- `android/app/src/main/AndroidManifest.xml` — app components and baseline security attributes.
- `android/app/src/main/res/xml/` — file paths, network security, backup/extraction rules.

## 4. Non-negotiable architectural decisions

- Keep this repository separate from the portfolio repository.
- Use React 19 + TypeScript + Vite + Tailwind CSS 4 inside Capacitor 8.
- Bundle the web application locally. Never set the production app to load arbitrary or remotely hosted HTML.
- Preserve the production local origin once public user data exists; an origin change can orphan WebView storage.
- Use hash routes internally until a deliberately reviewed routing migration is made.
- Keep tools independent from Capacitor/plugin imports. Only `src/platform/**` and reviewed host integration may import native APIs.
- Prefer pure functions for algorithms. UI components orchestrate validation and presentation; adapters orchestrate platform effects.
- No dynamic executable-code download, live-update SDK, `eval`, or remote JavaScript.
- No broad storage, media, contacts, installed-package, location, phone, SMS, camera, accessibility-service, VPN, advertising ID, or exact-alarm permissions in version 1.
- Do not add analytics, advertising, accounts, cloud sync, purchases, or crash-upload SDKs without a new product/privacy/Play decision and Data Safety update.
- Never include YouTube downloading in a release without a separate legal, policy, terms, security, and product review.
- Do not claim Notes, Bookmarks, or preferences are encrypted at rest unless a real reviewed encryption design exists.
- Do not claim every tool works locally while Currency Converter or DNS Lookup is enabled. Use precise local/network labels.

## 5. Technology and version policy

The foundation currently pins:

- Node.js 24 through `.nvmrc` and `package.json` engines.
- pnpm 11.24.0 through `packageManager`.
- React/React DOM 19.2.8.
- Vite 8.2.2 and React plugin 6.1.1.
- TypeScript 6.0.3. Do not upgrade to TypeScript 7 until the ESLint TypeScript parser officially supports it.
- Tailwind CSS 4.3.3 using the Vite plugin.
- Capacitor core/android/CLI 8.5.1 and individually pinned official plugins.
- JDK 21 for Android builds.
- Minimum SDK 24, compile SDK 36, target SDK 36.

Exact pins are deliberate for reproducibility. Upgrade dependencies in a dedicated change with:

- Release notes reviewed.
- Peer dependencies clean.
- Lockfile diff reviewed.
- Permission, exported-component, host, backup, ProGuard/R8, and native-library impacts checked.
- Full web and Android validation.
- Tracker and provenance entries updated.

Do not copy either lockfile from the portfolio repository. This repository uses only `pnpm-lock.yaml`.

## 6. Repository map

```text
.
├── android/                         Generated/native Android project, tracked and reviewed
├── docs/
│   ├── decisions/                   Architecture Decision Records
│   ├── ARCHITECTURE.md              Runtime boundaries and dependency direction
│   ├── DESIGN_SYSTEM.md             Mobile visual/interaction rules
│   ├── PHYSICAL_DEVICE_CHECKLIST.md Device validation record
│   └── SOURCE_PROVENANCE.md         Upstream source commit and copied-code map
├── e2e/                             Playwright browser-harness tests
├── src/
│   ├── app/                         Shell, navigation, routes, catalog, settings
│   ├── components/ui/               Reusable accessible primitives
│   ├── platform/
│   │   ├── capacitor/               Android adapters
│   │   ├── shared/                  Platform-neutral adapter utilities
│   │   ├── web/                     Browser adapters
│   │   ├── contracts.ts             Service contracts
│   │   ├── errors.ts                Stable platform error model
│   │   └── services.ts              Adapter selection
│   ├── test/                        Shared test setup
│   ├── tools/                       Tool features and pure logic
│   ├── main.tsx                     Application entry
│   └── styles.css                   Tokens and responsive shell styles
├── AGENT.md                         This file
├── CLAUDE.md                        Synchronized copy of this file
├── ANDROID_APP_IMPLEMENTATION_PLAN.md Full audited roadmap
└── IMPLEMENTATION_TRACKER.md        Living progress and next-work ledger
```

Each tool should live under `src/tools/<tool-id>/` and normally contain:

```text
ToolName.tsx             UI orchestration
logic-or-data.ts         Pure implementation or static data
*.test.ts                Pure tests and standard vectors
*.test.tsx               Component/accessibility tests when useful
fixtures/                Small licensed/synthetic fixtures only when needed
```

## 7. Common commands

Run from the repository root:

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
pnpm check
pnpm cap:sync
pnpm android:manifest:check debug
pnpm android:debug
pnpm android:open
```

Android direct commands:

```bash
./android/gradlew -p android lintDebug
./android/gradlew -p android assembleDebug
./android/gradlew -p android assembleInternal
./android/gradlew -p android bundleRelease
adb devices
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Rules:

- `pnpm build` includes TypeScript compilation and must not skip errors.
- `pnpm check` is the ordinary web quality gate.
- Always run `pnpm build` before `pnpm cap:sync` so Android receives current assets.
- Run `pnpm android:manifest:check <debug|internal|release>` after the corresponding variant has produced its merged manifest.
- Test the APK/AAB-derived artifact, not only Vite preview.
- Do not start a persistent dev server unless needed for an active visual/browser check; stop it before handoff unless the user asks it to remain running.
- Never put signing material in commands whose output may be logged.

## 8. Application identity and build variants

Current identity is provisional:

- Display name: `Yash Tools`.
- Application ID: `dev.yash.tools`.
- Production bundled origin: `https://app.yash.tools`.

These must be approved before Play application creation. After public release, the application ID cannot be changed for that listing, and changing the WebView origin can break access to stored web-origin data.

Build variants:

- `debug` — application ID suffix `.debug`; local engineering.
- `internal` — application ID suffix `.internal`; internal/closed testing candidate behavior.
- `release` — production ID; minified and resource-shrunk; signing is intentionally not stored in the repository.

Do not hardcode production signing configuration. Read it from a secure, gitignored local/CI configuration only after key custody is decided.

## 9. Routing and navigation

Internal route contract:

- `#/` — catalog.
- `#/favorites` — device-local favorites.
- `#/settings` — settings, privacy summary, and build information.
- `#/tool/<tool-id>` — tool screen.

Navigation rules:

- Use normal anchor semantics for internal hash navigation.
- Validate all tool IDs through `getTool`.
- A planned/disabled/removed tool must show an explanatory state rather than import a missing component.
- Back from a tool returns through browser/Android history predictably.
- Route changes move keyboard/screen-reader focus to the destination heading.
- Compact windows use labeled bottom navigation with no more than five top-level items.
- Expanded windows use a labeled navigation rail/sidebar.
- Preserve catalog query/filter/scroll when a deliberate state-restoration implementation is added.
- Public App Links are not configured yet. Do not add an intent filter until the owned web URL, `assetlinks.json`, certificate fingerprint, and website fallback route are ready.

## 10. Tool registry contract

`src/tools/registry.ts` is the runtime manifest. Every entry declares:

- Stable kebab-case ID.
- User-visible label and honest description.
- Category and search tags.
- One consistent Lucide icon.
- Lifecycle status.
- Risk level.
- Network behavior.
- Persistence behavior.
- Lazy component only when implemented.

Lifecycle states:

```text
planned -> experimental -> enabled -> deprecated -> removed
```

Foundation uses `planned` and `enabled`. Never mark a tool `enabled` without:

- An implementation component.
- Pure correctness tests or another independent oracle.
- Mobile and accessibility verification.
- Error, empty, reset, cancellation, offline/network, and lifecycle behavior.
- Accurate file/data/permission metadata.
- Tracker evidence.

Tool IDs are persistent external identifiers. Do not reuse an old ID for a different function.

## 11. Platform-service boundary

Tools consume `usePlatform()` and interfaces in `src/platform/contracts.ts`. They must not import from `@capacitor/*`, call `localStorage`, create hidden download anchors, call `window.open`, or directly schedule browser notifications.

Current services:

- `ClipboardService` — explicit read and write; sensitive/timed-clear intent included in contract.
- `PreferenceStore` — JSON typed values behind a namespaced key store.
- `FileService` — pick, share, and Save As boundaries.
- `NotificationService` — contextual permission, best-effort schedule, deterministic cancellation.
- `NetworkService` — current status and subscription; connectivity is not proof of internet reachability.
- `ExternalBrowserService` — HTTPS-only external navigation.
- `RandomService` — secure bytes and UUID; never `Math.random` for secrets/IDs that require unpredictability.
- `LifecycleService` — active/inactive subscription.
- `HapticsService` — optional enhancement; failure must not block the action.

Adapter requirements:

- Return stable `PlatformError` codes and safe recovery messages.
- Validate on the native side when a custom plugin is introduced.
- Settle every call exactly once.
- Handle cancellation distinctly from failure.
- Never send large files across the JavaScript/native bridge as Base64 when a content URI or streaming path can be used.
- Close descriptors, streams, listeners, media tracks, Workers, and object URLs.
- Keep native APIs narrow: no arbitrary file paths, URLs, intents, or command execution.

Known foundation limitation: Android document picking and Save As deliberately throw typed unavailable errors until a Storage Access Framework plugin is implemented. Do not silently replace this with broad storage permission.

## 12. State, persistence, and privacy

State classes:

- Durable: Notes, Bookmarks, Favorites, Settings; versioned and migratable.
- Safe session: route, non-sensitive options, catalog state; restorable when compatible.
- Sensitive session: secrets, passwords, JWT/private inputs, selected file contents; never auto-persist.
- Active operation: conversion/hash/media/timer; persist only explicitly safe resumable metadata.
- Disposable: decoded buffers, object URLs, Workers, temporary files, caches.

Current preference namespace is `yash-tools:v1:`. Changes require migration design; never silently rename the namespace after users have durable data.

Privacy rules:

- Never log raw tool input, output, clipboard, filenames, paths, domains, URLs, notes, bookmarks, generated secrets, recordings, or parser exception text that can echo input.
- Clipboard reads occur only after explicit user action.
- Secret fields disable autocomplete/spellcheck where appropriate and clear on navigation.
- Android backup and device transfer are disabled/excluded in the foundation; manual Export/Import will be user-controlled.
- Uninstall and Android Clear storage remove app-private data.
- Cache is disposable and must not be presented as user-owned permanent storage.
- Clear All requires explicit confirmation and must state exactly which classes/counts will be removed once durable tools exist.

The settings screen currently clears only foundation preferences. Update its wording and tests whenever new durable data is introduced.

## 13. File and sharing rules

- Android imports start inside the app using system pickers.
- Use `content://` URIs. Never assume an imported document has a filesystem path.
- Do not request broad storage or `READ_MEDIA_*` for occasional file selection.
- Validate content, MIME metadata, extension, decoded dimensions/pages/duration, and size independently where appropriate.
- Preserve source files on every failure.
- Use atomic output generation and a safe sanitized display name.
- Share only files under the dedicated private cache `share/` directory exposed by the non-exported FileProvider.
- FileProvider path XML must never expose an external root, internal root, or `path="."` outside the narrow cache subtree.
- Grant temporary read-only URI access.
- Save As must use `ACTION_CREATE_DOCUMENT` or an equivalent reviewed Storage Access Framework bridge.
- Preview and saved/shared output must use the same final bytes.
- Delete temporary shared files after the documented retention window, allowing for receivers that read lazily.
- Every format records extension, MIME type, encoding, filename policy, output limit, and interoperability fixtures.

Initial limits are defined in the implementation plan. Do not increase them without device memory/storage evidence.

## 14. Network and external-content rules

Version 1 allowed providers are intended to be limited to:

- Frankfurter for currency rates.
- Cloudflare DNS-over-HTTPS for DNS queries.

Before enabling either tool:

- Prove CORS behavior from the packaged production local origin.
- Confirm current terms, privacy, rate limits, attribution, country availability, and response schema.
- Use HTTPS-only exact host allowlists, timeouts, `AbortController`, bounded responses, and schema validation.
- Show provider name, sent fields, freshness timestamp, cache expiry, and stale/offline state.
- Treat no-record, offline, timeout, provider failure, rate limit, malformed response, and cancellation distinctly.
- Do not ship API secrets in the app.

External links:

- Validate with `URL`.
- Normally allow only `https:`.
- Open outside the privileged WebView through `ExternalBrowserService`.
- Reject `javascript:`, `data:`, `file:`, `content:`, `intent:`, custom schemes, embedded credentials, and malformed URLs unless a separately reviewed use exists.

## 15. Android security configuration

Required baseline:

- `android:usesCleartextTraffic="false"`.
- A Network Security Configuration trusting normal system roots and permitting no cleartext base traffic.
- `android:allowBackup="false"` plus explicit legacy and Android 12+ exclusion rules.
- Only launcher Activity exported until verified App Links are deliberately added.
- FileProvider is not exported and exposes only `cache/share/`.
- Production WebView debugging disabled.
- Mixed content disabled.
- Release minification and resource shrinking enabled with tested keep rules.
- Only approved permissions in the merged release manifest.

Permission budget for the planned product:

- `INTERNET` for the two clearly labeled network tools.
- `POST_NOTIFICATIONS` only when the user enables timer alerts.
- `RECORD_AUDIO` only if Audio Recorder later passes its separate release gate.

CI must reject unexpected dangerous/special permissions and exported components. Always inspect the merged manifest because plugins can add entries.

The executable policy lives in `scripts/check-android-manifest.mjs`. Its allowlist includes reviewed plugin-implied `ACCESS_NETWORK_STATE`, `VIBRATE`, and `WAKE_LOCK`; package-scoped AndroidX dynamic-receiver protection; and the product permissions above. The app manifest explicitly removes Capacitor's exact-alarm permission, reboot receiver/permission, and AndroidX's exported profile tooling receiver. Expanding the allowlist requires an ADR, plan/tracker updates, and privacy/Play review.

Do not add:

- `MANAGE_EXTERNAL_STORAGE` or legacy external-storage permission.
- `READ_MEDIA_IMAGES`, `READ_MEDIA_VIDEO`, or contacts access.
- `QUERY_ALL_PACKAGES`, `AD_ID`, location, camera, phone, SMS, VPN, or accessibility service.
- `USE_EXACT_ALARM` in version 1.
- A generic inbound share target/open-with filter in version 1.

## 16. UI and design system

The UI is an accessible, restrained Android utility shell influenced by Material 3 but implemented through semantic web content inside Capacitor.

Design rules:

- Use semantic CSS tokens in `src/styles.css`; do not scatter raw colors through tool components.
- Support paired light and dark themes plus system preference.
- Use system/local font stacks. Do not depend on Google Fonts or any runtime font network request.
- Use one icon family: Lucide React. No emoji as structural UI icons.
- Maintain a 4/8 dp spacing rhythm.
- Android touch targets are at least 48 × 48 dp with adequate separation.
- Body text is normally at least 16 CSS px; never disable zoom/text scaling.
- Normal text contrast must meet WCAG 2.2 AA (4.5:1); large text/non-text controls at least 3:1.
- Press feedback appears quickly without layout shift.
- Motion communicates state, stays around 150–300 ms, uses transform/opacity when possible, and respects reduced motion.
- Avoid decorative animation, glass effects that hurt readability, deep shadow stacks, or portfolio-style cinematic scrolling.
- Compact layout uses one readable column; medium/expanded layouts may use grids/split views when the tool benefits.
- Respect status/navigation bars, display cutouts, IME, gesture areas, landscape, split-screen, and fold posture.
- Never hide content under fixed bottom navigation.

Every screen implements applicable initial, empty, editing, invalid, loading, success, cancelled, offline/stale, permission-denied, unsupported, over-limit, no-space, interrupted, and recovery states.

## 17. Accessibility requirements

- Use native semantic elements before ARIA.
- Every input has a visible associated label; placeholders are examples, not labels.
- Errors appear near the control, explain recovery, and use an appropriate live region/alert.
- Route changes focus the destination heading without trapping focus.
- Visible focus indicators remain in both themes.
- Logical DOM order matches visual/focus order.
- Icon-only controls have a precise accessible name.
- Current navigation uses `aria-current`; toggles use `aria-pressed` or the appropriate state.
- Status cannot rely on color, icon, sound, vibration, or motion alone.
- Important feedback cannot live only in an auto-dismiss toast.
- Charts/Canvas require a text/table equivalent.
- Code editors require an accessible plain-text fallback or a documented, tested limitation.
- Test keyboard, TalkBack, Switch Access, magnification, 200% text, reduced motion, color correction, portrait/landscape, and narrow/expanded windows.

Automated accessibility tools help but do not replace manual TalkBack testing.

## 18. Tool migration workflow

For every tool:

1. Locate the portfolio source component, logic/data files, dependencies, and source commit.
2. Record it in `docs/SOURCE_PROVENANCE.md`.
3. Capture golden fixtures before behavior changes.
4. Identify the governing standard/reference and independent oracle.
5. Classify data, network, permission, persistence, file, clipboard, lifecycle, and security behavior.
6. Extract/rewrite pure logic under the tool directory.
7. Add unit/property/fuzz fixtures for boundaries and known failure cases.
8. Implement mobile UI using shared primitives and platform contracts.
9. Add empty/error/loading/cancel/reset/recovery behavior.
10. Verify compact, landscape, expanded, light/dark, large text, keyboard, and TalkBack.
11. Verify offline/network behavior and inspect runtime requests.
12. Verify build chunk size and memory/time limits.
13. Update Help/privacy/store claims and the tracker.
14. Mark `enabled` only after all gates pass.

Do not copy an existing bug merely to preserve parity. When the governing standard disagrees with the portfolio implementation, fix the implementation, retain a regression test, and open a linked upstream issue when appropriate.

## 19. Tool-specific safety reminders

- Hash: label MD5/SHA-1 as legacy where present; never market them as collision-secure.
- JWT: decode is not verification. Never imply signature or trust validation without a real key/algorithm process.
- Regex: execute hostile user patterns in a terminable Worker with input/time budgets.
- Markdown/SVG: sanitize with a narrow reviewed policy; CSP is defense in depth, not the sanitizer.
- CSV: handle quoted records correctly and address spreadsheet formula injection on export.
- JSON/YAML/XML: bound size/depth/aliases/entity behavior and run hostile corpus cases.
- PDF: enforce byte/page/decoded-memory limits, detect encryption, use bundled workers, and avoid simultaneous redundant representations.
- Image: enforce decoded pixel limits, normalize EXIF orientation, and disclose metadata stripping.
- File hashing: stream natively or enforce the documented JavaScript limit; never read unbounded files into one ArrayBuffer.
- Timers: reconstruct from timestamps, distinguish monotonic/wall time, and never promise exact alarm delivery.
- Audio/video: require physical-device, codec/container, interruption, background, memory, and output-format review before enabling.
- Currency/DNS: display provider and freshness; ordinary connection metadata goes to the provider.

## 20. Testing policy

Layers:

- Vitest for pure logic, standard vectors, registry invariants, migrations, and adapter contracts.
- React Testing Library for semantic component behavior and accessibility states.
- Playwright for the browser harness, routing, responsive layouts, theme, overflow, and visual checks.
- JUnit/Robolectric for custom native plugin logic.
- Espresso/Espresso-Web for Activity/WebView integration.
- UI Automator for system pickers, permission dialogs, settings, notifications, and share sheets.
- Gradle Managed Devices for repeatable API smoke tests.
- Physical devices for WebView, files, IME, memory/GPU, notifications, microphone/media, OEM battery behavior, and Play installation.

Required correctness principles:

- Security, encoding, date, and format tools need independent standard vectors, not only portfolio parity.
- Freeze time, locale, time zone, network, and randomness where deterministic tests require it.
- Use synthetic fixtures only. Never add real credentials, personal documents, contacts, calendars, recordings, tokens, notes, domains, or customer data.
- A fuzz failure becomes a permanent minimized regression fixture.
- Quarantined flaky tests do not count as a release pass.
- Source tests do not replace signed-artifact tests.

Before marking a foundation change complete, run:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm cap:sync
./android/gradlew -p android lintDebug assembleDebug
```

Run Playwright when shell/routing/layout behavior changes.

## 21. Performance budgets

Current initial targets from the implementation plan:

- App opens to a usable catalog without loading heavy tool libraries.
- Tool implementation chunks remain lazy.
- Immediate touch feedback within 100 ms.
- No long task above 100 ms during ordinary text input.
- No unresponsive frame above 700 ms in supported normal flows.
- Continuous UI work targets 60 fps where hardware allows.
- Heavy parsing/rendering/encoding moves to a Worker or native background thread.
- Memory returns near baseline after leaving a heavy tool.
- Cancel expensive work when navigating away.

Measure on a physical mid-range device. Desktop browser speed is not evidence for Android WebView memory or responsiveness.

## 22. Documentation and tracker discipline

`IMPLEMENTATION_TRACKER.md` is mandatory operational state. After each work session:

- Update `Last updated` date/time.
- Mark completed checklist items only when evidence exists.
- Record commands/tests actually run and their results.
- Add new blockers, risks, assumptions, and decisions.
- Move the next executable tasks to the top of the queue.
- Record source/tool migration progress and release-manifest state.
- Never erase useful history merely to make progress look clean.

Architecture decisions that are difficult to reverse belong in `docs/decisions/` and include status, context, decision, alternatives, consequences, owner, date, and revisit trigger.

When copied plan content changes in the upstream portfolio repository, compare checksums and deliberately reconcile; do not silently overwrite repository-specific progress.

## 23. Source provenance and cross-repository changes

Original portfolio:

- Expected local path: `/home/yash/Desktop/yash/portfolio-v2`.
- The exact analyzed commit is stored in `docs/SOURCE_PROVENANCE.md`.

Rules:

- Record original path and commit for copied logic/data/assets.
- Do not import code at runtime across repository boundaries.
- Do not use a Git submodule for version 1.
- Maintain Android-specific fixes here.
- If a correctness/security fix applies upstream, create linked work and port the test.
- Never bulk recopy over adapter, accessibility, or mobile-specific changes.
- Review licenses/attribution for every copied asset, dependency, and dataset.

## 24. CI, release, and secrets

Pull requests run typecheck, lint, unit/component tests, production web build, phone/tablet browser E2E, Android lint, debug assembly, and the merged-manifest permission/export check. Future gates add SBOM, license notice validation, dependency/secret scan, bundle budgets, emulator tests, backup-rule verification, 16 KB native-library checks, and artifact installation.

Secrets:

- Never commit keystores, passwords, `.env` secrets, Play service-account JSON, private API keys, or recovery codes.
- Do not print secret values into logs.
- Pull-request CI must not receive production signing credentials.
- Upload key and recovery instructions belong in independently backed-up secure storage.
- Play App Signing enrollment and ownership require explicit user approval.

Release distinctions:

- Initial production publication cannot use a percentage staged rollout; de-risk through test tracks, limited countries, managed publishing, and staffed monitoring.
- Later updates use staged percentages and explicit halt criteria.
- Halting does not repair devices that already installed a bad build; ship a higher-version-code forward fix.
- Unpublishing stops new discovery but does not disable existing installations.

## 25. Git and change safety

- Preserve user changes and unrelated work.
- Do not use destructive Git operations such as `git reset --hard` or blind checkout/revert.
- Do not commit unless the user requests a commit.
- Keep generated Android project changes reviewable.
- Do not edit generated `dist/` or `android/app/src/main/assets/public/` by hand; rebuild/sync them.
- Do not hand-edit the lockfile; change `package.json` and run pnpm.
- Use small coherent changes and verify after each risky boundary.
- Avoid large mechanical rewrites of migrated tools unless tests already capture behavior.
- Do not delete durable data/migrations or broaden file paths/permissions to make a test pass.

## 26. Definition of Done for one tool

A tool is enabled only when all applicable items pass:

- Stable registry metadata and lazy component.
- Source provenance and license recorded.
- Independent correctness vectors, boundary tests, and invalid-input tests.
- No direct native/browser-sensitive API use outside platform services.
- Honest offline/network/privacy/accuracy wording.
- Visible labels, semantic controls, focus order, live feedback, and TalkBack verification.
- 48 dp targets, compact/landscape/expanded layout, light/dark, and 200% text.
- Initial, empty, invalid, loading, success, cancelled, reset, over-limit, and recovery states.
- File/MIME/encoding/size rules where relevant.
- Lifecycle/process recreation behavior and cleanup.
- Performance/memory budget and cancellation.
- Web, Android, and artifact tests appropriate to the tool.
- Help/privacy/store claims updated.
- Tracker evidence and enabled-manifest review.

Compiling is not completion. Browser-only success is not Android completion. Visual appearance is not correctness.

## 27. Immediate implementation order

Unless the tracker or user changes priority:

1. Land the verified Android document picker/Save As branch through review.
2. Implement sensitive clipboard metadata and deterministic share-cache cleanup.
3. Add renderer termination, process recovery, and native safe-mode behavior.
4. Add instrumentation coverage and execute the physical-device foundation checklist.
5. Add bounded or streamed `content://` reads with the first file-consuming tool.
6. Port Markdown Preview with sanitizer/CSP tests.
7. Port Regex Tester into a terminable Worker.
8. Port QR Generator and real Android file sharing.
9. Port JSON Editor with compact/expanded and accessible fallback behavior.
10. Port Notes with schema migration, export/import, and honest unencrypted-storage copy.
11. Port Pomodoro with best-effort notifications and process reconstruction.
12. Port Image Compressor and File Hash Checker with strict limits.
13. Prove packaged-origin CORS and port Currency Converter.
14. Validate the complete 12-tool architecture milestone on Android.
15. Migrate the remaining 75 audited catalog tools in controlled, risk-ordered batches.
16. Submit no production candidate until all 87 tools pass the Definition of Done and the release manifest, store claims, and signed artifact agree.

## 28. Handoff checklist

Before ending work:

- Stop dev/preview/Gradle processes unless explicitly requested to remain.
- Run validation proportional to changes.
- Update `IMPLEMENTATION_TRACKER.md` with evidence and next tasks.
- Keep `AGENT.md` and `CLAUDE.md` identical.
- Note any generated Android, dependency, permission, or lockfile changes.
- Report exact paths to important artifacts.
- Distinguish implemented, tested, generated, provisional, deferred, and blocked work.
- Never claim physical-device or Play verification unless it actually occurred.

## 29. Critical warnings

- The current app name, package ID, origin, and publisher details are provisional.
- The three enabled tools are a foundation, not the public release scope.
- Android file picking/Save As and renderer-safe recovery remain incomplete.
- Sensitive clipboard flags require native work beyond the current general Capacitor clipboard call.
- Final icons/splash/store assets are placeholders.
- No release keystore or Play credentials exist in this repository.
- Do not publish the current artifact.

Read `IMPLEMENTATION_TRACKER.md` before choosing the next task and `ANDROID_APP_IMPLEMENTATION_PLAN.md` before making a cross-cutting architectural, security, privacy, or Play decision.
