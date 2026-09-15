# ADR 0024: Self-Hosted CI Runner

- Status: Accepted
- Date: 2026-09-15
- Owner: Yash Sikdar
- Supersedes: nothing. It changes the runner topology of `.github/workflows/ci.yml`, not any gate, permission, or release decision.
- Does not affect: the CI gate list, the immutable-action-SHA policy, the top-level read-only `contents` permission, or any release gate in section 24 of the repository rules.
- Revisit when: the repository gains outside contributors or forks, the runner host is rebuilt or retired, the project justifies metered runners, or hosted minutes stop being a constraint.

## Context

This repository is private, so GitHub-hosted runner minutes are metered against the GitHub Free allowance of 2,000 minutes per billing month.

On 2026-09-15 that allowance was exhausted, and the failure mode was unusually confusing. Jobs were never allocated a runner: each failed about two seconds after starting with **zero steps executed** and `runner_id: 0`, and no log blob was produced at all (`BlobNotFound`). Nothing in the run pointed at a cause, and it looked exactly like a change-specific breakage — the first failing run was on a feature pull request.

It was not. The decisive evidence:

- Re-running `main`'s **own previously-green commit** failed identically, so no feature change was involved.
- Every run earlier the same evening (`main` at 20:34Z and four runs at 19:47–19:48Z, plus another branch at 19:54Z) succeeded; the first failure came later.
- Measured usage: roughly **201 runs since 2026-09-05**, totalling about 1,200 minutes of run wall-clock across two parallel jobs — approximately **2,400 billed job-minutes** against the 2,000-minute allowance.
- GitHub's status page reported all systems operational, and the repository's Actions permissions were normal (`enabled`, `allowed_actions: all`).

A secondary cause was visible in the same data: the workflow ran the full two-job suite on **every** push to every pull-request branch, with no `concurrency` cancellation, so a branch pushed three times paid for the suite three times.

## Decision

Both CI jobs run on a **self-hosted runner** registered from the maintainer's Linux workstation, selected by the label `yash-linux`:

```yaml
runs-on: [self-hosted, yash-linux]
```

Supporting changes, all in `.github/workflows/ci.yml`:

1. **`concurrency`** with `cancel-in-progress` on pull requests, so a superseded push cancels its predecessor instead of paying for both. `main` is deliberately never cancelled — a half-verified `main` is worse than a slow one.
2. **`paths-ignore: ["docs/**", "**/*.md"]`** on `pull_request`, so a prose-only change does not spend a run. Nothing in the workflow inspects Markdown, and the work-item manifest lives under `config/`, not `docs/`, so its validation still runs.
3. **`pnpm format:check` added** to the web job. Formatting was a declared repository gate that CI never enforced, which is why drift accumulated silently across merged batches.
4. **`--with-deps` dropped** from the Playwright install. That flag exists because GitHub's hosted image lacks the browsers' system packages; this host already has them (and the cached browsers), and `--with-deps` would additionally require interactive `sudo` to run `apt`.

The comment block at the top of the workflow records how to return to hosted runners: revert both `runs-on` values and restore the flag.

The runner itself is **out-of-tree operational state**, not repository state. It is registered under the maintainer's account, runs as a user systemd service, and must be re-registered if the host is rebuilt. `CLAUDE.md`/`AGENT.md` section 24 records its existence and the two consequences below.

## Alternatives considered

- **Make the repository public.** Actions minutes are free for public repositories, which would fix the cause exactly. Rejected: making this repository public is explicitly prohibited by the product owner's standing instruction, and it would also change the privacy posture of a pre-release product whose entire positioning is privacy.
- **Add a spending limit / payment method for metered minutes.** Viable and immediate, and it keeps GitHub's own hardened runners. Not chosen: it converts a recurring cost onto a pre-release project whose CI volume (~200 runs/month) is driven by the merge cadence, and the owner preferred to remove the metered dependency instead.
- **Merge the two jobs into one sequential job.** Approximately halves billed minutes, because the parallel jobs are billed separately while a single job bills once. Rejected: it roughly doubles wall-clock per run (to ~10–12 minutes), which slows every pull request for a saving that self-hosting already delivers in full.
- **Wait for the allowance to reset.** Rejected: the same volume recurs the following month, so it defers the problem rather than fixing it.
- **Move to a third-party CI provider.** Rejected as out of scope: it would introduce a new supply chain, new secret custody, and new pinned-action-equivalent review for no benefit over the maintained workflow.

## Consequences

- **CI no longer consumes metered minutes**, so cost is decoupled from push volume and the exhaustion cannot recur.
- **CI only runs while the workstation is up.** This is the real price. A pull request pushed while the machine is off or asleep stays queued until it returns; that is a deliberate availability trade for zero cost, and it must not be mistaken for a hung run. Jobs that queue also hold the pull request's check status at pending rather than failing.
- **The runner is a trust boundary.** Workflow code — including every `run:` step — executes on the maintainer's machine. Repository write access therefore now implies code execution on that host. Mitigations, which are why this is acceptable for this repository and would not be for a public one: the repository is private with a single maintainer; pull-request workflows from forks require maintainer approval; every action remains pinned to a full commit SHA and is enforced by `pnpm github:actions:check`; and the top-level `permissions: contents: read` is retained and also enforced by that script.
- **A cancelled run is not evidence.** Superseded pull-request runs are cancelled by design, so a mid-flight run for a branch must not be cited as gate evidence; only the final run for a commit counts.
- **Branch protection interacts with `paths-ignore`.** A skipped workflow reports as _skipped_, not successful, so if branch protection is enabled (issue #129) a docs-only pull request would need a deliberately added no-op gate before it could merge. This is recorded in the workflow comment.
- **Reversibility is high.** The workflow is portable: reverting the two `runs-on` values and the Playwright flag restores the previous behaviour exactly, and nothing else in the repository depends on the runner.

## Verification

Verified green on the self-hosted runner before this ADR was accepted. Both jobs ran on the same commit and passed: `android-debug` in 3m30s and `web-quality` in 4m08s, **7m44s end to end**, with `runner_name=yash-portfolio-ci` — where the same class of commit had previously failed with `runner_id: 0` and no runner at all. The suite included `pnpm format:check`, which CI had never before run (the pnpm store and Gradle caches warm on the host; a cold run against the hosted-image defaults had peaked at **5.1 GB**, and removing the Actions caches brought that to **3.3 GB**).

Measured resource profile, for sizing any future host: **`android-debug` peaks around 3–5 GB** and `web-quality` around 2–3 GB. A host intended to take both jobs should have at least 8 GB of RAM; 4 GB would run one job at a time with little headroom.

The gate list is unchanged from section 24 of the repository rules; only where it executes changed.
