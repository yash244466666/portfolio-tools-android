# GitHub Work Management

> Scope: development through the first Google Play production launch containing all 87 audited tools.
>
> Product decision: `docs/decisions/0004-all-87-tools-first-release-scope.md`.
>
> Provisioning source: `config/github-work-items.json` and `scripts/setup-github-work-management.ts`.

Live planning links:

- [Google Play v1 Project](https://github.com/users/yash244466666/projects/8)
- [Root launch epic](https://github.com/yash244466666/portfolio-tools-android/issues/2)
- [Repository issues](https://github.com/yash244466666/portfolio-tools-android/issues)
- [Work-management pull request #130](https://github.com/yash244466666/portfolio-tools-android/pull/130)

## System of record

- GitHub Issues are the executable work items.
- GitHub sub-issues express the release/epic/tool hierarchy.
- GitHub issue dependencies express actual blocking relationships.
- Repository milestones express sequential delivery gates.
- The GitHub Project provides portfolio views and custom planning fields.
- Pull requests use `Closes #<issue>` and contain verification evidence.
- `IMPLEMENTATION_TRACKER.md` remains the evidence-oriented repository snapshot and must be reconciled after every substantial batch.
- ADRs remain authoritative for significant architecture, permission, privacy, storage, network, dependency, product-scope, and release decisions.

The provisioning script uses stable hidden markers in issue bodies. It is safe to rerun: managed titles, planning-body sections, managed labels, milestones, parent relationships, dependency edges, project membership, and Project values are reconciled rather than duplicated. Checked acceptance items and content outside the managed body markers are preserved, as are labels not owned by the manifest. Record execution evidence in issue comments so planning-contract updates and evidence remain independently auditable. Closed issues and merged pull requests are mapped to Done on subsequent runs.

The initial 2026-09-05 provisioning created 128 marked issues: 10 epics, 31 foundation/quality/release tasks, and exactly 87 tool issues. It also created 29 labels, 6 milestones, 90 blocking relationships, and 7 custom Project fields. The Project contains those issues plus linked pull requests.

Branch protection and repository rulesets are not available for this private repository on its current GitHub plan; GitHub returns HTTP 403 and requires GitHub Pro or a public repository. The repository must remain private. [Issue #129](https://github.com/yash244466666/portfolio-tools-android/issues/129) tracks enabling protected `main` when the account supports it; immutable CI action pins are handled independently.

## Hierarchy

```text
Google Play v1 — all 87 tools
├── Foundation and native platform
│   └── Foundation work items
├── Core catalog
│   └── 7 tool work items
├── Developer catalog
│   └── 45 tool work items
├── Text catalog
│   └── 17 tool work items
├── Media catalog
│   └── 3 tool work items
├── Security catalog
│   └── 5 tool work items
├── Math catalog
│   └── 10 tool work items
├── Quality, accessibility, performance, and device certification
│   └── Cross-catalog verification work items
└── Google Play release
    └── Identity, signing, policy, listing, testing, candidate, and launch work items
```

The 12 representative tools stay under their category epics and are grouped by the `12-Tool Architecture Milestone` milestone and `scope:vertical-slice` label. This avoids assigning a tool to two parents while preserving milestone reporting.

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
3. **87 tools** — table filtered to `type:tool`, grouped by Category.
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
5. **All-87 Closed Beta** — one candidate with all 87 enabled passes closed-test, device, accessibility, security, privacy, and support gates.
6. **Google Play v1 Launch** — signing, listing, declarations, pre-launch report, production eligibility, launch plan, and final authorization pass.

Milestone dates are deliberately unset until estimates are re-baselined after the 12-tool milestone and Play account eligibility is known.

## Labels

- `type:*` classifies epics, tools, foundation, quality, release, and bugs.
- `status:*` is for issue triage and exceptional blocked/device states; the Project Workflow field is the primary flow state.
- `priority:*` identifies execution order.
- `category:*` maps the six catalog categories plus platform and release work.
- `tier:*` maps the four migration tiers.
- `scope:vertical-slice` identifies the 12 representative tools.
- `risk:*` highlights high/critical permission, privacy, data-loss, policy, reliability, or performance exposure.

Do not use labels as evidence that a gate passed. Evidence belongs in the issue, pull request, tracker, and artifact records.

## Branch and pull-request convention

1. Move an issue to Ready only after its dependencies and Definition of Ready are valid.
2. Create one focused branch named `<type>/<issue-number>-<short-slug>`.
3. Keep commits scoped and use imperative Conventional Commit subjects where practical.
4. Open a PR early when review of architecture, permissions, privacy, dependencies, or limits is valuable.
5. Put `Closes #<issue-number>` in the PR body.
6. Record commands, exact results, device/API/WebView information, and artifact hashes without sensitive data.
7. Merge only after required CI/review gates pass. Never weaken permissions or tests to obtain green status.
8. Move to Device QA when code review is complete but installed-artifact evidence remains.
9. Close only when the issue acceptance criteria and applicable repository Definition of Done pass.

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

The apply operation is intentionally explicit. Normal builds and CI never create or modify GitHub work items.
