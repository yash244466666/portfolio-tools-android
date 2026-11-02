# Yash Tools for Android

An offline-first Android utility application derived from the client-side tools in Yash Sikdar's portfolio. The application uses React, TypeScript, Vite, Tailwind CSS, Capacitor, and a generated native Android project.

This repository is currently a foundation build, not a Play-ready release.

## Delivery branches and CI/CD

- `main` is the default **release** branch; `dev` is the **integration** branch. Feature work branches from `dev` and targets `dev`; releases promote `dev` to `main`.
- GitHub Actions runs the full web and Android gate on both branches using GitHub-hosted runners. Every run uploads the debug APK, internal APK, and unsigned release AAB as build artifacts; each branch push also publishes a debug APK pre-release for testers.
- A Pages workflow publishes the Vite web harness: `main` at the site root and `dev` under `/dev/`.
- Nothing deploys to Google Play. The release AAB is intentionally unsigned and no signing or Play credentials are stored in this repository.
- Preview: <https://yash244466666.github.io/portfolio-tools-android/> (and `/dev/`).

## Implemented foundation

- Adaptive catalog for phones and larger windows
- Search and category filtering
- Favorites and recent-tool persistence
- System, light, and dark themes
- Offline/network state awareness
- Typed web/Android platform-service boundary
- Thirty enabled tools (ADR 0023 scope), including the complete 12-tool architecture milestone; the registry keeps the other 70 implemented tools in-tree as `removed`
- Scoped Android document picker, content reads, Save As, sharing, sensitive clipboard, generated-cache cleanup, notifications, and renderer recovery
- Capacitor Android project targeting API 36 with minimum API 24
- Debug/internal/release variants
- Strict backup, cleartext-network, and FileProvider defaults
- Unit, component, registry, and browser-harness tests
- Native policy tests plus bundled-artifact Android instrumentation/UI Automator coverage

The first public Google Play release is approved to include 38 tools per ADR 0026, which adds five permission-free sensor tools to ADR 0025's 33-tool scope (ADR 0025 expanded ADR 0023's 30 tools, itself superseding the 100-tool clause of ADR 0022 and the all-87 clause of ADR 0004; ADR 0021 keeps YouTube Downloader excluded). All 38 are implemented and enabled, and all but Currency Converter work offline; Currency Converter's provider, Frankfurter, is the only network provider in the release. The 70 tools approved by ADR 0022 but cut from version 1 stay in the repository as `removed` registry entries with their source, pure logic, provenance, and tests intact, so reinstating one is a manifest edit rather than a re-implementation. The 12-tool vertical slice was the first architecture milestone, not the release scope, and every public tool must still pass the remaining device-evidence, certification, and release gates in [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md) before publication. The complete roadmap is in [ANDROID_APP_IMPLEMENTATION_PLAN.md](ANDROID_APP_IMPLEMENTATION_PLAN.md), live status and evidence are in [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md), and the executable issue/Project workflow is defined in [docs/WORK_MANAGEMENT.md](docs/WORK_MANAGEMENT.md).

## Requirements

- Node.js 24+
- pnpm 11.24+
- JDK 21
- Android SDK Platform 36
- Android SDK Build Tools
- ADB and an emulator or physical Android device for native verification

## Start development

```bash
pnpm install
pnpm dev
```

## Validate the web foundation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm build
```

Or run the combined gate:

```bash
pnpm check
```

## Build Android debug APK

```bash
pnpm android:debug
```

Expected artifact:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

The debug build also runs the reviewed merged-manifest permission/export check. To inspect another already-built variant:

```bash
pnpm android:manifest:check internal
pnpm android:manifest:check release
```

`pnpm android:bundle` proves that minification and resource shrinking compile, but the generated release AAB remains intentionally unsigned until release identity and key custody are approved.

Open the native project with:

```bash
pnpm android:open
```

With an authorized device or approved emulator connected, run the bundled Android instrumentation suite with:

```bash
pnpm android:test:connected
```

## Important boundaries

- The production application uses bundled assets, not a remote website.
- Tools must use contracts under `src/platform/` for clipboard, files, sharing, preferences, notifications, network, browser, randomness, lifecycle, and haptics.
- No account, ads, analytics, cloud sync, or automatic crash upload exists in version 1.
- The app name, application ID, local origin, icons, splash, and Play identity are provisional.
- Never commit signing keys, passwords, Play credentials, private data, or real user fixtures.
- Do not publish the current foundation artifact.

Read [AGENT.md](AGENT.md) before making changes. It contains the complete repository operating rules.
