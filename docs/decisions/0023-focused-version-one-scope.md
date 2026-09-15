# ADR 0023: Focused Version-1 Scope (100 → 30 Tools)

- Status: **Accepted** — approved by the product owner and in force.
- Date: 2026-09-15
- Owner: Yash Sikdar (product owner; approved 2026-09-15)
- Supersedes: the **100-tool scope of ADR 0022** and the **all-87 clause of ADR 0004**
- Preserves: ADR 0021 in force — `youtube-downloader` stays excluded for the reasons recorded there (and is a member of the cut set below, so the exclusion becomes moot for version 1 rather than contested)
- Does not affect: ADRs 0001–0020, which govern architecture, platform contracts, host behaviour, and per-tool policy. Every retained tool keeps the ADR that governs it.
- Revisit when: the retained catalog cannot meet the Definition of Done, a retained tool fails a Play/legal/privacy gate, or the product owner re-expands scope through a further superseding ADR.

## Context

ADR 0004 (2026-09-05) approved all 87 audited catalog tools for the first public release. ADR 0021 excluded `youtube-downloader`, leaving 86. ADR 0022 (2026-09-08) added 14 new original tools, bringing the approved version-1 scope to **100 tools**. All 100 are implemented, enabled, and covered by the certification dossiers under `docs/certification/`.

On 2026-09-15 the product owner reviewed the catalog against its actual audience and raised the concern that a large share of it is not useful to a regular phone user. The observation in the product owner's words: _"development mostly happens on the computer not on phone."_

A triage of all 100 tools against a single criterion — **is this a task a person naturally performs while holding a phone, or does it need a keyboard, a large screen, and a development workflow?** — produced:

| Bucket                                         | Count | Share |
| ---------------------------------------------- | ----: | ----: |
| Phone-native: a regular user reaches for these |    26 |   26% |
| Borderline: defensible but weak alone          |    11 |   11% |
| Desktop-shaped: poor fit for a phone           |    63 |   63% |

### Why the desktop-shaped majority is a problem

1. **Store positioning.** A 100-tool catalogue competes in no category. Play discovery rewards relevance, and a broad undifferentiated tool list is a recognised low-quality signal for a privacy-positioned utility app.
2. **Per-tool cost is real and continuing.** The repository Definition of Done requires, for every enabled tool: source provenance, an independent correctness oracle, boundary and invalid-input tests, accessibility verification, applicable states, performance/cancellation proof, and tracker evidence. The remaining release work — device-matrix rows (#25), the per-tool regression matrix (#21), and interoperability certification (#26) — scales with enabled-tool count.
3. **Attack and review surface.** The heaviest security-sensitive parsers (YAML/XML/JSON hostile-input bounds, SVG sanitization, regex Worker execution, PDF pipeline) sit mostly in the tools a regular user will never open, yet each still requires Data Safety coverage and device verification.
4. **Timing.** The application has not shipped. Reducing scope now is a manifest and documentation change; reducing it after publication means removing tools that users installed for, rewriting the listing, and answering reviews.

### The counterargument, recorded honestly

- **Sunk work is not recovered by cutting.** All 100 tools are implemented and tested, and the automated certification portions are already written. The gain from cutting is positioning and focus, not reclaimed engineering time.
- **Long-tail Play search drives installs.** A user may install for a single job ("cron expression builder") and keep the app. Cutting 70 tools removes 70 long-tail entry points. This is a genuine cost and the strongest argument against this proposal.
- **The mitigation:** the cut tools' source, pure logic, and tests are retained in-tree (see Disposition), so a reversal is a manifest change rather than a re-implementation. That materially lowers the cost of being wrong.

## Decision

If accepted, the approved public version-1 scope becomes **30 tools**, all offline except `currency-converter`.

### Retained (30)

**Everyday money and math — 10**
`unit-converter` · `currency-converter` · `percentage-calculator` · `tip-calculator` · `discount-tax-calculator` · `unit-price-comparer` · `loan-emi-calculator` · `fuel-trip-cost-calculator` · `bmi-calculator` · `calculator`

**Time — 6**
`stopwatch` · `countdown-timer` · `pomodoro-timer` · `time-zone-converter` · `date-difference-calculator` · `age-calculator`

**Everyday text — 5**
`notes-scratchpad` · `character-counter` · `word-counter` · `case-converter` · `color-picker`

**Files and media — 4**
`qr-generator` · `image-compressor` · `pdf-converter` · `audio-recorder`

**Privacy and security — 2**
`password-generator` · `password-strength-checker`

**Sharing and utility — 3**
`vcard-generator` · `ical-generator` · `dice-roller`

Four of these are retained on a borderline call that the product owner may reverse without a new ADR: `case-converter`, `color-picker`, `vcard-generator`, `ical-generator`. Cutting all four leaves **26**, which is the leaner option and needs no further decision record.

### Cut (70)

**Developer — 44 of 49**
`markdown-preview` · `regex-tester` · `json-editor` · `dns-lookup` · `number-base-converter` · `base64-tool` · `url-encoder` · `csp-generator` · `cors-header-builder` · `robots-txt-generator` · `http-status-codes` · `mime-type-lookup` · `meta-tag-generator` · `unicode-lookup` · `ascii-table` · `box-shadow-generator` · `border-radius-generator` · `text-shadow-generator` · `triangle-generator` · `gradient-border-generator` · `hmac-generator` · `uuid-generator` · `hash-diff` · `cron-builder` · `lorem-ipsum-generator` · `jwt-decoder` · `csv-json` · `yaml-json-converter` · `css-gradient-generator` · `flexbox-playground` · `grid-generator` · `css-animation-generator` · `glassmorphism-generator` · `neumorphism-generator` · `xml-formatter` · `sql-formatter` · `svg-optimizer` · `open-graph-preview` · `fake-data-generator` · `color-palette-from-image` · `chart-generator` · `aspect-ratio-calculator` · `css-unit-converter` · `color-contrast-checker`

**Text — 17 of 22**
`reverse-text` · `text-to-slug` · `sort-lines` · `add-line-numbers` · `trim-whitespace` · `remove-duplicates` · `html-entity-encoder` · `rot13-cipher` · `morse-code-translator` · `find-replace` · `invisible-character-detector` · `text-diff` · `emoji-picker` · `bookmark-manager` · `word-frequency-analyzer` · `text-binary-converter` · `reading-time-estimator`

**Core — 7 of 25**
`timestamp-converter` · `hash-generator` · `gcd-lcm-calculator` · `roman-numeral-converter` · `data-sanitizer` · `bitwise-calculator` · `color-blindness-simulator`

**Files and media — 2 of 4**
`file-hash-checker` · `video-to-gif`

`youtube-downloader` is already excluded by ADR 0021 and is not counted in the 100. It stays excluded.

### Disposition of cut tools

Recommended: **retain in-tree, disable in the release manifest.**

- Each cut entry moves to lifecycle `removed` per section 10, with the reason recorded against it. The lifecycle state is not reused for a different function; every ID stays bound to its current meaning.
- The **lazy `component` is dropped** from each cut entry so no runtime chunk is emitted for it. This is what actually shrinks the shipped artifact — a retained `component` would keep emitting a chunk that simply never loads.
- The source directory, pure logic, and test files **stay in the repository**. Pure-logic suites continue to run in `pnpm test`; only component/E2E/artifact coverage is retired for those tools.
- The cut tools are removed from the release-scope counts in `docs/certification/`, the regression matrix gate, and the store claims. `pnpm regression:matrix` continues to fail the build if a **retained** tool lacks its oracle or artifact coverage.
- Full deletion is the alternative and is **not** recommended: it discards tested, provenance-recorded work for no release benefit, and makes any reversal a re-implementation rather than a manifest edit.

## Alternatives considered

- **Keep all 100 as approved by ADR 0022.** Rejected in this proposal on the positioning and per-tool-cost grounds above, while acknowledging that the long-tail install argument is a real counterweight. This is the status quo and requires no action if the proposal is declined.
- **Cut only the 49 Developer tools (→ ~51).** A softer, easier-to-defend cut that keeps the catalogue broad. Rejected as insufficient: it leaves roughly 20 desktop-shaped tools in the Text, Core, and Media categories, and leaves the store positioning problem largely intact.
- **Keep 12 (the original vertical slice).** Rejected: too thin to be a product, and it discards tools that are genuinely phone-native.
- **Ship 100 and prune post-launch using Play retention data.** Rejected: removing tools from a published app is user-visible and generates negative reviews; and this application has no analytics by design, so there is no retention signal to prune against (section 4 forbids adding one).
- **Keep everything, accept the positioning cost.** A legitimate choice. It is the default outcome if this ADR is not approved, and the tradeoff is recorded rather than hidden.

## Consequences

The following must change together. Acceptance on 2026-09-15 started this work: the registry change, the work-items manifest change, and the documentation change are implemented on branch `feat/213-focused-version-one-scope`. Live GitHub provisioning (item 4 below) is a separate, explicit run and is not part of that work.

1. **This ADR** moves to Accepted, and ADR 0022 gains a superseded note. ADR 0004 and ADR 0021 are not edited in place.
2. **`src/tools/registry.ts`** — 70 entries to `removed`, lazy components dropped. The registry remains the runtime manifest and the single source of truth for enabled count.
3. **`config/github-work-items.json`** — the `tools` list shrinks to the retained set plus the excluded `youtube-downloader`; the epic tier counts, `all87-release-candidate` task, and milestone names are rewritten to 30.
4. **Live GitHub** — the 70 corresponding tool issues close as _not planned_ with a link to this ADR; epics #4–#9 are re-scoped or closed; the "All-87 Closed Beta" milestone is renamed. Provisioning is an explicit, user-authorized `pnpm github:work-items:apply` run and must not happen from a build or CI.
5. **`CLAUDE.md` and `AGENT.md`** — sections 1, 2, 4, and 27 carry the 100-tool scope. They must be edited identically and re-verified byte-identical.
6. **`IMPLEMENTATION_TRACKER.md`** — the scope line, registry counts, dashboard, and queue; plus a work-log entry recording the decision.
7. **`README.md`, `docs/ARCHITECTURE.md`, `docs/WORK_MANAGEMENT.md`** — scope and count statements.
8. **`docs/certification/`** — the regression matrix, accessibility, performance, security/SBOM, and interoperability dossiers are scoped to the retained 30; the network-provider review narrows to Frankfurter alone (DNS Lookup is cut), which simplifies the CSP `connect-src` allowlist, the Data Safety declarations, and the provider review to a single provider.
9. **Release gates** — #21–#26 shrink to 30 tools, materially reducing device-matrix and interoperability effort. No gate is weakened; coverage requirements per retained tool are unchanged.
10. **Issues #27–#41** — the audience/identity decision (#27) is informed by this ADR; store copy, screenshots, and Data Safety declarations describe a focused utility app.

### What this deliberately does not do

- It does not weaken the Definition of Done for any retained tool.
- It does not touch architecture, platform contracts, permissions, or the Android host.
- It does not remove any code, test, or provenance record from the repository.
- It does not change the excluded status of `youtube-downloader`.

## Approval

Accepted by the product owner, **Yash Sikdar**, on **2026-09-15**. The Status line above records that acceptance, and the approved public version-1 scope is **30 tools**. The 100-tool clause of ADR 0022 and the all-87 clause of ADR 0004 no longer govern the release scope; ADR 0021 still governs the `youtube-downloader` exclusion, and no retained tool's Definition of Done is weakened.

### Implementation status

Landed on branch `feat/213-focused-version-one-scope`:

- **Registry** — `src/tools/registry.ts` carries the 30 retained entries at `status: "enabled"`, each with its lazy component, and the 70 cut entries at `status: "removed"` with no component. `src/tools/types.ts` declares the `removed` lifecycle state required by section 10. Every cut tool keeps its source directory, pure logic, provenance record, and tests; reinstating one is a manifest edit plus a superseding ADR, not a re-implementation.
- **Packaged CSP** — `index.html`'s `connect-src` allowlist names Frankfurter alone, because `dns-lookup` (the Cloudflare DoH consumer) is in the cut set.
- **Work-items manifest** — `config/github-work-items.json` carries the retained 30 plus the excluded `youtube-downloader` in `tools`, the 70 in `retiredTools`, the renamed "30-Tool Closed Beta" milestone, the renamed `regression-matrix` and `release-candidate` task keys (adopted through `renamedFrom`, never duplicated), and two tool-ID spellings corrected to the registry spelling.
- **Documentation** — the scope statements this ADR's Consequences list names (repository guides, README, architecture and work-management documents, and the certification dossiers) describe the 30-tool scope.

Still outstanding, and deliberately outside the branch:

- **Live GitHub provisioning** — closing the 70 cut tool issues as _not planned_, re-scoping or closing epics #4–#9, and renaming the milestone happen only in an explicit, user-authorized `pnpm github:work-items:apply` run. Provisioning must never run from a build or CI, and until it runs the remote planning state still reflects the pre-acceptance scope.
- **Release gates #21–#26** — the regression matrix, accessibility, performance, security/SBOM, interoperability, and device-evidence work now target the retained 30 and remain open; no gate is weakened.
