# ADR 0010: Regex Tester Terminable-Worker Execution Policy

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: another tool needs hostile user code execution (it should follow this pattern), the Android WebView minimum stops supporting classic Workers, or the budgets prove wrong on physical devices.

## Context

Regex Tester evaluates user-provided regular expressions. The audited upstream implementation runs those patterns directly on the UI thread, and the implementation plan flags this as a defect: catastrophic backtracking (for example `(a+)+$` against a near-miss string) blocks the only thread, freezes the interface, and risks an ANR with no recovery short of process death. The repository rules require hostile patterns to run in a terminable Worker with input and time budgets.

## Decision

Enable the `regex-tester` tool with a three-layer execution design:

- **Pure engine** (`src/tools/regex-tester/regex.ts`): typed-result evaluation with explicit limits — 512-character pattern source, 128 KiB test-string UTF-8 budget, 1000-match collection cap, and a 750 ms soft budget checked between match iterations. Flags are restricted to a narrow allowlist (`d g i m s u v y`); everything else is rejected before compilation. All failures are typed values (`invalid`, `over-limit`, `timeout`, `cancelled`, `unsupported`), never thrown across a boundary. The engine is independently unit-tested and is the only code the Worker runs.
- **Worker** (`regex.worker.ts`): a lazily created classic (non-module) Web Worker that runs the engine, so the oldest packaged WebViews in the support range can load it and no module-worker capability is assumed. It is bundled offline; the CSP already allows `worker-src 'self' blob:`.
- **Terminable client** (`regex-client.ts`): a 3000 ms wall-clock deadline enforced on the UI thread. A single blocking `exec` call can outrun the engine's soft budget, so the deadline is the real backstop: on expiry the client terminates the whole Worker and replaces it on the next run, resolving the request as `timeout`. A new request while one is in flight, an explicit cancel, worker construction failure, and worker faults follow the same terminate-and-replace rule, so a hostile pattern can wedge exactly one run, never the tool. Responses are guarded by run id; stale responses are ignored, and after disposal no new work is accepted.
- **No main-thread fallback**: where Workers are unavailable the tool renders an explicit unsupported state rather than executing hostile patterns on the UI thread.
- The UI debounces runs at 250 ms, renders over-limit/invalid/timeout/empty states with recovery guidance, derives the highlighted preview from the same match list it displays, and renders at most 50 match rows.

No new dependency, permission, exported component, or platform contract is introduced; the Worker is a tool-owned implementation detail behind the tool boundary.

## Alternatives considered

- **Main-thread execution with limits only**: rejected; a single `exec` call can block indefinitely regardless of iteration-level checks.
- **A third-party safe-regex engine or native evaluation**: rejected for version 1; adds a dependency or a native bridge surface for a problem Worker termination already solves.
- **Module Worker (`type: "module"`)**: rejected because classic Workers have broader WebView support at API 24-era packaged WebView versions.
- **Per-run Worker creation**: rejected as wasteful for ordinary typing; the Worker is reused and replaced only when termination is actually required.

## Consequences

- Catastrophic patterns are proven to terminate: E2E runs a `(a+)+$` near-miss that would block for ~19 s and observes the tool recover in ~3.3 s.
- Worker spawn/termination adds small overhead on hostile input only; ordinary evaluation reuses one Worker.
- The match cap and 50-row display bound mean very-high-match-count inputs show a truncation note instead of unbounded rendering.
- Physical-device evidence (old-WebView classic-Worker behavior, WebView recovery, TalkBack) remains assigned to issues #17/#18; automated gates and both E2E device profiles pass.
- Other tools that accept hostile executable input (future parsers, formatters) should reuse this terminable-Worker pattern rather than inventing a new one.
