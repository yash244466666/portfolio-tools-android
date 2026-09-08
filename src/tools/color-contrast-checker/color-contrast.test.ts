import { describe, expect, it } from "vitest"
import {
  contrastRatio,
  contrastThresholds,
  formatHexColor,
  formatRatio,
  parseHexColor,
  swapColors,
  thresholdPasses,
} from "./color-contrast"

describe("parseHexColor", () => {
  it("accepts 3- and 6-digit hex with or without the hash", () => {
    expect(parseHexColor("#000000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseHexColor("FFFFFF")).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHexColor("#1a2B3c")).toEqual({ r: 0x1a, g: 0x2b, b: 0x3c })
    expect(parseHexColor("#fff")).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHexColor("0F0")).toEqual({ r: 0, g: 255, b: 0 })
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
    expect(formatHexColor({ r: 0x1a, g: 0x2b, b: 0x3c })).toBe("#1a2b3c")
  })
})

describe("contrastRatio (exact, shared WCAG math)", () => {
  it("gives 1:1 for identical colors and 21:1 for black on white", () => {
    const same = contrastRatio({ r: 128, g: 128, b: 128 }, { r: 128, g: 128, b: 128 })
    expect(formatRatio(same)).toBe(1)
    const blackWhite = contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })
    expect(formatRatio(blackWhite)).toBe(21)
  })

  it("is symmetric in argument order", () => {
    const a = { r: 255, g: 255, b: 255 }
    const b = { r: 119, g: 119, b: 119 }
    expect(contrastRatio(a, b)).toBe(contrastRatio(b, a))
  })

  it("matches the published WCAG example (#777 on white is 4.48:1)", () => {
    const ratio = contrastRatio({ r: 255, g: 255, b: 255 }, { r: 119, g: 119, b: 119 })
    expect(formatRatio(ratio)).toBe(4.48)
  })
})

describe("thresholdPasses", () => {
  it("judges the EXACT ratio, not the 2-decimal display", () => {
    const aaNormal = contrastThresholds.find((t) => t.key === "aa-normal")!
    // 4.497 displays as "4.5:1" but must FAIL AA normal (4.5 minimum).
    expect(formatRatio(4.497)).toBe(4.5)
    expect(thresholdPasses(4.497, aaNormal)).toBe(false)
    // 4.5 exact passes.
    expect(thresholdPasses(4.5, aaNormal)).toBe(true)
  })

  it("applies the WCAG 2.2 targets across the table", () => {
    const byKey = new Map(contrastThresholds.map((t) => [t.key, t]))
    const aaaNormal = byKey.get("aaa-normal")!
    const aaLarge = byKey.get("aa-large")!
    expect(thresholdPasses(4.48, aaaNormal)).toBe(false)
    expect(thresholdPasses(4.48, aaLarge)).toBe(true)
  })
})

describe("swapColors", () => {
  it("exchanges the two colors", () => {
    const [first, second] = swapColors({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })
    expect(first).toEqual({ r: 255, g: 255, b: 255 })
    expect(second).toEqual({ r: 0, g: 0, b: 0 })
  })
})
