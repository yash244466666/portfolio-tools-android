# ADR 0004: All 87 Tools in the First Public Release

- Status: Accepted
- Date: 2026-09-05
- Owner: Yash Sikdar
- Revisit when: a catalog tool cannot meet the Definition of Done or a Play, legal, provider, security, accessibility, or device-compatibility gate; any reduced scope requires explicit product-owner approval and a superseding ADR.

## Context

The audited upstream portfolio commit `61e54c64edbeffc9487239b6dae399e255c6a71d` defines 87 tools across six categories: 7 Core, 45 Developer, 17 Text, 3 Media, 5 Security, and 10 Math. The Android repository initially registered a representative 12-tool vertical slice to prove the reusable architecture. Earlier planning treated approximately 70 or more stable tools as a possible public version 1 target and left the exact enabled count unresolved.

On 2026-09-05, the product owner explicitly approved all 87 audited catalog tools as the required scope for the first Google Play production release.

## Decision

- The first public production release must contain all 87 audited catalog tools.
- The 12-tool vertical slice remains an internal architecture and integration milestone; it is not a reduced public-release scope.
- Every one of the 87 tools must be marked `enabled` in the reviewed release manifest and independently pass the repository Definition of Done before production submission.
- Internal and closed-test artifacts may contain partial or experimental subsets while development is in progress, but they must not be described as the final public release.
- New tools added to the upstream portfolio after the audited commit are not automatically added to version 1. They require a separate inventory and scope decision.
- A tool that cannot pass its technical, Play-policy, legal, provider, privacy, security, accessibility, or device gate blocks the 87-tool production release. It must not be silently removed or shipped in a broken/disabled state. Reducing the public scope requires explicit product-owner approval and a superseding ADR.

## Alternatives considered

- Launching the three currently completed tools: rejected as the public version 1 scope.
- Launching only the 12-tool vertical slice: rejected as the public version 1 scope; retained as the first architecture milestone.
- Launching approximately 70 stable tools and deferring difficult tools: rejected by the product owner for the first public release.
- Bulk-copying all portfolio components and treating compilation as completion: rejected because it bypasses mobile adaptation, platform contracts, policy review, tests, and per-tool release evidence.

## Consequences

- Three tools are currently implemented, so 84 tools still require production acceptance before release.
- The release schedule must cover all migration tiers, including file, media, persistence, timer, network, large-input, and policy-sensitive tools.
- Final closed-beta and production candidates must prove all 87 tools on the bundled Android artifact and the approved device matrix.
- Store copy, screenshots, help, privacy/Data Safety declarations, dependency notices, and the signed release manifest must match the same 87-tool candidate.
- The application cannot be described as Play-ready merely because the 12-tool milestone passes.
