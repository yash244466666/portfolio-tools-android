/**
 * Pure palette extraction from RGBA pixel bytes.
 *
 * Upstream (`components/tools/dev/color-palette-from-image.tsx`) quantized
 * each channel to 32-step buckets and counted occurrences while sampling
 * every fourth pixel. The same algorithm lives here as a pure function with
 * deterministic tie-breaking: upstream's `Object.entries` sort ties were
 * ordered by insertion/quote ordering, so the same image could produce
 * differently ordered palettes across engines. Ties now fall back to the
 * quantized key, and alpha below 128 is skipped so a transparent background
 * cannot dominate the palette.
 */

import { rgbToHex } from "@/tools/color-picker/color-utils"

export const paletteSize = 100
export const defaultPaletteCount = 8
export const maximumPaletteCount = 10

const quantumStep = 32
const maxChannel = 255

function quantizeChannel(value: number): number {
  const quantized = Math.round(value / quantumStep) * quantumStep
  return Math.min(maxChannel, Math.max(0, quantized))
}

export interface PaletteEntry {
  hex: string
  count: number
}

/**
 * Extracts the most common quantized colors from RGBA bytes. Sampling reads
 * every fourth pixel (a 16-byte stride) to bound the counting work; the
 * input must be a multiple of 4 pixels long.
 */
export function extractPalette(
  rgba: Uint8Array | Uint8ClampedArray,
  count = defaultPaletteCount,
): PaletteEntry[] {
  const boundedCount = Math.min(maximumPaletteCount, Math.max(1, Math.floor(count)))
  const counts = new Map<string, number>()
  for (let offset = 0; offset + 3 < rgba.length; offset += 16) {
    const alpha = rgba[offset + 3] ?? 0
    if (alpha < 128) continue
    const key = [
      quantizeChannel(rgba[offset] ?? 0),
      quantizeChannel(rgba[offset + 1] ?? 0),
      quantizeChannel(rgba[offset + 2] ?? 0),
    ].join(",")
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || (left[0] < right[0] ? -1 : 1))
    .slice(0, boundedCount)
    .map(([key, entryCount]) => {
      const [r, g, b] = key.split(",").map((channel) => Number(channel))
      return { hex: rgbToHex({ r: r ?? 0, g: g ?? 0, b: b ?? 0 }), count: entryCount }
    })
}

/** Serializes the palette as CSS custom properties, one per line. */
export function formatPaletteCss(entries: PaletteEntry[]): string {
  return entries.map((entry, index) => `  --color-${index + 1}: ${entry.hex};`).join("\n")
}
