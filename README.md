# Yash Tools for Android

An offline-first Android utility application derived from the client-side tools in Yash Sikdar's portfolio. The application uses React, TypeScript, Vite, Tailwind CSS, Capacitor, and a generated native Android project.

This repository is currently a foundation build, not a Play-ready release.

## Implemented foundation

- Adaptive catalog for phones and larger windows
- Search and category filtering
- Favorites and recent-tool persistence
- System, light, and dark themes
- Offline/network state awareness
- Typed web/Android platform-service boundary
- Unit Converter
- Timestamp Converter
- SHA Hash Generator
- Capacitor Android project targeting API 36 with minimum API 24
- Debug/internal/release variants
- Strict backup, cleartext-network, and FileProvider defaults
- Unit, component, registry, and browser-harness tests

The first public Google Play release is approved to include all 87 tools from the audited upstream catalog. The currently registered 12-tool vertical slice is the first architecture milestone, not a reduced release scope. Three tools are implemented today, and every public tool must pass the repository Definition of Done before it is enabled. The complete roadmap is in [ANDROID_APP_IMPLEMENTATION_PLAN.md](ANDROID_APP_IMPLEMENTATION_PLAN.md), while live status and next tasks are in [IMPLEMENTATION_TRACKER.md](IMPLEMENTATION_TRACKER.md).

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

## Important boundaries

- The production application uses bundled assets, not a remote website.
- Tools must use contracts under `src/platform/` for clipboard, files, sharing, preferences, notifications, network, browser, randomness, lifecycle, and haptics.
- No account, ads, analytics, cloud sync, or automatic crash upload exists in version 1.
- The app name, application ID, local origin, icons, splash, and Play identity are provisional.
- Never commit signing keys, passwords, Play credentials, private data, or real user fixtures.
- Do not publish the current foundation artifact.

Read [AGENT.md](AGENT.md) before making changes. It contains the complete repository operating rules.
