import { describe, expect, it } from "vitest"
import {
  commonRatioPresets,
  formatRatio,
  gcd,
  maximumDimension,
  parseDimension,
  scaledDimensions,
  scaledTableRows,
  simplifyRatio,
} from "./aspect-ratio"

describe("gcd", () => {
  it("reduces pairs by their greatest common divisor", () => {
    expect(gcd(1920, 1080)).toBe(120)
    expect(gcd(16, 9)).toBe(1)
    expect(gcd(7, 7)).toBe(7)
    expect(gcd(100, 10)).toBe(10)
  })
})

describe("simplifyRatio", () => {
  it("reduces to the smallest whole pair", () => {
    expect(simplifyRatio(1920, 1080)).toEqual({ width: 16, height: 9 })
    expect(simplifyRatio(1080, 1920)).toEqual({ width: 9, height: 16 })
    expect(simplifyRatio(640, 480)).toEqual({ width: 4, height: 3 })
  })

  it("rejects zero, negative, and non-integer dimensions", () => {
    expect(simplifyRatio(0, 100)).toBeNull()
    expect(simplifyRatio(100, 0)).toBeNull()
    expect(simplifyRatio(-4, 3)).toBeNull()
    expect(simplifyRatio(10.5, 3)).toBeNull()
    expect(simplifyRatio(Number.NaN, 3)).toBeNull()
  })
})

describe("parseDimension", () => {
  it("accepts positive integers and clamps to the supported range", () => {
    expect(parseDimension("1920")).toEqual({ dimension: 1920, clamped: false })
    expect(parseDimension(" 8 ")).toEqual({ dimension: 8, clamped: false })
    expect(parseDimension(`${maximumDimension + 1}`)).toEqual({
      dimension: maximumDimension,
      clamped: true,
    })
  })

  it("rejects zero, negatives, decimals, and junk (shared strict grammar)", () => {
    // Zero clamps up to the 1 px floor and is disclosed as a clamp.
    expect(parseDimension("0")).toEqual({ dimension: 1, clamped: true })
    expect(parseDimension("-10")).toEqual({ dimension: 1, clamped: true })
    expect(parseDimension("10.5")).toBeNull()
    expect(parseDimension("12px")).toBeNull()
    expect(parseDimension("")).toBeNull()
    // Astronomic values clamp to the ceiling and are disclosed.
    expect(parseDimension("99999999999999999999")).toEqual({
      dimension: maximumDimension,
      clamped: true,
    })
    expect(parseDimension("1e3")).toBeNull()
    expect(parseDimension("+8")).toBeNull()
  })
})

describe("scaledDimensions", () => {
  it("scales from a target width and from a target height", () => {
    expect(scaledDimensions(1920, 1080, { kind: "width", value: 1280 })).toEqual({
      width: 1280,
      height: 720,
    })
    expect(scaledDimensions(1920, 1080, { kind: "height", value: 720 })).toEqual({
      width: 1280,
      height: 720,
    })
  })

  it("rounds the derived side and keeps at least one pixel", () => {
    expect(scaledDimensions(3, 2, { kind: "width", value: 5 })).toEqual({ width: 5, height: 3 })
    expect(scaledDimensions(9, 16, { kind: "height", value: 1 })).toEqual({
      width: 1,
      height: 1,
    })
  })

  it("rejects zero-size ratios and sub-one targets", () => {
    expect(scaledDimensions(0, 9, { kind: "width", value: 10 })).toBeNull()
    expect(scaledDimensions(16, 9, { kind: "width", value: 0 })).toBeNull()
  })
})

describe("scaledTableRows", () => {
  it("returns rows for the targeted and mirrored side", () => {
    const rows = scaledTableRows(1920, 1080, { kind: "width", value: 1280 })
    expect(rows).toEqual([
      { label: "Width 1280", width: 1280, height: 720 },
      { label: "Height 1280", width: 2276, height: 1280 },
    ])
  })
})

describe("commonRatioPresets", () => {
  it("holds valid ratios with unique industry labels", () => {
    for (const preset of commonRatioPresets) {
      // Every preset reduces to a valid simplified pair; the 21:9 ultrawide
      // entry intentionally keeps the industry label rather than 7:3.
      expect(simplifyRatio(preset.width, preset.height)).not.toBeNull()
    }
    expect(new Set(commonRatioPresets.map((preset) => preset.label)).size).toBe(
      commonRatioPresets.length,
    )
    expect(formatRatio({ width: 16, height: 9 })).toBe("16:9")
  })
})
