import { describe, expect, it } from "vitest"
import {
  colorBlindnessTypes,
  formatHexColor,
  formatHexColorUpper,
  getColorBlindnessType,
  parseHexColor,
  simulateColorBlindness,
} from "./color-blindness"

describe("parseHexColor", () => {
  it("parses padded six-digit hex with or without the hash", () => {
    expect(parseHexColor("#4287f5")).toEqual({ r: 66, g: 135, b: 245 })
    expect(parseHexColor("4287f5")).toEqual({ r: 66, g: 135, b: 245 })
    expect(parseHexColor("#4287F5")).toEqual({ r: 66, g: 135, b: 245 })
  })

  it("rejects short, long, and non-hexadecimal input", () => {
    expect(parseHexColor("#4287f")).toBeNull()
    expect(parseHexColor("#4287f55")).toBeNull()
    expect(parseHexColor("#zz87f5")).toBeNull()
    expect(parseHexColor("")).toBeNull()
  })
})

describe("simulateColorBlindness", () => {
  it("maps red through the achromatopsia grayscale weights", () => {
    // Every output channel repeats row 0's weights, so the result is a gray:
    // 0.299·255 = 76.245 rounds to 76 in all three channels.
    expect(simulateColorBlindness(255, 0, 0, "achromatopsia")).toEqual({
      r: 76,
      g: 76,
      b: 76,
    })
  })

  it("maps pure red through the red/green confusion matrices", () => {
    expect(simulateColorBlindness(255, 0, 0, "protanopia")).toEqual({
      r: 145,
      g: 142,
      b: 0,
    })
    expect(simulateColorBlindness(255, 0, 0, "deuteranopia")).toEqual({
      r: 159,
      g: 179,
      b: 0,
    })
  })

  it("maps pure blue through the tritanopia matrix", () => {
    expect(simulateColorBlindness(0, 0, 255, "tritanopia")).toEqual({
      r: 0,
      g: 145,
      b: 134,
    })
  })

  it("keeps white and black unchanged by every matrix", () => {
    for (const type of colorBlindnessTypes) {
      expect(simulateColorBlindness(255, 255, 255, type.id)).toEqual({
        r: 255,
        g: 255,
        b: 255,
      })
      expect(simulateColorBlindness(0, 0, 0, type.id)).toEqual({ r: 0, g: 0, b: 0 })
    }
  })
})

describe("formatHexColor", () => {
  it("produces lowercase padded and uppercase display forms", () => {
    expect(formatHexColor({ r: 66, g: 135, b: 245 })).toBe("#4287f5")
    expect(formatHexColor({ r: 0, g: 15, b: 255 })).toBe("#000fff")
    expect(formatHexColorUpper({ r: 0, g: 15, b: 255 })).toBe("#000FFF")
  })
})

describe("type catalog", () => {
  it("contains the four upstream simulation types in order", () => {
    expect(colorBlindnessTypes.map((type) => type.id)).toEqual([
      "protanopia",
      "deuteranopia",
      "tritanopia",
      "achromatopsia",
    ])
    expect(colorBlindnessTypes.map((type) => type.label)).toEqual([
      "Protanopia",
      "Deuteranopia",
      "Tritanopia",
      "Achromatopsia",
    ])
  })

  it("throws on an unknown type id", () => {
    expect(() => getColorBlindnessType("night-vision")).toThrow(RangeError)
  })
})
