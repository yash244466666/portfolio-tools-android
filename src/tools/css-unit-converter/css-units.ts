/**
 * Pure CSS unit conversion for the CSS Unit Converter: px, rem, em, and
 * percent against a user-set root font size. Percent and em are font-size
 * relative units; this tool computes both against the root font size, which
 * is the standard convention for root-relative sizing and is disclosed in
 * the interface (em therefore equals rem here; inside an element with its
 * own font size, em differs). Original work for this repository; no
 * upstream code is copied.
 */
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"

export const minimumRootFontSize = 1
export const maximumRootFontSize = 72
export const defaultRootFontSize = 16

export type CssUnit = "px" | "rem" | "em" | "%"

export const cssUnits: readonly CssUnit[] = ["px", "rem", "em", "%"]

/**
 * Parses a root font size with the shared bounded policy, clamped into the
 * 1-72 px range. Returns null for empty, malformed, or non-finite input.
 */
export function parseRootFontSize(value: string): number | null {
  return (
    parseBoundedDecimal(value, {
      minimum: minimumRootFontSize,
      maximum: maximumRootFontSize,
    })?.value ?? null
  )
}

/** Upper magnitude bound keeps every conversion inside the safe range. */
export const maximumMagnitude = 1_000_000

/** Parses a bounded finite conversion value; null when malformed. */
export function parseUnitValue(value: string): number | null {
  return (
    parseBoundedDecimal(value, {
      minimum: -maximumMagnitude,
      maximum: maximumMagnitude,
    })?.value ?? null
  )
}

export interface UnitConversions {
  px: number
  rem: number
  em: number
  percent: number
}

/** Rounds to `digits` decimal places with epsilon protection. */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

/**
 * Converts one unit value into all four units against the root font size.
 * `px = rem * root`; em uses the root font size as its basis (so em equals
 * rem here — the interface states the caveat); `100% = root` in font-size
 * contexts.
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
    case "em":
      px = value * rootFontSize
      break
    case "%":
      px = (value / 100) * rootFontSize
      break
    default:
      return null
  }
  const rootRelative = roundTo(px / rootFontSize, 3)
  return {
    px: roundTo(px, 3),
    rem: rootRelative,
    // em is computed against the root font size, so it matches rem here;
    // the interface discloses that an element's own font size would differ.
    em: rootRelative,
    percent: roundTo((px / rootFontSize) * 100, 3),
  }
}

/** Formats a converted value for display; never shows raw float noise. */
export function formatUnitValue(value: number): string {
  return String(roundTo(value, 3))
}
