/**
 * Pure flexbox container CSS generation.
 *
 * Upstream built the declaration inline from component state; extracting it
 * here lets unit tests assert exact CSS output as an independent oracle. The
 * flex-basis text input is also normalized: upstream interpolated arbitrary
 * text straight into an inline style, so any string could reach a CSS
 * property. Only `auto`, `0`, a bounded pixel value, or a bounded percentage
 * survive; anything else falls back to `auto`.
 */

export const flexDirectionOptions = ["row", "row-reverse", "column", "column-reverse"] as const
export type FlexDirection = (typeof flexDirectionOptions)[number]

export const justifyContentOptions = [
  "flex-start",
  "flex-end",
  "center",
  "space-between",
  "space-around",
  "space-evenly",
] as const
export type JustifyContent = (typeof justifyContentOptions)[number]

export const alignItemsOptions = [
  "stretch",
  "flex-start",
  "flex-end",
  "center",
  "baseline",
] as const
export type AlignItems = (typeof alignItemsOptions)[number]

export const flexWrapOptions = ["nowrap", "wrap", "wrap-reverse"] as const
export type FlexWrap = (typeof flexWrapOptions)[number]

export const flexGapBounds = { min: 0, max: 32 } as const
export const flexFactorBounds = { min: 0, max: 5 } as const
export const maximumFlexBasisLength = 4

export interface FlexContainerInput {
  direction: FlexDirection
  justifyContent: JustifyContent
  alignItems: AlignItems
  flexWrap: FlexWrap
  gap: number
}

export interface FlexItemInput {
  id: string
  label: string
  flexGrow: number
  flexShrink: number
  flexBasis: string
}

export function clampFlexGap(gap: number): number {
  if (!Number.isFinite(gap)) return 0
  return Math.min(flexGapBounds.max, Math.max(flexGapBounds.min, Math.round(gap)))
}

export function clampFlexFactor(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(flexFactorBounds.max, Math.max(flexFactorBounds.min, Math.round(value)))
}

export function buildFlexContainerCss(input: FlexContainerInput): string {
  return [
    "display: flex;",
    `flex-direction: ${input.direction};`,
    `justify-content: ${input.justifyContent};`,
    `align-items: ${input.alignItems};`,
    `flex-wrap: ${input.flexWrap};`,
    `gap: ${clampFlexGap(input.gap)}px;`,
  ].join("\n")
}

export function createFlexItem(id: number): FlexItemInput {
  return {
    id: `flex-item-${id}`,
    label: `Item ${id}`,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
  }
}

export function normalizeFlexBasis(value: string): string {
  const trimmed = value.trim().toLowerCase()
  if (trimmed === "" || trimmed === "auto") return "auto"
  if (trimmed === "0" || trimmed === "0px") return "0"
  if (trimmed.endsWith("px")) {
    const parsed = Number(trimmed.slice(0, -2))
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000) return `${parsed}px`
  }
  if (trimmed.endsWith("%")) {
    const parsed = Number(trimmed.slice(0, -1))
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 100) return `${parsed}%`
  }
  return "auto"
}
