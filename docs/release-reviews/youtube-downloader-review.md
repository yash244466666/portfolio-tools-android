# Release Review: YouTube Downloader

- Review issue: #36 (tool issue: #93)
- Status: **DECIDED 2026-09-08 — EXCLUDED from version 1** (dossier option 3). See ADR 0021 (Accepted), which supersedes ADR 0004's all-87 clause for this tool, and the #36 evidence comment.
- Date: 2026-09-08
- Upstream reference: `portfolio-v2` commit `61e54c64edbeffc9487239b6dae399e255c6a71d`, `components/tools/dev/youtube-downloader.tsx` (150 lines)
- Plan anchors: `ANDROID_APP_IMPLEMENTATION_PLAN.md` line 470 ("Exclude YouTube Downloader from the first Play release" until validated) and section 29.4, which lists "YouTube downloading or other third-party media-download workflows" among workflows excluded "unless separately approved"
- Governing repository rule: section 4 — "Never include YouTube downloading in a release without a separate legal, policy, terms, security, and product review." This document is that review's evidence base; ADR 0004 makes an unresolved review block production rather than silently reducing the all-87 scope.
- Gate guard: implementation work on #93 must not start before the product-owner decision on this review is recorded.

## 1. What the upstream tool actually is

The upstream component performs **no downloading**. It:

1. Validates a YouTube URL with a regex (`youtube.com/watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/`) and extracts the 11-character video ID.
2. Fetches the video thumbnail directly from `https://img.youtube.com/vi/<id>/maxresdefault.jpg` (falling back to `hqdefault.jpg`) in an `<img>` element — a direct third-party network request to Google.
3. Constructs `https://cobalt.tools/#<encoded-url>` and opens it via `window.open`, routing the user to the third-party cobalt.tools web service, where any actual downloading happens entirely outside the app.
4. Reads the clipboard on an explicit Paste action and advertises cobalt's feature set ("No Ads", formats, supported services).

Two additional surfaces complete the inventory: a `CopyButton` copies the constructed `cobalt.tools` deep link to the clipboard (upstream lines 115–120), and the info banner renders an always-visible inline `cobalt.tools` anchor (upstream line 49) — so besides `window.open` there is a second navigation surface and a clipboard-write touchpoint that any migration's ExternalBrowserService and clipboard reviews must account for.

One upstream correctness quirk must not survive any re-scope: the URL regex is unanchored at the end and `extractVideoId` captures the first 11 characters, so a URL whose ID is longer than 11 characters passes validation and is silently truncated — wrong thumbnail, wrong displayed ID.

So the review question is not "is in-app downloading lawful" — it is **"may a Play-published app exist whose purpose is to route users to a third-party YouTube downloader."**

## 2. Policy and terms landscape (verified 2026-09-08)

- **YouTube Terms of Service** (`youtube.com/t/terms`): users may not "access, reproduce, download, distribute, transmit, broadcast, display, sell, license, alter, modify or otherwise use" any part of the Service or Content, "except: (a) as expressly authorized by the Service; or (b) with prior written permission from YouTube." Downloading via third-party services is squarely outside both exceptions.
- **Google Play Device and Network Abuse policy** (`support.google.com/googleplay/android-developer/answer/9888379`): the policy does not name YouTube, but it states "Apps that access or use a service or API in a manner that violates its terms of service" are prohibited. A listing whose named purpose is YouTube downloading invites review under this clause plus general policy discretion. The widely known removals of YouTube-downloader apps stemmed primarily from rightsholder copyright complaints rather than this specific clause — this repository has not independently verified any enforcement history, and the clause-based risk here is an unverified generalization, not documented precedent. The tool's _title itself_ ("YouTube Downloader") is a policy signal a reviewer sees first.
- **cobalt.tools** (the upstream's target service, verified operational 2026-09-08): its "terms and ethics of use" place all responsibility on the user ("you are responsible for what you do with our tools"), require respect for the source content's own terms and licenses, and describe anonymous processing with no download logs. Its terms do not — and cannot — authorize _the user_ to breach YouTube's ToS, which remains the binding constraint. (The observation that cobalt has changed its API and policies before is likewise an unverified generalization.)
- **Repository network rules** (section 14): the version-1 provider allowlist is Frankfurter and Cloudflare DNS-over-HTTPS only. The upstream's direct `img.youtube.com` thumbnail fetch would add a third provider (Google) and requires this review regardless of the download question.

## 3. Risk assessment

| Risk                                             | Severity      | Analysis                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Play listing enforcement                         | **High**      | The Device and Network Abuse "terms of service" clause plus the app's advertised purpose make removal, rejection, or account-level strikes plausible. The deep-link-only design mitigates nothing in the reviewer's eyes: the tool's name and UI present downloading as the purpose.                |
| Legal exposure of the facilitation               | Moderate      | The app performs no downloading and makes no unauthorized access itself; the user breaches YouTube's ToS on the external site. Breach of contract risk to the app publisher is indirect, but facilitating is what Play policy punishes and what section 4 of this repository reserves to the owner. |
| Upstream instability                             | Moderate      | The tool depends on a third-party web service's continued existence, domain, and ToS (cobalt has changed its API and policies before). A deep link that stops working becomes a dead tool in a shipped release.                                                                                     |
| Unreviewed network provider                      | Low (fixable) | `img.youtube.com` thumbnail fetches send video IDs (ordinary connection metadata) to Google; section 14 requires provider review, allowlisting, labeling, and failure states before any network call ships.                                                                                         |
| Repository rule violations to fix if implemented | Low (fixable) | `window.open` (section 11 — must be `ExternalBrowserService`), unbounded clipboard error handling, misleading "No Ads"/format promises copied from cobalt's marketing, and no distinct offline/error states.                                                                                        |

## 4. Options for the product owner

Note that this gate is five-dimensional (Play-policy, legal, provider-terms, reliability, product-value): the provider-terms decision (whether `img.youtube.com` may join the section-14 allowlist) and the reliability decision (whether the product may depend on a third-party web service) need answers regardless of how the Play question is resolved.

1. **Ship as upstream (deep-link to cobalt.tools, "YouTube Downloader" title)** — **not recommended.** Highest Play-enforcement risk against a release whose entire 87-tool scope depends on passing review; also imports the upstream's repository-rule violations. Note that this option departs from the plan's own recorded exclusion (line 470, section 29.4) and therefore requires the "separately approved" step the plan already names.
2. **Ship with a compliant re-scope** — e.g., a "Video Link Inspector": validate and parse YouTube (and other platform) URLs with strict anchoring (fixing the upstream truncation quirk), show the video ID and — after a section-14 provider review — a thumbnail, and open the _official_ watch page via `ExternalBrowserService`, with no downloader routing. Compliant and useful, but this is a **different function**: under section 10, the persistent `youtube-downloader` tool ID cannot be reused for it, so this path means the catalog's audited entry is replaced and ADR 0004 is **superseded by a new ADR with explicit product-owner approval** — ADR 0004's own amendment process, which must never be edited in place.
3. **Exclude from version 1 and record the exclusion** — the honest outcome if the owner is unwilling to accept listing risk: a **superseding ADR** (not an in-place edit of ADR 0004, which mandates "explicit product-owner approval and a superseding ADR" for scope reduction) records the change from "all 87 tools" to "86 tools + 1 excluded by legal/policy review." Mechanically, GitHub has no EXCLUDED close reason: issue #93 is closed as not-planned with a distinct status label, and the tracker's EXCLUDED status, the release manifest, and Project #8 must be reconciled deliberately so the provisioning's closed→Done mapping cannot present the excluded tool as completed.
4. **Defer pending external change** — if YouTube ever offers an authorized download path or the owner obtains written permission, the tool can re-enter scope with fresh evidence. The issue stays open as BLOCKED in the meantime.

## 5. What cannot be decided by this document

- Whether the owner accepts Play-enforcement risk for option 1.
- Whether option 2's re-scope (new tool, superseding ADR for ADR 0004) is desirable product work.
- Any claim that a specific design "is safe on Play" — Play applies reviewer discretion that no document can pre-clear, and this repository must never claim Play-readiness while any gate (this one included) is open.

## 6. Conclusion

Every technical aspect of this tool is trivially implementable — it is a URL parser, a link builder, and a browser handoff. The dominant risk is legal/policy, where the verified landscape (YouTube ToS download prohibition + Play's terms-of-service-violation clause) makes the tool as titled a genuine listing liability — but the risk table also records the cobalt dependency (a dead tool if the service disappears) and the unreviewed `img.youtube.com` provider obligation, both of which need decisions whatever the Play answer is. The recommendation of this review is option 2 or 3: either re-scope to a compliant function with a superseding ADR, or exclude the tool from version 1 with the exclusion recorded through ADR 0004's mandated amendment process. Shipping as titled (option 1) is not recommended under any realistic reading of the current policies.
