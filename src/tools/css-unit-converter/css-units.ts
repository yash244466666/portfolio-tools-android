/**
 * Pure CSS unit conversion for the CSS Unit Converter: px, rem, em, and
 * percent against a user-set root font size. Percent and em are font-size
 * relative units; this tool computes both against the root font size, which
 * is the standard convention for root-relative sizing and is disclosed in the
 * interface. Original work for this repository; no upstream code is copied.
 */

export const minimumRootFontSize = 1
export const maximumRootFontSize = 72
export const defaultRootFontSize = 16

export type CssUnit = "px" | "rem" | "em" | "%"

export const cssUnits: readonly CssUnit[] = ["px", "rem", "em", "%"]

/**
 * Parses a root font size, clamped into the 1-72 px range. Returns null for
 * non-finite or non-numeric input.
 */
export function parseRootFontSize(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(maximumRootFontSize, Math.max(minimumRootFontSize, parsed))
}

/**
 * Parses a bounded finite conversion value. Returns null for non-finite
 * input; magnitudes above the safe display bound clamp to it.
 */
export const maximumMagnitude = 1_000_000

export function parseUnitValue(value: string): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(maximumMagnitude, Math.max(-maximumMagnitude, parsed))
}

export interface UnitConversions {
  px: number
  rem: number
  em: number
  percent: number
}

/**
 * Converts one unit value into all four units against the root font size.
 * `px = rem * root`, `em` uses the root font size as its basis, and
 * `100% = root` in font-size contexts.
 */
export function convertUnit(
  value: number,
  from: CssUnit,
  rootFontSize: number,
): UnitConversions | null {
  if (!Number.isFinite(value)) return null
  if (!Number.isFinite(rootFontSize) || rootFontSize <= 0) return null
  let px: number
  switch (from) {
    case "px":
      px = value
      break
    case "rem":
      px = value * rootFontSize
      break
    case "em":
      px = value * rootFontSize
      break
    case "%":
      px = (value / 100) * rootFontSize
      break
    default:
      return null
  }
  return {
    px: roundTo(px, 3),
    rem: roundTo(px / rootFontSize, 3),
    em: roundTo(px / rootFontSize, 3),
    percent: roundTo((px / rootFontSize) * 100, 3),
  }
}

/** Rounds to `digits` decimal places with epsilon protection. */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/** Formats a converted value for display; never shows raw float noise. */
export function formatUnitValue(value: number): string {
  return String(roundTo(value, 3))
}
