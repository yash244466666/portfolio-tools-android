# ADR 0007: WebView Renderer-Termination Recovery and Native Safe Mode

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: a future tool needs mid-recovery state preservation beyond durable preferences, Capacitor changes its renderer-gone contract, or real-world crash telemetry (if ever approved) changes the required recovery UX.

## Context

Android may kill the WebView renderer process independently of the app. When that happens the web content is dead, Capacitor's default `onRenderProcessGone` handler does nothing (it returns false), and an unhandled termination can end as a blank screen or an OS crash report. The repository plan requires renderer-termination detection, a recovery path that cannot crash-loop, and a native safe-mode surface that does not depend on JavaScript still running.

## Decision

Register an app-owned `WebViewListener` on the Capacitor bridge after it initializes. The listener implements `onRenderProcessGone` and always returns true so Capacitor knows the app owns recovery and the process stays alive.

Recovery follows a pure, process-scoped policy that is unit-tested without a device:

- At most one automatic Activity recreation is allowed per 60-second window. The crashed WebView is never touched (its renderer is gone); `Activity.recreate()` rebuilds the Activity with a fresh bridge and WebView, which is the documented safe recovery shape.
- Once the automatic budget is spent, the app shows a native safe-mode screen instead of recreating again: a full-screen, theme-aware overlay (title, explanation, and a Reload app button at least 48 dp tall) built over the dead WebView. The overlay is idempotent, its text lives in string resources, and it explicitly announces its title for assistive technology.
- Manual reload from safe mode always recreates the Activity regardless of the policy budget; only automatic recovery is rate-limited.
- The policy state survives Activity recreation because it is process-scoped, so repeated renderer deaths inside one process quickly settle into user-controlled safe mode instead of a loop.

Nothing about the crash, the URL, or the web content is logged, and no new permission, exported component, bridge operation, dependency, or ProGuard rule is added.

## Alternatives considered

- Replacing or reloading the crashed WebView directly: rejected because Capacitor's bridge holds internal references to its WebView, and writing a new client or reloading a dead renderer risks silent breakage of the official bridge contract.
- Automatic recreation on every renderer death: rejected because a deterministic crash would loop between blank web content and recreation with no user control.
- A JS-side recovery screen: rejected because renderer death takes the JS context with it; recovery must not depend on JavaScript.
- Persisting the crash budget across process death: rejected because it would leave a user stuck in safe mode after unrelated processes died; per-process state bounds the worst case to one automatic recovery per process lifetime window.

## Consequences

- Nonsensitive in-progress tool state (sensitive session class) is lost when the renderer dies; durable preferences, favorites, and settings survive because they are device-local and backup-excluded app-private data.
- Renderer-gone behavior in the installed artifact (overlay correctness, recreation loop bounds, TalkBack behavior) still requires instrumentation/UI Automator and physical-device evidence, tracked by issues #17 and #18.
- If the crash itself kills the app process, the next process starts fresh with a fresh budget; the worst case is one automatic recovery per process.
