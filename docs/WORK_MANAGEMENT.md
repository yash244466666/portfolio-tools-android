# GitHub Work Management

> Scope: development through the first Google Play production launch containing the 38 version-1 tools approved by ADR 0026, which adds five permission-free sensor tools to ADR 0025's 33-tool scope (ADR 0025 expanded ADR 0023's 30-tool scope) (ADR 0021 excludes YouTube Downloader from the audited catalog; ADR 0022's 100-tool clause is superseded).
>
> Product decisions: `docs/decisions/0004-all-87-tools-first-release-scope.md`, amended by `docs/decisions/0021-version-one-scope-exclusion-youtube-downloader.md`; the current scope is set by `docs/decisions/0023-focused-version-one-scope.md` (approved 2026-09-15), which supersedes the 100-tool scope of `docs/decisions/0022-version-one-scope-expansion-to-100.md` and the all-87 clause of ADR 0004.
>
> Provisioning source: `config/github-work-items.json` and `scripts/setup-github-work-management.ts`.

Live planning links:

- [Google Play v1 Project](https://github.com/users/yash244466666/projects/8)
- [Root launch epic](https://github.com/yash244466666/ruma-tools/issues/2)
- [Repository issues](https://github.com/yash244466666/ruma-tools/issues)
- [Work-management pull request #130](https://github.com/yash244466666/ruma-tools/pull/130)

## System of record

- GitHub Issues are the executable work items.
- GitHub sub-issues express the release/epic/tool hierarchy.
- GitHub issue dependencies express actual blocking relationships.
- Repository milestones express sequential delivery gates.
- The GitHub Project provides portfolio views and custom planning fields.
- Pull requests use `Closes #<issue>` and contain verification evidence.
- `IMPLEMENTATION_TRACKER.md` remains the evidence-oriented repository snapshot and must be reconciled after every substantial batch.
- ADRs remain authoritative for significant architecture, permission, privacy, storage, network, dependency, product-scope, and release decisions.

The provisioning script uses stable hidden markers in issue bodies. It is safe to rerun: managed titles, planning-body sections, managed labels, milestones, parent relationships, dependency edges, project membership, bootstrap pull-request links, and Project values are reconciled rather than duplicated. Checked acceptance items and content outside the managed body markers are preserved, as are labels not owned by the manifest. A renamed work item or milestone declares its previous key or title in `renamedFrom`, and a run adopts the existing issue/milestone carrying that marker or title instead of creating a duplicate. Record execution evidence in issue comments so planning-contract updates and evidence remain independently auditable. Closed issues and merged pull requests are mapped to Done on subsequent runs.

The initial 2026-09-05 provisioning created 128 marked issues: 10 epics, 31 foundation/quality/release tasks, and exactly 87 tool issues. It also created 29 labels, 6 milestones, 90 blocking relationships, and 7 custom Project fields. The ADR 0022 scope expansion (2026-09-08, PR #189) added 14 tool issues, bringing the manifest to 142 issues — 101 tool entries (100 in scope plus the excluded YouTube Downloader), 10 epics, and 31 tasks; GitHub additionally carries the ad-hoc bug issue #166, which is not part of the manifest. The Project contains those issues plus linked pull requests.

The ADR 0023 scope reduction (2026-09-15) is a manifest change, not a deletion. `config/github-work-items.json` now carries the 30 retained version-1 tools plus the excluded YouTube Downloader in `tools`, and the 70 cut tools in a separate `retiredTools` array. A retired tool's issue is closed as **not planned** with a link to [ADR 0023](https://github.com/yash244466666/ruma-tools/blob/main/docs/decisions/0023-focused-version-one-scope.md) and labelled `status:excluded`, and is kept rather than deleted: the scope decision stays traceable, and a tool ID is a persistent external identifier that is never reused for a different function. The tool's source, pure logic, provenance record, and tests remain in the repository — only its lazy component was dropped from the registry — so reinstating it is a manifest edit plus a superseding ADR, not a re-implementation. Because the issue is closed, its Project Workflow reads Done; the `status:excluded` label, not the workflow value, carries the retirement meaning. The same change renamed two task keys (`all87-test-matrix` → `regression-matrix`, `all87-release-candidate` → `release-candidate`) and corrected two retired tool IDs to their registry spelling (`csv-json-converter` → `csv-json`, `animation-css-generator` → `css-animation-generator`); each is expressed with `renamedFrom`, so a run adopts the existing issue or milestone carrying the old marker or title rather than creating a duplicate. This migration reached GitHub through the authorized apply on 2026-09-16; the live issues, keys, and the "30-Tool Closed Beta" milestone title then reflected the ADR 0023 manifest.

The ADR 0025 and ADR 0026 scope expansions were applied on 2026-10-30 in one authorized `pnpm github:work-items:apply` run: the manifest reconciled live GitHub to 151 marked issues — 10 epics, 32 launch tasks, 39 tools (the 38 version-1 tools plus the excluded YouTube Downloader), and the 70 retired tools. The run created the eight tool issues that had never existed (#235 Barometer & Altitude, #236 Compass, #237 Date Calculator, #238 Level & Angle, #239 Light Meter, #240 Random Picker, #241 Recipe Scaler, #242 Vibration Meter), updated 16 existing items, renamed the closed-beta milestone to **38-Tool Closed Beta** in place, and reconciled the Project (151 issues plus 2 linked pull requests) and its 1,057 field values; 71 issues remain closed as not planned with `status:excluded`. A dependency spot-check confirms the load-bearing `Currency Converter (#43) → network-provider-review (#33)` edge survived.

Two provisioning defects surfaced during that run and are fixed in the same change. First, the manifest's Project short description was 419 characters while GitHub caps it at 300; `gh project edit` failed only after labels, milestones, and issues had already been provisioned. The description is now 272 characters and `validateManifest` rejects an over-long one before any remote mutation, so a dry run reports it. Second, `renamedFrom` still named "33-Tool Closed Beta", a title never deployed because no apply ran while ADR 0025 was the scope; live still carried "30-Tool Closed Beta", so the run matched nothing, created a second milestone, and stranded the empty original. `renamedFrom` now names the last deployed title ("30-Tool Closed Beta"), the empty duplicate was deleted, and a re-run is idempotent (0 created, 0 updated, 0 added, 0 dependency changes).

The repository is **public** (ADR 0028), so GitHub branch protection and rulesets are available on the current plan. [Issue #129](https://github.com/yash244466666/ruma-tools/issues/129) tracks enabling protected `main`; that work is deliberately deferred until the GitHub-hosted workflow is merged to `main` and green, because enabling required checks while `main` still references the retired self-hosted runner would lock the branch. Immutable CI action pins are handled independently.

## Hierarchy

```text
Google Play v1 — 38 tools (ADR 0026)
├── Foundation and native platform
│   └── Foundation work items
├── Core catalog
│   └── 6 tool work items
├── Developer catalog
│   └── 5 tool work items
├── Text catalog
│   └── 5 tool work items
├── Media catalog
│   └── 1 tool work item
├── Security catalog
│   └── 1 tool work item
├── Math catalog
│   └── 12 tool work items
├── Quality, accessibility, performance, and device certification
│   └── Cross-catalog verification work items
└── Google Play release
    └── Identity, signing, policy, listing, testing, candidate, and launch work items
```

The 70 retired tool issues are kept under their category epics, closed as not planned, so the live hierarchy still lists them; only the 38 work items above are version-1 scope.

The 12 representative tools stay under their category epics and are grouped by the `12-Tool Architecture Milestone` milestone and `scope:vertical-slice` label. This avoids assigning a tool to two parents while preserving milestone reporting. Representative tools retired by ADR 0023 lose the `scope:vertical-slice` label on the next provisioning run, because managed labels are reconciled to the manifest.

## Workflow

| Workflow state | Meaning                             | Entry requirement                                                       | Exit requirement                                                   |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Backlog        | Approved scope, not refined         | Stable marker and owner epic exist                                      | Definition of Ready is complete                                    |
| Ready          | Safe to start                       | Scope, oracle, limits, risks, dependencies, and acceptance are explicit | Assignee creates an issue branch                                   |
| In Progress    | Active implementation               | One owner and branch; blockers still valid                              | Required implementation and local evidence exist                   |
| In Review      | Pull request is reviewable          | PR links the issue and CI evidence is present                           | Code review and automated gates pass                               |
| Device QA      | Installed-artifact evidence remains | Review gates pass and APK/AAB hash is recorded                          | Required device/accessibility/interop checks pass                  |
| Blocked        | Cannot make safe progress           | Blocking issue/external decision is linked                              | Blocking condition is resolved and evidence updated                |
| Done           | Acceptance gate is complete         | All applicable Definition of Done items pass                            | Issue is closed by the merged PR or explicit evidence-only closure |

Do not close a tool merely because it compiles or renders in a browser. A production tool remains open through Android artifact and physical-device evidence.

## Project fields

| Field     | Values/use                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------- |
| Workflow  | Backlog, Ready, In Progress, In Review, Device QA, Blocked, Done                                  |
| Work Type | Epic, Tool, Foundation, Quality, Release, Bug                                                     |
| Priority  | P0 Critical, P1 High, P2 Normal, P3 Low                                                           |
| Phase     | Foundation, 12-Tool Milestone, Tier 1 Migration, Adapter/Network/Special, Closed Beta, Production |
| Category  | Core, Developer, Text, Media, Security, Math, Platform, Release                                   |
| Risk      | Low, Medium, High, Critical                                                                       |
| Estimate  | Relative engineering points; it is not a calendar promise                                         |

Recommended views after provisioning:

1. **Current work** — board grouped by Workflow, excluding Done.
2. **Backlog** — table grouped by Phase, sorted by Priority and Estimate.
3. **38 tools** — table filtered to `type:tool` and not `status:excluded`, grouped by Category.
4. **12-tool milestone** — table filtered to `scope:vertical-slice`.
5. **Blocked and high risk** — table filtered to Workflow Blocked or Risk High/Critical.
6. **Release roadmap** — roadmap grouped by Phase and milestone.
7. **Device QA** — table filtered to Workflow Device QA.

GitHub currently requires project view layout/filter configuration through its UI; the script provisions the project, fields, linked repository, and items that those views use.

## Milestones

1. **Foundation Complete** — platform contracts, recovery, native bridges, instrumentation, and foundation device evidence.
2. **12-Tool Architecture Milestone** — all representative paths pass their Definition of Done on Android.
3. **Tier 1 Directly Portable Catalog** — the remaining directly portable tools pass.
4. **Adapter and Policy-Heavy Catalog** — Tier 2–4 file, persistence, timer, network, media, and special-review tools pass.
5. **38-Tool Closed Beta** — one candidate with all 38 enabled passes closed-test, device, accessibility, security, privacy, and support gates. (The rename chain is carried in the manifest as `renamedFrom`; it must name the last title actually deployed — currently "30-Tool Closed Beta" — so an authorized `pnpm github:work-items:apply` run adopts the existing milestone instead of creating a duplicate. This run renamed it in place.)
6. **Google Play v1 Launch** — signing, listing, declarations, pre-launch report, production eligibility, launch plan, and final authorization pass.

Milestone dates are deliberately unset until estimates are re-baselined after the 12-tool milestone and Play account eligibility is known.

## Labels

- `type:*` classifies epics, tools, foundation, quality, release, and bugs.
- `status:*` is for issue triage and exceptional blocked/device states; the Project Workflow field is the primary flow state. `status:excluded` marks a tool retired from the version-1 scope by ADR 0023.
- `priority:*` identifies execution order.
- `category:*` maps the six catalog categories plus platform and release work.
- `tier:*` maps the four migration tiers.
- `scope:vertical-slice` identifies the 12 representative tools.
- `risk:*` highlights high/critical permission, privacy, data-loss, policy, reliability, or performance exposure.

Do not use labels as evidence that a gate passed. Evidence belongs in the issue, pull request, tracker, and artifact records.

## Branch and pull-request convention

1. Move an issue to Ready only after its dependencies and Definition of Ready are valid.
2. Branch from `dev` and create one focused branch named `<type>/<issue-number>-<short-slug>`.
3. Keep commits scoped and use imperative Conventional Commit subjects where practical.
4. Open a PR early when review of architecture, permissions, privacy, dependencies, or limits is valuable.
5. Put `Closes #<issue-number>` in the PR body.
6. Record commands, exact results, device/API/WebView information, and artifact hashes without sensitive data.
7. Merge the pull request into `dev` only after required CI/review gates pass. Never weaken permissions or tests to obtain green status.
8. Move to Device QA when code review is complete but installed-artifact evidence remains.
9. Close only when the issue acceptance criteria and applicable repository Definition of Done pass. Promote `dev` to `main` as a reviewed release or maintenance merge; `main` is the default branch. Use a **merge commit** for `dev` → `main` (not a squash) so branch ancestry stays aligned; squash individual feature pull requests into `dev`.

## Tool work-item contract

Every tool issue records:

- stable ID, label, category, migration tier, milestone, priority, and upstream provenance;
- user outcome, explicit exclusions, independent correctness oracle, and golden fixtures;
- platform adapters, permissions, persistence, network, files, cleanup, sensitive-data, and lifecycle classification;
- strict input, output, size, time, memory, and cancellation limits;
- initial, empty, editing, invalid, loading, success, cancelled, offline, permission-denied, unsupported, over-limit, interrupted, and recovery states where applicable;
- compact/medium/expanded, portrait/landscape/split-screen, keyboard/IME, 48 dp, TalkBack, 200% text, contrast, and reduced-motion requirements;
- pure logic, component, E2E, adapter/native, bundled-artifact, and physical-device evidence;
- dependency, license, attribution, privacy/Data Safety, help, store-claim, and release-manifest reconciliation.

## Provisioning and audit

Dry-run and validate the manifest without contacting GitHub:

```bash
pnpm github:work-items:check
```

Create or resume the remote setup after authenticating GitHub CLI with repository and `project` scopes:

```bash
pnpm github:work-items:apply
```

A run of the provisioner also applies the ADR 0023 retirement: every retired tool issue is closed as **not planned** with a link to ADR 0023, and renamed work items and milestones are adopted from their `renamedFrom` marker rather than duplicated. Provisioning remains an explicit, user-authorized `pnpm github:work-items:apply` run. Normal builds and CI never create or modify GitHub work items.
