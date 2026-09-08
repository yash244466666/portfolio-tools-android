import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"

/**
 * Pure helpers for the Aspect Ratio Calculator: integer validation, GCD
 * reduction to a simplified ratio, and aspect-preserving scaling. Original
 * work for this repository; no upstream code is copied.
 */

export const minimumDimension = 1
/** Upper bound keeps every computation inside the safe-integer range. */
export const maximumDimension = 1_000_000

/** Greatest common divisor of two positive integers (Euclid). */
export function gcd(a: number, b: number): number {
  let left = a
  let right = b
  while (right !== 0) {
    const next = left % right
    left = right
    right = next
  }
  return left
}

export interface Ratio {
  width: number
  height: number
}

/**
 * Reduces a width/height pair by the GCD. Input must be a positive integer
 * pair (validated by the caller); a zero or non-finite input returns null.
 */
export function simplifyRatio(width: number, height: number): Ratio | null {
  if (!Number.isSafeInteger(width) || width <= 0) return null
  if (!Number.isSafeInteger(height) || height <= 0) return null
  const divisor = gcd(width, height)
  return { width: width / divisor, height: height / divisor }
}

export interface RatioPreset {
  label: string
  width: number
  height: number
}

/** Common display and photo ratios, oldest-first. */
export const commonRatioPresets: readonly RatioPreset[] = [
  { label: "1:1 square", width: 1, height: 1 },
  { label: "4:3 classic display", width: 4, height: 3 },
  { label: "3:2 classic photo", width: 3, height: 2 },
  { label: "16:9 widescreen", width: 16, height: 9 },
  { label: "21:9 ultrawide", width: 21, height: 9 },
  { label: "9:16 portrait video", width: 9, height: 16 },
  { label: "2:3 portrait photo", width: 2, height: 3 },
  { label: "3:4 portrait classic", width: 3, height: 4 },
]

/**
 * Parses a dimension string with the shared bounded policy. Positive
 * integers only, clamped into the supported range with the clamp reported
 * so the UI can disclose the effective value; anything else is invalid
 * (null).
 */
export function parseDimension(value: string): { dimension: number; clamped: boolean } | null {
  const parsed = parseBoundedDecimal(value, {
    minimum: minimumDimension,
    maximum: maximumDimension,
  })
  if (!parsed) return null
  if (!Number.isInteger(parsed.value)) return null
  return { dimension: parsed.value, clamped: parsed.clamped }
}

export type ScaleTargetKind = "width" | "height"

export interface ScaleTarget {
  kind: ScaleTargetKind
  value: number
}

export interface ScaleResult {
  width: number
  height: number
}

/**
 * Scales a ratio so the targeted side becomes `target.value`, preserving the
 * aspect ratio with rounded integer dimensions of at least one pixel.
 */
export function scaledDimensions(
  width: number,
  height: number,
  target: ScaleTarget,
): ScaleResult | null {
  if (target.value < minimumDimension) return null
  if (width <= 0 || height <= 0) return null
  if (target.kind === "width") {
    const scale = target.value / width
    return {
      width: target.value,
      height: Math.max(1, Math.round(height * scale)),
    }
  }
  const scale = target.value / height
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: target.value,
  }
}

/** Formats a ratio as "W:H"; used for headings and screen-reader text. */
export function formatRatio(ratio: Ratio): string {
  return `${ratio.width}:${ratio.height}`
}

/**
 * Builds the accessible text table rows for the scaled result at a few
 * common targets, so the canvas-free result has a text equivalent.
 */
export function scaledTableRows(
  width: number,
  height: number,
  target: ScaleTarget,
): Array<{ label: string; width: number; height: number }> {
  const direct = scaledDimensions(width, height, target)
  if (!direct) return []
  const rows = [
    {
      label: target.kind === "width" ? `Width ${target.value}` : `Height ${target.value}`,
      width: direct.width,
      height: direct.height,
    },
  ]
  const otherKind: ScaleTargetKind = target.kind === "width" ? "height" : "width"
  const mirror = scaledDimensions(width, height, { kind: otherKind, value: target.value })
  if (mirror) {
    rows.push({
      label: otherKind === "width" ? `Width ${target.value}` : `Height ${target.value}`,
      width: mirror.width,
      height: mirror.height,
    })
  }
  return rows
}
