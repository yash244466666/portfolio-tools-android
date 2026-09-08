# Release Review: <Tool Name>

<!-- Copy this template for every tier-4 release-review dossier. Keep the
     mandatory header fields verbatim so the dossiers stay reconcilable. -->

- Review issue: #<review-issue> (tool issue: #<tool-issue>)
- Status: **DRAFT — the approval decision belongs to the product owner and is not made by this document**
- Date: YYYY-MM-DD
- Upstream reference: `portfolio-v2` commit `<commit>`, `<upstream path>` (<lines> lines)
- Plan anchors: the plan rows and sections that already take a position on this tool
- Governing repository rule: the section-4/section-19 rule this review exists to satisfy
- Gate guard: implementation work on #<tool-issue> must not start before the product-owner decision on this review is recorded.

## 1. What the upstream tool actually is

A factual inventory of the upstream behavior, including every navigation,
clipboard, network, persistence, and resource-cleanup surface, plus a
defect/quirk inventory the Android product must not copy.

## 2. Policy and terms landscape (dated, sourced)

Live-verified external facts with dates and URLs. Mark generalizations that
could not be independently verified as such — do not state them as precedent.

## 3. Risk assessment

Table: risk, severity, analysis. Cover every gate dimension the issue names
(e.g., Play-policy, legal, provider-terms, reliability, product-value), not
only the dominant one.

## 4. Options for the product owner

Enumerated options with an explicit recommendation. Any scope change must go
through a superseding ADR (never an in-place edit of an accepted ADR), and
any issue-state change must describe its concrete mechanics (labels, Project
status, manifest reconciliation) so provisioning cannot misread it.

## 5. What cannot be decided by this document

The decisions that belong to the product owner, including any claim a
document cannot pre-clear (Play reviewer discretion in particular).

## 6. Conclusion

Short verdict naming the recommended option(s) and the binding exit criteria
(device evidence, provider reviews) that remain regardless of the decision.
