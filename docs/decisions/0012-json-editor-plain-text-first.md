# ADR 0012: JSON Editor Plain-Text-First Design

- Status: Accepted
- Date: 2026-09-06
- Owner: Yash Sikdar
- Revisit when: a physical-device pass shows the plain-text editor is insufficient for realistic documents, or another tool needs a rich code editor and a shared editor dependency is justified.

## Context

The audited upstream JSON Editor is built on CodeMirror 6 (`@codemirror/view`, `@codemirror/state`, `@codemirror/lang-json`, `@codemirror/commands`, `@codemirror/language` plus a custom theme), an editable tree panel, and export through a hidden `<a download>` anchor. The repository rules require an accessible plain-text fallback for any code editor, bounded parsing for hostile JSON, and bridge-only file export. CodeMirror would add roughly five pinned dependencies and a large chunk for the bundled WebView, and its mobile IME/touch behavior on Android WebView still needs the same plain-text fallback this repository demands anyway.

## Decision

Enable the `json-editor` tool with a plain-text-first design and no new dependency:

- **Editor**: a labeled, spell-check-disabled `<textarea>` with monospace styling is the primary editor. This is the accessible fallback made primary — it works with TalkBack, Switch Access, IMEs, hardware keyboards, and 200 % text without a compatibility layer.
- **Bounded parsing** (`json.ts`): 256 KiB input cap checked before parsing (so oversized whitespace-only input reports the true over-limit state), typed `invalid`/`over-limit` results, and a recoverable message for engines that raise `RangeError` on over-deep nesting (modern V8 parses nesting iteratively; the branch guards older WebViews). The engine parse message is truncated to 200 characters and displayed only to the same user, never logged.
- **Inspector tree**: a view-only tree built from expanded paths — collapsed by default, 48 dp expandable rows with `aria-expanded`, bounded previews (80 characters), a 1000-node render cap, a 64-level depth cap, and an expand-all refusal beyond 2000 nodes. In-tree value editing from the upstream design is intentionally not ported; the textarea is the single editing surface, so the tree can never disagree with the document.
- **Adaptive layout**: compact windows switch between Editor and Tree through a `tablist`; expanded windows show both side by side.
- **Export**: Copy, Share JSON (`cache/share/` + system share sheet), and Save JSON (SAF `ACTION_CREATE_DOCUMENT`) as a UTF-8 `application/json` file through the platform `FileService`; the upstream hidden download anchor is not copied.

## Alternatives considered

- **Port CodeMirror 6 with a textarea fallback**: rejected for version 1; two editors double the accessibility and IME test surface while the fallback must exist regardless.
- **A lighter editor dependency (`react-simple-code-editor` + `prismjs`)**: rejected; still a dependency for highlighting only, and highlighting is presentation, not correctness.
- **Editable tree (upstream parity)**: rejected; keeping the tree read-only removes a whole class of state-synchronization bugs between two editors and shrinks the touch/AT surface.

## Consequences

- No new dependency; the tool's lazy chunk stays small (7.14 kB / 2.79 kB gzip).
- Developers lose syntax highlighting and in-tree editing versus the upstream portfolio site; the mobile product gains predictable IME, TalkBack, and process-recreation behavior.
- The `1e999`-style engine quirk (valid JSON grammar that serializes back as `null`) is documented in tests as standard JavaScript behavior.
- Device evidence (TalkBack over the tablist and tree, 200 % text, split-screen) remains assigned to issues #17/#18; automated, E2E, and artifact gates pass.
