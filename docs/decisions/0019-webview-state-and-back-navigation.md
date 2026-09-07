# ADR 0019: WebView Session State and Android Back Navigation

- Status: Accepted
- Date: 2026-09-07
- Owner: Yash Sikdar
- Revisit when: the router stops using hash routes, a reviewed tool needs Android view-hierarchy restoration, or a future Capacitor version provides equivalent bundled-app Back handling.

## Context

Issue #17 instrumentation found two Android-host behaviors that the browser suites could not exercise:

1. Android view-hierarchy restoration and platform form services could repopulate WebView controls after Activity or process recreation even though tool inputs are session-only and are not stored through the platform `PreferenceStore`.
2. Capacitor's default WebView history handling did not navigate from a nested bundled hash route such as `#/tools/unit-converter` back to the catalog.

Allowing the first behavior would create an undeclared persistence path for tool input. Leaving the second behavior unchanged would make system Back appear broken on every tool route.

## Decision

- Disable Android view-state saving for the app WebView and its parent hierarchy. Disable the legacy WebView form store, mark the WebView subtree as excluded from Autofill and Content Capture on supported versions, clear app-scoped legacy form data at host creation, and cancel any Autofill context when the Activity stops. Durable values must be reconstructed only from an explicitly reviewed platform persistence contract; ordinary tool inputs start clean after Activity or process recreation.
- Install one Activity-scoped `OnBackPressedCallback` after Capacitor initializes the bridge. When the bundled document is on a non-root hash route, the callback replaces that route with `#/`. At the root route it disables itself for the current dispatch and delegates to Capacitor/system Back behavior.
- Keep this policy in `MainActivity`; tool components remain unaware of Android and continue to use only platform contracts.
- Do not log the current URL, form content, or JavaScript result.

## Alternatives considered

- **Keep Android's default WebView state/form services**: rejected because they can silently persist session-only input outside the reviewed preference contract.
- **Call `WebView.goBack()` unconditionally**: rejected because hash-route history is not represented reliably by Capacitor's native `canGoBack()` path, and root behavior must still delegate normally.
- **Add Android APIs directly to every tool**: rejected because it breaks the platform-contract boundary and duplicates navigation policy.
- **Reload the entire Activity for Back**: rejected because it is disruptive and would discard reviewed durable application state unnecessarily.

## Consequences

- Activity and process recreation restore reviewed durable preferences such as theme, while transient tool input is cleared and excluded from Android Autofill/Content Capture structures where the platform permits it.
- System Back from a tool returns to the catalog; root Back remains owned by Capacitor/Android.
- A recreated Activity can reopen at a clean tool route because the URL is application navigation state, but form contents are never restored by the Android view hierarchy.
- Instrumentation covers nested-route Back, Activity recreation, and true force-stop/new-process reconstruction. Physical-device and OEM WebView verification remains assigned to issue #18.
