# ADR 0021: Version-1 Scope Exclusion of YouTube Downloader

- Status: Accepted
- Date: 2026-09-08
- Owner: Yash Sikdar
- Supersedes: the all-87 clause of ADR 0004 for the single tool `youtube-downloader` (per ADR 0004's own revisit trigger and amendment requirement — this is that superseding ADR; ADR 0004 is not edited in place)
- Revisit when: YouTube offers an authorized download path, the product owner obtains prior written permission from YouTube, or a compliant re-scoped function is separately approved as a new tool under section 10 of the repository rules.

## Context

The merged release-review dossier `docs/release-reviews/youtube-downloader-review.md` (review issue #36, tool issue #93) verified on 2026-09-08 that:

- The upstream component performs no downloading; it routes users to the third-party `cobalt.tools` web service and hot-links thumbnails from `img.youtube.com` (a network provider outside the section-14 allowlist).
- YouTube's Terms of Service prohibit downloading content outside the Service's own features or prior written permission.
- Google Play's Device and Network Abuse policy prohibits apps that "access or use a service or API in a manner that violates its terms of service," and the tool's title itself is a reviewer-facing policy signal.

On 2026-09-08 the product owner selected exclusion from version 1 (the dossier's option 3), choosing not to accept the Play-enforcement risk to the rest of the release.

## Decision

`youtube-downloader` is excluded from the version-1 Google Play release. The approved public version-1 scope is therefore **86 of the 87 audited catalog tools**: the previously enabled 84 tools plus the two tier-4 tools whose release reviews were approved the same day (Audio Recorder, #111; Video to GIF, #112). No `youtube-downloader` entry exists or will be added to the tool registry for version 1; the persistent tool ID `youtube-downloader` is not reused for any different function (section 10).

Mechanics recorded deliberately so provisioning cannot present the exclusion as completion: GitHub issue #93 is closed as not-planned carrying a distinct `status:excluded` label (GitHub has no EXCLUDED close reason, and `docs/WORK_MANAGEMENT.md` maps closed issues to Done on provisioning runs — the tracker, the release manifest, and this ADR are the authoritative exclusion records, and the tool must never appear in a release manifest). Review issues #34, #35, and #36 close as completed with the decisions recorded in evidence comments; their device-level acceptance rows transfer to the implementation issues (#111, #112), which remain open until their Definition of Done evidence exists.

## Alternatives considered

- Shipping the deep-linker as titled: rejected — the dossier documents the highest Play-enforcement risk of the four options and departs from the plan's own recorded exclusion (line 470 and section 29.4).
- Re-scoping to a compliant "Video Link Inspector": a viable product, but it is a different function requiring a new tool ID and its own release review; the owner may propose it as future work under the normal issue process. Not part of this decision.
- Deferring: leaves the all-87 scope formally unsatisfied with the same listing risk unchanged; superseded by explicit exclusion.

## Consequences

- The version-1 release manifest, store claims, regression matrix, and certification gates (#21–#26) now target 86 tools. Issue #93's closure must never be counted as a completed tool.
- The estimate, effort, and scope statements that reference "all 87" in `AGENT.md`/`CLAUDE.md` are updated in the same change to name the 86-tool scope and this ADR.
- If the exclusion is ever reversed, it requires a new superseding ADR, a fresh release review, and the full Definition of Done for the tool — including the section-14 provider review for any network surface.
