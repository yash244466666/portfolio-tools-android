/**
 * Pure WCAG 2.2 contrast computation for the Color Contrast Checker.
 * Original work for this repository; no upstream code is copied.
 *
 * The sRGB math is the normative WCAG 2.2 relative-luminance definition:
 * 8-bit channels linearize through the standard piecewise curve
 * (c/12.92 up to the 0.04045 threshold, ((c+0.055)/1.055)^2.4 above) and
 * combine with the 0.2126/0.7152/0.0722 coefficients.
 */

export const minimumHexCharacters = 3
export const maximumHexCharacters = 6

export interface Rgb {
  red: number
  green: number
  blue: number
}

/**
 * Strict hex parser: 3 or 6 hex digits, with or without the leading "#".
 * Anything else (names, rgb() functions, out-of-gamut digits) is rejected.
 */
export function parseHexColor(value: string): Rgb | null {
  const trimmed = value.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null
  if (trimmed.length === 3) {
    const expanded = [...trimmed].map((digit) => digit + digit).join("")
    return hexToRgb(expanded)
  }
  if (trimmed.length !== 6) return null
  return hexToRgb(trimmed)
}

function hexToRgb(hex: string): Rgb {
  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16),
  }
}

/** Formats an RGB triple back to canonical lowercase #rrggbb form. */
export function formatHexColor(color: Rgb): string {
  const hex = (channel: number) => channel.toString(16).padStart(2, "0")
  return `#${hex(color.red)}${hex(color.green)}${hex(color.blue)}`
}

/** WCAG 2.2 relative luminance of an 8-bit sRGB color. */
export function relativeLuminance(color: Rgb): number {
  const linearize = (channel: number): number => {
    const normalized = channel / 255
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
  }
  return (
    0.2126 * linearize(color.red) + 0.7152 * linearize(color.green) + 0.0722 * linearize(color.blue)
  )
}

/** WCAG contrast ratio between two colors, (L1 + 0.05) / (L2 + 0.05), L1 lighter. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const l1 = relativeLuminance(first)
  const l2 = relativeLuminance(second)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

/** The ratio rounded to the 2 decimals the UI displays. */
export function formatRatio(ratio: number): number {
  return Math.round(ratio * 100) / 100
}

export interface ContrastThreshold {
  key: string
  label: string
  minimumRatio: number
}

/** The WCAG 2.2 conformance targets the tool reports, in strictest-first order. */
export const contrastThresholds: readonly ContrastThreshold[] = [
  { key: "aaa-normal", label: "AAA normal text", minimumRatio: 7 },
  { key: "aaa-large", label: "AAA large text", minimumRatio: 4.5 },
  { key: "aa-normal", label: "AA normal text", minimumRatio: 4.5 },
  { key: "aa-large", label: "AA large text", minimumRatio: 3 },
]

/** A threshold passes when the (2-decimal) displayed ratio meets its minimum. */
export function thresholdPasses(ratio: number, threshold: ContrastThreshold): boolean {
  return formatRatio(ratio) >= threshold.minimumRatio
}

/** Swaps the two colors (palette-swap). */
export function swapColors(first: Rgb, second: Rgb): [Rgb, Rgb] {
  return [second, first]
}
