## Outcome

<!-- Describe the user-visible or engineering outcome. -->

## Linked work item

Closes #

## Scope and risk

- Work type:
- Priority:
- Tool/category or platform area:
- Permission/export impact: none / explain
- Privacy/Data Safety impact: none / explain
- Dependency/license impact: none / explain
- ADR required or updated: no / link

## Validation evidence

- [ ] `pnpm format:check`
- [ ] `pnpm typecheck`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm test:e2e`
- [ ] `pnpm cap:sync`
- [ ] Android unit/instrumentation tests applicable to this change
- [ ] Android lint and required debug/internal/release artifacts
- [ ] Merged-manifest budgets for affected variants
- [ ] Physical-device evidence, or an explicit blocker recorded

Commands, results, artifact hashes, device/API/WebView, and evidence links:

## Definition of Done

- [ ] Architecture and platform-service boundaries are preserved.
- [ ] Input, output, time, memory, file, cancellation, and cleanup limits are enforced where applicable.
- [ ] Initial, empty, invalid, loading, success, cancelled, offline, denied, unsupported, over-limit, interrupted, and recovery states are covered where applicable.
- [ ] Phone, tablet, landscape, split-screen, keyboard/IME, 200% text, reduced motion, dark theme, and accessibility behavior are verified where applicable.
- [ ] No clipboard value, tool input, note, generated secret, file content, sensitive filename, credential, or real user data appears in logs or fixtures.
- [ ] Tracker, provenance, help/privacy/store claims, and ADRs are updated where applicable.
- [ ] Generated Android web assets were updated only through the Capacitor sync command.

## Reviewer notes

<!-- Identify the riskiest behavior and the fastest independent way to verify it. -->
