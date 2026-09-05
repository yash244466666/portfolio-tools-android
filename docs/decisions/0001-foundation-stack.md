# ADR 0001: React/Vite/Capacitor Android Foundation

- Status: Accepted
- Date: 2026-09-05
- Owner: Yash Sikdar
- Revisit when: Capacitor cannot meet a required verified platform behavior or product scope expands beyond Android/web reuse.

## Context

The portfolio already contains 87 predominantly client-side React tools. A separate Android application should reuse pure algorithms and much component logic while replacing portfolio navigation and browser-only platform behavior.

## Decision

Use React 19, strict TypeScript, Vite, Tailwind CSS 4, and Capacitor 8 with a tracked native Android project. Bundle all web assets inside the signed application. Introduce typed web/Capacitor platform-service contracts before migrating platform-sensitive tools.

## Alternatives considered

- Full portfolio WebView: rejected because it ships irrelevant portfolio UI and preserves poor mobile/platform boundaries.
- Trusted Web Activity: rejected because offline/native/file behavior and Play product independence are weaker.
- React Native rewrite: rejected for version 1 due to reduced direct component reuse and large rewrite cost.
- Kotlin/Jetpack Compose rewrite: rejected for version 1 due to the highest implementation cost and lowest source reuse.

## Consequences

- Pure and React tool logic can be migrated incrementally.
- Native behavior must be deliberately adapted and tested across the bridge.
- Android System WebView remains a compatibility/performance boundary.
- The repository must protect its bundled origin, CSP, adapters, manifest, and plugin surface.
