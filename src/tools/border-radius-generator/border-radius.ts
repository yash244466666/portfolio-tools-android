export interface BorderRadiusValues {
  topLeft: number
  topRight: number
  bottomRight: number
  bottomLeft: number
}

export interface BorderRadiusUnit {
  id: "px" | "%" | "rem"
  label: string
  max: number
}

export const borderRadiusUnits: readonly BorderRadiusUnit[] = [
  { id: "px", label: "px", max: 100 },
  { id: "%", label: "%", max: 50 },
  { id: "rem", label: "rem", max: 10 },
]

export function getBorderRadiusUnit(unitId: string): BorderRadiusUnit {
  return borderRadiusUnits.find((unit) => unit.id === unitId) ?? borderRadiusUnits[0]!
}

export const defaultBorderRadiusValues: BorderRadiusValues = {
  topLeft: 16,
  topRight: 16,
  bottomRight: 16,
  bottomLeft: 16,
}

/** Clamps a corner value into the valid range of its unit. */
export function clampBorderRadiusValue(value: number, unit: BorderRadiusUnit): number {
  return Math.min(Math.max(value, 0), unit.max)
}

const cornersInCssOrder = (values: BorderRadiusValues): [number, number, number, number] => [
  values.topLeft,
  values.topRight,
  values.bottomRight,
  values.bottomLeft,
]

/**
 * Builds the `border-radius` declaration, collapsing to the single-value
 * shorthand when all four corners match.
 */
export function buildBorderRadiusDeclaration(
  values: BorderRadiusValues,
  unit: BorderRadiusUnit,
): string {
  const [topLeft, topRight, bottomRight, bottomLeft] = cornersInCssOrder(values)
  const { label } = unit
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return `border-radius: ${topLeft}${label};`
  }
  return `border-radius: ${topLeft}${label} ${topRight}${label} ${bottomRight}${label} ${bottomLeft}${label};`
}

/** The React inline style for the live preview. */
export function buildBorderRadiusPreviewStyle(
  values: BorderRadiusValues,
  unit: BorderRadiusUnit,
): React.CSSProperties {
  const [topLeft, topRight, bottomRight, bottomLeft] = cornersInCssOrder(values)
  const { id } = unit
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return { borderRadius: `${topLeft}${id}` }
  }
  return {
    borderTopLeftRadius: `${topLeft}${id}`,
    borderTopRightRadius: `${topRight}${id}`,
    borderBottomRightRadius: `${bottomRight}${id}`,
    borderBottomLeftRadius: `${bottomLeft}${id}`,
  }
}
