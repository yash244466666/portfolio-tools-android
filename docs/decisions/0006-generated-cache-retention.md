# ADR 0006: Generated-File Cache Retention and Cleanup

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: an enabled tool needs different retention windows, generated output above the existing Save As/Share limits, persistent cross-launch operation tracking, or a provider-contract obligation to keep share files longer.

## Context

Two generated-file subtrees exist inside the app-private cache: `cache/share/` files staged for the Android share sheet and exposed through the FileProvider, and `cache/save/<operation-id>/` handoffs staged for `ACTION_CREATE_DOCUMENT` Save As. Save As already deletes its handoff when an operation settles, and Share never deletes its output, so abandoned files survive process death, failed immediate cleanup, and repeated sharing under new names. Unbounded growth of app-private cache is a storage hazard, and the plan requires deleting generated output after a documented retention window while allowing for share targets that read lazily.

## Decision

Add the app-owned, version-1 `GeneratedCache` Capacitor plugin with a single `cleanup` operation, plus a pure `GeneratedCachePolicy` that makes every deletion decision. The janitor cleans exactly two subtrees and nothing else:

- `cache/share/` regular files older than 6 hours are deleted. The window allows share targets and the system share sheet to read the file after the share call returns.
- `cache/save/<operation-id>/` directories older than 1 hour are deleted when their name is a valid operation-owned identifier. Save As still removes its handoff immediately on success, cancellation, or failure; retention covers orphans from process death and failed immediate deletion only.
- Files with an unreadable modification time are protected because their age is unknown and a lazily reading provider must not lose bytes mid-read.
- The handoff of an active in-flight Save As operation is protected through a process-local registry shared with the document plugin; low storage never overrides that protection.
- When free storage is below 64 MiB, age is ignored: every ownership-valid generated file becomes eligible because retention must not outgrow the device.
- Each pass deletes at most 200 share files and 50 save operations, oldest-first with a deterministic (modification time, name) order, so a pass is bounded in time and later passes resume where the last stopped.

The pass runs when the bridge loads, so orphans are recovered on every process start even before JavaScript executes, and Android share/Save As adapters request additional passes opportunistically before each generated-file operation. The pass is single-flight; concurrent requests reject with a typed `CACHE_CLEANUP_IN_PROGRESS` code that adapters swallow. Deletion targets are validated by canonical path containment inside the exact subtree, any listed name escaping its subtree is ignored, and the pass never enumerates or deletes any other cache or user data. It logs nothing about file names or contents and adds no permission, exported component, dependency, or ProGuard rule.

## Alternatives considered

- Deleting the share file immediately after `Share.share()` resolves: rejected because system share targets may read the file lazily; a documented retention window is the plan's required behavior.
- JavaScript-only cleanup through the Filesystem API: rejected because it cannot run before the WebView/JS starts, offers weaker path containment, and would need untestable glue for canonical-path validation.
- Retaining files until the user clears storage: rejected because generated outputs are disposable cache, not user data, and unbounded growth is a real storage hazard.
- Deleting files with unknown modification times: rejected because an unreadable timestamp means age is unknown; protection is the safe failure mode except under low storage, where retention must yield.

## Consequences

- Share and Save As cache can no longer grow without bound across sessions; worst-case residue is bounded by the retention windows, the per-pass caps, and low-space behavior.
- Cleanup is never user-visible: it never blocks a share or save, never reports failures to tools, and never touches unrelated cache content such as Capacitor or WebView caches.
- Single-pass timing on a physical device with many orphans remains to be measured during instrumentation/device evidence; the deterministic caps keep worst-case work bounded.
- Share-interop evidence (issue #26) and physical-device validation must still observe the retention behavior in the installed artifact.
