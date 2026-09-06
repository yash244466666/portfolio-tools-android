# ADR 0008: Markdown Preview Rendering and Sanitizer Policy

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: another tool needs rendered untrusted HTML, the sanitizer policy needs broader document features, or DOMPurify/marked upstream releases change their security behavior.

## Context

Markdown Preview must render untrusted Markdown as HTML inside the privileged WebView. The repository rules require a narrow reviewed sanitizer policy (CSP is defense in depth, never the sanitizer), bounded inputs, offline behavior, and no persistence of tool input. The upstream portfolio reference used `marked` plus `DOMPurify` with library-default sanitization and no size limits; the upstream behavior is preserved but hardened here.

## Decision

Enable the `markdown-preview` tool with a pure rendering module and an explicit sanitizer configuration:

- Dependencies are individually pinned: `marked` 18.0.11 (MIT) parses GFM Markdown; `dompurify` 3.4.14 (MPL-2.0 OR Apache-2.0) sanitizes the output. Both are bundled offline libraries with no network access; licenses are permissive and recorded in `docs/SOURCE_PROVENANCE.md`. The sanitizer deliberately pins the most recent release outside the repository's release-age window (3.4.15 shipped the same day) rather than adding a supply-chain policy exclusion for a security-critical library.
- The sanitizer uses an explicit tag and attribute allowlist limited to document content (headings, text, links, images, lists, tables, code blocks, task-list checkboxes, and details/summary). Scripts, styles, iframes, embeds, objects, forms, SVG, MathML, and media elements are always dropped; data attributes, class/id, target, rel, and inline style attributes are not allowed; URI schemes stay under DOMPurify's default policy, which removes `javascript:` and `data:` payloads while keeping same-document anchors.
- Markdown input is limited to 256 KiB of UTF-8 bytes. The component checks the bound before rendering, shows a typed over-limit state, and does not render oversized input.
- Preview rendering is debounced at 150 ms so ordinary text input stays responsive; rendering errors become a visible recovery state and never inject unsanitized output.
- The tool keeps no persistent state, reads nothing from the network, and clears its input only through the explicit Reset action.

## Alternatives considered

- Library-default DOMPurify configuration: rejected because the default allowlist is broader than a preview needs (forms, media, style attributes); an explicit narrow allowlist is reviewable and testable.
- A regex-based homemade sanitizer: rejected as a security hazard; a maintained, tested sanitizer library is the reviewed choice.
- Rendering into an isolated frame or Worker sanitizer: rejected for version 1 because the bundled-origin CSP plus a narrow sanitizer at the production origin already meets the threat model; revisit if richer embeds are ever requested.
- No input limit: rejected because unbounded per-keystroke parsing would break the interaction budget.

## Consequences

- Markdown Preview renders user Markdown offline with hostile-input tests as release gates; the preview is sanitized HTML rendered with `dangerouslySetInnerHTML`, which is acceptable only for sanitizer output.
- GFM fidelity is slightly narrower than the upstream default (for example, embedded HTML forms and media are stripped rather than rendered); content is preserved under `KEEP_CONTENT`.
- The 256 KiB limit and debounce behavior require measurement on a physical device for the performance budget; automated tests cover the bounds.
- New pinned dependencies require lockfile review in CI and license/attribution recording; no native or network surface changes.
