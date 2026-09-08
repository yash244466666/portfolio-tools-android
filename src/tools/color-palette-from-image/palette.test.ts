import { describe, expect, it } from "vitest"
import { extractPalette, formatPaletteCss, maximumPaletteCount, type PaletteEntry } from "./palette"

/** Builds an RGBA buffer from [r, g, b, a] quadruples. */
function rgba(pixels: Array<[number, number, number, number]>): Uint8Array {
  const bytes = new Uint8Array(pixels.length * 4)
  pixels.forEach((pixel, index) => {
    bytes[index * 4] = pixel[0]
    bytes[index * 4 + 1] = pixel[1]
    bytes[index * 4 + 2] = pixel[2]
    bytes[index * 4 + 3] = pixel[3]
  })
  return bytes
}

const red: [number, number, number, number] = [200, 10, 10, 255]
const blue: [number, number, number, number] = [10, 10, 200, 255]

describe("extractPalette", () => {
  it("returns the most frequent quantized color first", () => {
    // Sampling reads every fourth pixel, so the arrangement matters.
    const pixels = rgba([
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      blue,
      blue,
      blue,
      blue,
    ])
    const palette = extractPalette(pixels)
    expect(palette[0]?.hex).toBe("#c00000")
    expect(palette[0]?.count).toBe(3)
    expect(palette[1]?.hex).toBe("#0000c0")
  })

  it("quantizes channels to 32-step buckets", () => {
    // 130 rounds to 4*32 = 128; 255 clamps to 255 (8*32 = 256 > 255).
    const pixels = rgba([[130, 255, 64, 255]])
    expect(extractPalette(pixels)[0]?.hex).toBe("#80ff40")
  })

  it("samples every fourth pixel, skipping pixels between strides", () => {
    // Red occupies all sampled offsets (0, 4, 8, 12); interleaved blue never lands on one.
    const pixels = rgba([
      red,
      blue,
      red,
      blue,
      red,
      blue,
      red,
      blue,
      red,
      blue,
      red,
      blue,
      red,
      blue,
      red,
      blue,
    ])
    const palette = extractPalette(pixels)
    expect(palette).toHaveLength(1)
    expect(palette[0]?.hex).toBe("#c00000")
    expect(palette[0]?.count).toBe(4)
  })

  it("skips transparent pixels so a clear background cannot dominate", () => {
    const transparent: [number, number, number, number] = [0, 0, 0, 0]
    const white: [number, number, number, number] = [255, 255, 255, 255]
    const pixels = rgba([
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      transparent,
      white,
      white,
      white,
      white,
    ])
    expect(extractPalette(pixels)[0]?.hex).toBe("#ffffff")
  })

  it("breaks count ties deterministically by quantized key", () => {
    const pixels = rgba([
      blue,
      blue,
      blue,
      blue,
      blue,
      blue,
      blue,
      blue,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
      red,
    ])
    const hexes = extractPalette(pixels).map((entry: PaletteEntry) => entry.hex)
    expect(hexes).toEqual(["#0000c0", "#c00000"])
  })

  it("clamps the requested count into the supported range", () => {
    // 16 sampled positions each carrying one of 16 distinct exact 64-step colors.
    const pixels = new Uint8Array(16 * 16)
    for (let k = 0; k < 16; k++) {
      const offset = k * 16
      pixels[offset] = (k % 4) * 64
      pixels[offset + 1] = Math.floor(k / 4) * 64
      pixels[offset + 3] = 255
    }
    expect(extractPalette(pixels, 0)).toHaveLength(1)
    expect(extractPalette(pixels, 2)).toHaveLength(2)
    expect(extractPalette(pixels, 500)).toHaveLength(maximumPaletteCount)
  })

  it("returns an empty palette for empty input", () => {
    expect(extractPalette(new Uint8Array(0))).toEqual([])
  })
})

describe("formatPaletteCss", () => {
  it("serializes one custom property per color", () => {
    const css = formatPaletteCss([
      { hex: "#ff0000", count: 3 },
      { hex: "#00ff00", count: 1 },
    ])
    expect(css).toBe("  --color-1: #ff0000;\n  --color-2: #00ff00;")
  })
})
