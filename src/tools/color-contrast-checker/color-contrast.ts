/**
 * WCAG contrast evaluation for the Color Contrast Checker, built on the
 * established shared color utilities in `src/tools/color-picker/color-utils.ts`
 * (hex parsing, relative luminance, exact contrast ratio) so the WCAG
 * machinery is never duplicated. Original work for this repository; no
 * upstream code is copied.
 */
import {
  getContrastRatio,
  hexToRgb as parseHexToRgb,
  rgbToHex,
  type RgbColor,
} from "@/tools/color-picker/color-utils"

export const minimumHexCharacters = 3
export const maximumHexCharacters = 6

export type Rgb = RgbColor

/**
 * Strict hex parser: 3 or 6 hex digits, with or without the leading "#".
 * Anything else (names, rgb() functions, out-of-gamut digits) is rejected.
 * Delegates the digit parsing to the shared color utilities.
 */
export function parseHexColor(value: string): Rgb | null {
  const trimmed = value.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) return null
  if (trimmed.length !== 3 && trimmed.length !== 6) return null
  return parseHexToRgb(`#${trimmed}`)
}

/** Formats an RGB triple back to canonical lowercase #rrggbb form. */
export function formatHexColor(color: Rgb): string {
  return rgbToHex(color)
}

/** The exact WCAG contrast ratio between two colors (unrounded). */
export function contrastRatio(first: Rgb, second: Rgb): number {
  return getContrastRatio(first, second)
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

/**
 * A threshold passes only when the EXACT (unrounded) ratio meets its
 * minimum. Conformance is claimed on the real ratio; the UI displays the
 * 2-decimal rendering separately. This keeps a 4.497:1 contrast from
 * passing AA normal on the strength of a rounded "4.5:1" display.
 */
export function thresholdPasses(ratio: number, threshold: ContrastThreshold): boolean {
  return ratio >= threshold.minimumRatio
}

/** Swaps the two colors (palette-swap). */
export function swapColors(first: Rgb, second: Rgb): [Rgb, Rgb] {
  return [second, first]
}
