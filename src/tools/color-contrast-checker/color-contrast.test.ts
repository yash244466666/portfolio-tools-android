import { describe, expect, it } from "vitest"
import {
  contrastRatio,
  contrastThresholds,
  formatHexColor,
  formatRatio,
  parseHexColor,
  relativeLuminance,
  swapColors,
  thresholdPasses,
} from "./color-contrast"

describe("parseHexColor", () => {
  it("accepts 3- and 6-digit hex with or without the hash", () => {
    expect(parseHexColor("#000000")).toEqual({ red: 0, green: 0, blue: 0 })
    expect(parseHexColor("FFFFFF")).toEqual({ red: 255, green: 255, blue: 255 })
    expect(parseHexColor("#1a2B3c")).toEqual({ red: 0x1a, green: 0x2b, blue: 0x3c })
    expect(parseHexColor("#fff")).toEqual({ red: 255, green: 255, blue: 255 })
    expect(parseHexColor("0F0")).toEqual({ red: 0, green: 255, blue: 0 })
  })

  it("rejects names, functions, and malformed input", () => {
    expect(parseHexColor("white")).toBeNull()
    expect(parseHexColor("rgb(0,0,0)")).toBeNull()
    expect(parseHexColor("#ffff")).toBeNull()
    expect(parseHexColor("#fffff")).toBeNull()
    expect(parseHexColor("#00000g")).toBeNull()
    expect(parseHexColor("")).toBeNull()
  })

  it("formats back to canonical lowercase form", () => {
    expect(formatHexColor({ red: 0x1a, green: 0x2b, blue: 0x3c })).toBe("#1a2b3c")
  })
})

describe("relativeLuminance", () => {
  it("returns 0 for black and 1 for white", () => {
    expect(relativeLuminance({ red: 0, green: 0, blue: 0 })).toBe(0)
    expect(relativeLuminance({ red: 255, green: 255, blue: 255 })).toBeCloseTo(1, 5)
  })

  it("matches the published WCAG vector for a mid gray", () => {
    // #808080: 128/255 = 0.50196 > 0.04045 -> ((0.50196+0.055)/1.055)^2.4
    const luminance = relativeLuminance({ red: 128, green: 128, blue: 128 })
    expect(luminance).toBeCloseTo(0.21586, 4)
  })

  it("applies the piecewise curve below the threshold", () => {
    // 10/255 = 0.039216 <= 0.04045 -> linear branch: /12.92.
    const luminance = relativeLuminance({ red: 10, green: 0, blue: 0 })
    const expected = (10 / 255 / 12.92) * 0.2126
    expect(luminance).toBeCloseTo(expected, 8)
  })
})

describe("contrastRatio", () => {
  it("gives 1:1 for identical colors and 21:1 for black on white", () => {
    const same = contrastRatio(
      { red: 128, green: 128, blue: 128 },
      { red: 128, green: 128, blue: 128 },
    )
    expect(formatRatio(same)).toBe(1)
    const blackWhite = contrastRatio(
      { red: 0, green: 0, blue: 0 },
      { red: 255, green: 255, blue: 255 },
    )
    expect(formatRatio(blackWhite)).toBe(21)
  })

  it("is symmetric in argument order", () => {
    const a = { red: 255, green: 255, blue: 255 }
    const b = { red: 119, green: 119, blue: 119 }
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a))
  })

  it("matches the published WCAG example (#777 on white is 4.48:1)", () => {
    const ratio = contrastRatio(
      { red: 255, green: 255, blue: 255 },
      { red: 119, green: 119, blue: 119 },
    )
    expect(formatRatio(ratio)).toBe(4.48)
  })
})

describe("thresholdPasses", () => {
  it("applies the WCAG 2.2 targets to the displayed ratio", () => {
    // 4.48:1 passes AA large (3:1) but fails AA normal (4.5:1).
    const aaNormal = contrastThresholds.find((t) => t.key === "aa-normal")
    const aaLarge = contrastThresholds.find((t) => t.key === "aa-large")
    expect(thresholdPasses(4.48, aaNormal!)).toBe(false)
    expect(thresholdPasses(4.48, aaLarge!)).toBe(true)
  })

  it("uses the displayed (2-decimal) ratio, so 4.5 passes AA normal", () => {
    const aaNormal = contrastThresholds.find((t) => t.key === "aa-normal")
    expect(thresholdPasses(4.5, aaNormal!)).toBe(true)
  })
})

describe("swapColors", () => {
  it("exchanges the two colors", () => {
    const [first, second] = swapColors(
      { red: 0, green: 0, blue: 0 },
      { red: 255, green: 255, blue: 255 },
    )
    expect(first).toEqual({ red: 255, green: 255, blue: 255 })
    expect(second).toEqual({ red: 0, green: 0, blue: 0 })
  })
})
