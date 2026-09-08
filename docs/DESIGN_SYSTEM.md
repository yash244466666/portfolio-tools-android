# Android Foundation Design System

The foundation uses a restrained, accessible Material-inspired utility interface. The `ui-ux-pro-max` review informed touch, navigation, contrast, layout, feedback, and accessibility gates; repository requirements override any generated palette/font suggestion that would introduce remote assets or conflict with product privacy.

## Principles

- Content and task clarity before decoration.
- One obvious primary action per tool state.
- Honest local/network and enabled/planned status.
- Compact-first, then adapt rather than stretch.
- Light and dark themes designed together.
- System/local fonts and bundled vector icons only.
- Predictable Android navigation and recovery.

## Tokens

Semantic tokens live in `src/styles.css`:

- Background/surface: `--background`, `--surface`, `--surface-raised`, `--surface-muted`, `--surface-hover`.
- Text: `--text`, `--text-secondary`, `--text-tertiary`.
- Action: `--primary`, `--primary-hover`, `--on-primary`, `--focus`.
- Boundaries: `--border`, `--border-strong`.
- State: `--danger`, `--danger-text`, `--success-text`.

Do not use theme-specific raw hex values in tool components. Add a semantic token when a genuinely reusable role is missing.

## Layout

- Compact: bottom navigation, single-column tools, 16 px minimum horizontal inset.
- Medium: responsive card grid and selectively split tool panels.
- Expanded: 256 px navigation rail plus bounded content width.
- Respect all safe-area environment insets.
- Avoid nested scrolling; the document is the main scroll surface.
- Tool content uses readable widths rather than filling tablets edge-to-edge.

## Interaction

- Android touch target: minimum 48 × 48 dp. Every shared interactive control meets this floor: buttons, inputs, filter chips, segmented-control segments, icon buttons, navigation links (bottom bar and rail), and links (back/text). Intentional exceptions are non-interactive elements only: status/risk chips and count badges are read-only and may sit below 48 dp. Any future interactive control smaller than the floor must be documented here with its hit-area expansion.
- Checkbox/radio options use a full-width row as the tap target: the visible control may stay compact (20 px) inside a `min-h-12` label row that wraps both the input and its visible text label. The row, not the small control, must meet the 48 dp floor; rows keep `gap-3` spacing between the control and text.
- Adjacent easily confused controls: aim for at least 8 dp separation.
- Press feedback: visible within 100 ms.
- Typical transition: 150–300 ms.
- Focus ring: 3 px with offset and AA contrast.
- Long work: measurable progress when possible plus Cancel.
- Destructive actions: separated, clearly named, confirmed or safely undoable.

## Typography

- Local/system Roboto-compatible stack; no runtime web-font request.
- Minimum normal mobile body: 16 px.
- Body line height: about 1.5–1.7.
- Timers/numeric results use tabular or monospaced figures where layout stability matters.
- Labels remain visible; placeholders only demonstrate formats.

## Required states

Every applicable screen covers initial, empty, editing, invalid, loading, success, cancelled, offline/stale, permission denied, unsupported, over-limit, no-space, interrupted, recovered, disabled/deprecated, and removed states.

## Accessibility checks

- WCAG 2.2 AA for WebView content.
- TalkBack name, role, value/state, order, and live updates.
- Keyboard and Switch Access reach every action.
- 200% text without clipped controls.
- Reduced motion.
- Color correction and no color-only status.
- Chart/Canvas text alternative.
- Visible focus in both themes.
