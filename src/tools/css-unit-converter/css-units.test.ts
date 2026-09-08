import { describe, expect, it } from "vitest"
import {
  convertUnit,
  defaultRootFontSize,
  formatUnitValue,
  maximumRootFontSize,
  minimumRootFontSize,
  parseRootFontSize,
  parseUnitValue,
  roundTo,
} from "./css-units"

describe("parseRootFontSize", () => {
  it("accepts numbers and clamps into the 1-72 px range", () => {
    expect(parseRootFontSize("16")).toBe(16)
    expect(parseRootFontSize(" 20.5 ")).toBe(20.5)
    expect(parseRootFontSize("0.5")).toBe(minimumRootFontSize)
    expect(parseRootFontSize("100")).toBe(maximumRootFontSize)
  })

  it("rejects non-finite and junk input", () => {
    expect(parseRootFontSize("")).toBeNull()
    expect(parseRootFontSize("big")).toBeNull()
    expect(parseRootFontSize(Number.NaN.toString())).toBeNull()
  })
})

describe("parseUnitValue", () => {
  it("accepts finite values including negatives and clamps the magnitude", () => {
    expect(parseUnitValue("1.5")).toBe(1.5)
    expect(parseUnitValue("-2")).toBe(-2)
    expect(parseUnitValue("2000000")).toBe(1_000_000)
    expect(parseUnitValue("-2000000")).toBe(-1_000_000)
  })

  it("rejects non-finite input", () => {
    expect(parseUnitValue("")).toBeNull()
    expect(parseUnitValue("12rem")).toBeNull()
    expect(parseUnitValue("Infinity")).toBeNull()
  })
})

describe("convertUnit", () => {
  it("converts px into the other units against a 16 px root", () => {
    expect(convertUnit(16, "px", 16)).toEqual({ px: 16, rem: 1, em: 1, percent: 100 })
    expect(convertUnit(24, "px", 16)).toEqual({ px: 24, rem: 1.5, em: 1.5, percent: 150 })
  })

  it("converts rem, em, and percent into px and back", () => {
    expect(convertUnit(1.5, "rem", 16)?.px).toBe(24)
    expect(convertUnit(2, "em", 12)?.px).toBe(24)
    expect(convertUnit(150, "%", 16)?.px).toBe(24)
    // Bidirectional: converting the px result back matches the source.
    const there = convertUnit(1.5, "rem", 18)
    expect(convertUnit(there?.px ?? 0, "px", 18)?.rem).toBe(1.5)
  })

  it("uses the root size so a different root changes every result", () => {
    expect(convertUnit(1, "rem", 10)?.px).toBe(10)
    expect(convertUnit(1, "rem", 20)?.px).toBe(20)
  })

  it("handles fractional values with three-decimal precision", () => {
    expect(convertUnit(0.0625, "rem", 16)?.px).toBe(1)
    expect(convertUnit(1, "px", 16)?.percent).toBe(6.25)
  })

  it("rejects non-finite values and non-positive roots", () => {
    expect(convertUnit(Number.NaN, "px", 16)).toBeNull()
    expect(convertUnit(16, "px", 0)).toBeNull()
    expect(convertUnit(16, "px", -1)).toBeNull()
  })
})

describe("roundTo and formatUnitValue", () => {
  it("avoids float display noise", () => {
    expect(roundTo(0.1 + 0.2, 3)).toBe(0.3)
    expect(formatUnitValue(0.1 + 0.2)).toBe("0.3")
    expect(formatUnitValue(150)).toBe("150")
  })
})

describe("defaults", () => {
  it("keeps the conventional 16 px default inside the clamp range", () => {
    expect(defaultRootFontSize).toBe(16)
    expect(defaultRootFontSize).toBeGreaterThanOrEqual(minimumRootFontSize)
    expect(defaultRootFontSize).toBeLessThanOrEqual(maximumRootFontSize)
  })
})
