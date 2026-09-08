/**
 * Pure CSS grid template generation.
 *
 * Two deliberate departures from upstream: an emptied template input no
 * longer emits a dangling `grid-template-columns: ;` declaration (the line is
 * skipped instead), and placement values are trimmed so whitespace-only text
 * is treated as `auto` rather than copied into the stylesheet.
 */

export const gridGapBounds = { min: 0, max: 32 } as const

export interface GridContainerInput {
  columns: string
  rows: string
  gap: number
}

export interface GridPlacement {
  label: string
  column: string
  row: string
}

export function clampGridGap(gap: number): number {
  if (!Number.isFinite(gap)) return 0
  return Math.min(gridGapBounds.max, Math.max(gridGapBounds.min, Math.round(gap)))
}

export function buildGridContainerCss(input: GridContainerInput): string {
  const lines = ["display: grid;"]
  const columns = input.columns.trim()
  const rows = input.rows.trim()
  if (columns !== "") lines.push(`grid-template-columns: ${columns};`)
  if (rows !== "") lines.push(`grid-template-rows: ${rows};`)
  lines.push(`gap: ${clampGridGap(input.gap)}px;`)
  return lines.join("\n")
}

export function buildGridPlacementCss(placements: readonly GridPlacement[]): string {
  const lines: string[] = []
  for (const placement of placements) {
    const column = placement.column.trim()
    const row = placement.row.trim()
    if (column !== "" && column !== "auto") {
      lines.push(`/* ${placement.label} */ grid-column: ${column};`)
    }
    if (row !== "" && row !== "auto") {
      lines.push(`/* ${placement.label} */ grid-row: ${row};`)
    }
  }
  return lines.join("\n")
}

export function buildGridCss(
  input: GridContainerInput,
  placements: readonly GridPlacement[],
): string {
  const container = buildGridContainerCss(input)
  const placementLines = buildGridPlacementCss(placements)
  if (placementLines === "") return container
  return `${container}\n${placementLines}`
}
