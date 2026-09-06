# ADR 0005: Sensitive Android Clipboard Bridge

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: an enabled tool needs clipboard image payloads, a different write-size budget, or a native timed-clear guarantee that survives Activity recreation.

## Context

The platform contract already lets tools request sensitive clipboard handling, but the official Capacitor Clipboard plugin cannot express Android's sensitive-clipboard metadata. On Android 13+, unmarked clipboard values are revealed by the system clipboard preview and can be read by other apps; secrets copied by future tools such as password generators must suppress that preview. The existing JavaScript timed-clear already protects newer clipboard contents against stale timers, and bridge logging is disabled in every variant, so values passing the bridge cannot enter Logcat.

## Decision

Add the app-owned, version-1 `SensitiveClipboard` Capacitor plugin with a single `write` operation that takes the bridge contract version, the value, and a `sensitive` flag. Native code validates the request again, writes an empty-labeled `ClipData` on the main thread, and, on Android 13 (API 33) and above, attaches `ClipDescription.EXTRA_IS_SENSITIVE` through `ClipDescription.setExtras(PersistableBundle)` when the request is sensitive. Older Android versions degrade to a normal write because no equivalent metadata exists.

The Android adapter routes every clipboard write through this bridge, so normal and sensitive copies share one tested code path. Clipboard reads remain on the official Clipboard plugin, and the timed-clear logic stays in the adapter, where it reads the current value first and clears only when it is still the value that was written.

Limits and protections:

- A clipboard write is at most 1 MiB of UTF-8 bytes; larger values are rejected with the typed `CLIPBOARD_INVALID_ARGUMENT` code before the native bridge is called. Native validation enforces the same bound again.
- Invalid requests reject with the typed `CLIPBOARD_INVALID_ARGUMENT` code; write failures reject with `CLIPBOARD_WRITE_FAILED`.
- The plugin performs no logging, no clipboard reads, and stores nothing beyond the system clipboard. It adds no permission, exported component, dependency, native library, or ProGuard rule.

## Alternatives considered

- Extending the official plugin's behavior from JavaScript: rejected because no Capacitor Clipboard API exposes the sensitive extra.
- Only routing sensitive writes through the custom bridge: rejected because two write paths with different semantics would exist and only one would carry native policy tests.
- Native timed-clear handling: rejected because it needs persistent scheduling to survive process death, and the adapter's read-compare clear already satisfies the current contract without background work.
- Larger or unlimited clipboard payloads: rejected because the system clipboard service is outside the app's control and unbounded writes are a memory hazard without a documented product need.

## Consequences

- Secret-classified tools can copy output that Android 13+ does not reveal in clipboard previews; on older versions the value is still copied, only unmarked.
- The web adapter cannot mark values as sensitive and deliberately ignores the flag; it enforces the same 1 MiB limit so the shared contract behaves identically.
- Clipboard behavior inside the installed artifact (sensitive extra present, preview suppression, timed clear) still requires physical-device evidence and is recorded in the instrumentation and device issues.
