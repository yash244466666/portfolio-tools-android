# ADR 0022: Version-1 Scope Expansion to 100 Tools

- Status: Accepted
- Date: 2026-09-08
- Owner: Yash Sikdar
- Supersedes: the 86-tool scope of ADR 0021 (which remains in force for the `youtube-downloader` exclusion; that tool stays excluded)
- Revisit when: a new tool cannot meet the Definition of Done, or a Play/legal/privacy gate fails for one of the additions.

## Context

All 86 in-scope tools of the audited catalog are implemented (batch 13). The product owner expanded the first-release target to 100 tools by selecting 14 new original tools (not upstream migrations) on 2026-09-08.

## Decision

The approved version-1 scope is **100 tools**: the 86 in-scope catalog tools plus these 14 new offline, permission-free, pure-logic tools:

1. `aspect-ratio-calculator` 2. `word-frequency-analyzer` 3. `text-binary-converter` (binary/octal/decimal) 4. `time-zone-converter` (offline via platform `Intl` data) 5. `date-difference-calculator` 6. `loan-emi-calculator` 7. `discount-tax-calculator` 8. `dice-roller` (RandomService-backed, never Math.random) 9. `bmi-calculator` 10. `color-contrast-checker` 11. `unit-price-comparer` 12. `fuel-trip-cost-calculator` 13. `reading-time-estimator` 14. `css-unit-converter`

All are offline, add no permission, no dependency, and no network provider. Implementation proceeds in risk-ordered batches under the standard Definition of Done; managed issues are created through the work-items manifest and the explicit provisioning run.

## Alternatives considered

- TOTP Generator and JSON→TypeScript Generator were proposed and not selected for version 1; they remain candidates for version 1.1.
- Any networked or permission-bearing tool: rejected under sections 4/14/15.

## Consequences

- Certification gates (#21–#26), the regression matrix, and store claims now target 100 tools.
- The estimate extends by roughly three tool batches; the release gates stay sequenced behind the device-evidence and release-decision issues.
- New tool IDs are persistent; the section-10 rules apply to them from creation.
