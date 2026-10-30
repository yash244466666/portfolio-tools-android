# ADR 0025: Version-1 Scope Expansion — Recipe Scaler, Date Calculator, Random Picker (30 → 33)

- Status: **Accepted** — approved by the product owner on 2026-10-30.
- Date: 2026-10-30
- Owner: Yash Sikdar (product owner; approved 2026-10-30)
- Supersedes: the **30-tool count** of [ADR 0023](0023-focused-version-one-scope.md). ADR 0023's rationale, its 70-tool `removed` disposition, and every retained tool's governing ADR remain in force.
- Does not affect: [ADR 0021](0021-version-one-scope-exclusion-youtube-downloader.md) (YouTube Downloader stays excluded), the architecture in ADRs 0001–0020, or any gate in the Definition of Done.
- Revisit when: the catalog loses focus again, a new tool fails a Play/legal/privacy gate, or the product owner chooses a further batch.

## Context

ADR 0023 cut version 1 from 100 to 30 tools to keep the catalog focused on tasks a person naturally performs while holding a phone. The 30 shipped tools cover money and math, time, everyday text, files and media, privacy, and sharing, but leave three common daily jobs without a direct tool:

- Resizing a recipe for a different number of servings.
- Adding or subtracting a span from a date (deadlines, trips, notice periods).
- Making a fair choice from a list, a coin, or a numeric range.

The product owner reviewed these gaps on 2026-10-30 and approved adding exactly three tools. This is a deliberate, bounded expansion — not a return to the 100-tool toolbox.

## Decision

The approved public version-1 scope becomes **33 tools**:

| New tool            | ID                | Why it is phone-native                                                                                                              | Data / network / permissions   |
| ------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| **Recipe Scaler**   | `recipe-scaler`   | Scaling ingredients in a kitchen is a phone task; the arithmetic and fraction formatting are pure and offline.                      | Session-only; no network; none |
| **Date Calculator** | `date-calculator` | "What is 90 days from today?" is a daily phone question; exact civil-date arithmetic avoids timezone errors.                        | Session-only; no network; none |
| **Random Picker**   | `random-picker`   | Fair list picks, coin flips, and number draws are everyday social/utility actions; secure randomness is already a platform service. | Session-only; no network; none |

Grouping in the public catalog:

| Group                   | Before |  After |
| ----------------------- | -----: | -----: |
| Everyday money and math |     10 |     11 |
| Time                    |      6 |      7 |
| Everyday text           |      5 |      5 |
| Files and media         |      4 |      4 |
| Privacy and security    |      2 |      2 |
| Sharing and utility     |      3 |      4 |
| **Total**               | **30** | **33** |

The 70 tools cut by ADR 0023 stay at lifecycle `removed`; their source, logic, provenance, and tests remain in-tree. YouTube Downloader stays excluded by ADR 0021.

## Alternatives considered

- **Swap out the four borderline tools instead of growing the catalog.** ADR 0023 permits reversing `case-converter`, `color-picker`, `vcard-generator`, and `ical-generator` without a new ADR, but that is a separate product call. Keeping six categories and 33 tools preserves the accepted set while adding the three daily jobs; the owner can still exercise the borderline reversal later.
- **Add a larger batch (Bill Splitter, Work Hours, Photo Metadata Remover, Event Countdown).** Deferred. Each is plausible, but a three-tool batch keeps review and device effort bounded. They remain candidates for a future ADR.
- **Implement the Date Calculator as a mode in Date Difference.** Rejected for this batch: the owner asked for a distinct tool, and add/subtract has a different mental model from measuring a span.
- **Add cooking-unit density conversion (cups to grams).** Rejected for version 1: density depends on the ingredient and grind, and an unqualified conversion would be wrong. Quantities are scaled in the units the recipe uses.

## Consequences

1. **Registry** — three `enabled` entries with lazy components; the registry oracle in `registry.test.ts` grows from 30 to 33. The 70 `removed` entries are unchanged.
2. **Work-item manifest** — 34 managed tools (33 retained plus excluded YouTube Downloader); category counts become core 7, developer 6, text 5, media 1, security 1, math 14; the category epic titles and the launch epic's 33-tool text are derived/updated; tier-1 count rises by three. Live GitHub provisioning remains a separate, explicitly authorized `pnpm github:work-items:apply` run.
3. **Documentation and claims** — `CLAUDE.md`/`AGENT.md` (kept byte-identical), README, architecture, work-management, provenance, tracker, store claims, and certification dossiers move from 30 to 33. The new tools are session-only and add no permission, network provider, or durable-data class.
4. **Evidence** — E2E routing, the regression matrix, and the emulator checklist driver add the three tools; the checklist must show all 33 enabled cards and a per-tool interaction. No gate is weakened.
5. **Release** — the physical-device/OEM rows and product-owner launch decisions remain open. This ADR changes scope, not release readiness.

## Approval

Accepted by the product owner, **Yash Sikdar**, on **2026-10-30**, after selecting exactly these three tools for implementation. The owner may defer or remove any of them later through a further superseding ADR; no tool's Definition of Done is relaxed by this decision.
