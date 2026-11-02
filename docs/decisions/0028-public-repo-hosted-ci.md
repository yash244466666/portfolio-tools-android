# ADR 0028: Public Repository, Hosted CI, and Dual-Branch Delivery

- Status: **Accepted** — directed by the product owner on 2026-11-02.
- Date: 2026-11-02
- Owner: Yash Sikdar (product owner)
- Supersedes: [ADR 0024](0024-self-hosted-ci-runner.md) (self-hosted runner) and its premise that the repository must remain private. The CI content gates, pinned actions, `paths-ignore`, concurrency, and release-authorization rules remain in force.
- Revisit when: hosted-runner quotas or pricing change, a secret or sensitive datum is discovered in history, Pages or release publishing needs a different access model, a self-hosted runner is proposed again (it must not be attached to this public repository), or Play signing/credentials become available.

## Context

On 2026-11-02 the product owner directed that the repository become **public**, that `main` remain the default branch, that a `dev` integration branch be created, that CI/CD and deployment run for both branches, and that stale branches be deleted.

Two earlier constraints had shaped the repository:

1. The repository was private, and ADR 0024 recorded that making it public was prohibited because it would have been the cheapest way to escape metered hosted-runner minutes.
2. Because hosted minutes were exhausted on 2026-09-15, CI ran on a **self-hosted runner registered from the maintainer's Linux workstation**.

Those constraints are now reversed by the owner, but the security consequence is not optional: **a self-hosted runner must never be attached to a public repository**. A fork pull request can execute workflow code, and a self-hosted runner would run that code on the maintainer's machine with access to its filesystem and credentials. GitHub-hosted standard runners are free for public repositories, so the original cost reason for self-hosting disappears as well.

## Decision

### Visibility and branches

- The repository is **public**.
- **`main` remains the default and release branch.**
- **`dev` is the integration branch.** Feature and fix branches are cut from `dev`; pull requests target `dev`. Promotion to `main` is a deliberate release/merge step.
- Existing branches with no open pull request are deleted; `main`, `dev`, and the branches behind open pull requests are kept.

### CI

- All workflows run on **GitHub-hosted `ubuntu-latest` runners**.
- The self-hosted runner registration is deleted and its local service stopped **before** the visibility change.
- CI runs on pushes to `main` and `dev` and on pull requests targeting either branch. The full web and Android gate is unchanged: formatting, typecheck, lint, token/contrast gates, work-item and action-policy checks, unit/component tests, production build, Playwright E2E, native unit tests, Android lint, all three variants, and the merged-manifest permission/export checks.
- Actions remain pinned by full commit SHA. Every workflow keeps a top-level read-only `contents` permission and opts into writes only at the job that needs them.
- A push to a pull-request branch still cancels that branch's superseded run; `paths-ignore` still skips prose-only pull requests.

### CD and deployment

- The Android job uploads the **debug APK**, **internal APK**, and **unsigned release AAB** as 14-day build artifacts for every branch run.
- On a push to `main` or `dev`, a `debug-release` job publishes the debug APK as a **pre-release** (`debug-<branch>-<run>`) for testers. It is debug-signed and installs as `dev.yash.tools.debug`; it is not a production candidate.
- A Pages workflow publishes the Vite web harness for both branches: `main` at the site root and `dev` under `/dev/`. This is a browser preview, not the Android product.
- **No Google Play deployment is configured.** The release AAB remains intentionally unsigned, and no upload keystore, Play service account, or Play credentials exist in the repository. Play deployment stays behind the product-owner release gates (#27–#41) and requires explicit authorization plus key custody.

### Security controls

- No Actions secrets or variables existed at the visibility change; a tracked-secret scan found none.
- The self-hosted runner was removed from the repository and its local process stopped before the repository became public.
- Hosted runners carry only the repository-scoped `GITHUB_TOKEN`; the release job receives `contents: write` only for creating pre-releases, and the Pages job receives `pages: write` and `id-token: write` only for deployment.
- Fork pull requests remain subject to GitHub's first-time-contributor approval default. No `pull_request_target` workflow exists.

## Alternatives considered

- **Stay private and keep the self-hosted runner.** Rejected by the owner; it also prevents free hosted minutes and branch protection on the current plan.
- **Make the repository public but keep the self-hosted runner.** Rejected as a critical remote-code-execution risk from fork pull requests.
- **Run CI only on `main`.** Rejected: `dev` would accumulate unverified work and the user explicitly asked for both branches.
- **Deploy to Google Play.** Not possible now: no signing key, Play service account, or release approval. The AAB build remains a proof artifact.
- **Publish only artifacts, no Pages.** Rejected by the owner's selection; Pages gives a zero-install review surface and builds both branches into one site.

## Consequences

1. **Public surface** — source, history, issues, workflow logs, and release assets are public. No secrets are tracked, but local paths and internal planning text in historical documents are now visible. Keep future commits free of private data.
2. **Cost** — standard GitHub-hosted runners are free for public repositories. If usage later exceeds the hosted allowance or a larger runner is required, revisit; do not reintroduce a self-hosted runner on this public repository.
3. **Branch protection** — the plan limitation recorded in issue #129 no longer applies. Protection/rulesets are **not enabled yet** because the hosted workflow must first exist on `main` and be green; enabling required checks while `main` still references the retired self-hosted runner would lock the branch.
4. **Release noise** — every push to `main` or `dev` creates a pre-release. These are intentionally test-only and can be pruned; they do not imply a production release.
5. **Pages** — the preview reflects both branches but is not an Android artifact and does not prove WebView behavior. It must not be presented as the app release.
6. **Open pull requests** — the two open PRs predate this change and their branches still carry the self-hosted workflow. Their recorded CI evidence remains valid, but a new push requires rebasing onto the hosted workflow before checks can run.

## Approval

Directed by the product owner, **Yash Sikdar**, on **2026-11-02**: make the repository public, keep `main` as the default branch, create `dev`, add CI/CD and deployment for both branches, and delete unused branches.
