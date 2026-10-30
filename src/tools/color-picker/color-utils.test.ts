import {
  buildHarmonyPalette,
  evaluateContrast,
  getContrastRatio,
  hexToRgb,
  hslToHex,
  hslToRgb,
  rgbToHex,
  rgbToHsl,
} from "./color-utils"

describe("hexToRgb", () => {
  it("parses six-digit hex", () => {
    expect(hexToRgb("#FF8800")).toEqual({ r: 255, g: 136, b: 0 })
    expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 })
  })

  it("expands three-digit hex", () => {
    expect(hexToRgb("#0AF")).toEqual({ r: 0, g: 170, b: 255 })
    expect(hexToRgb("#000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb("#FFF")).toEqual({ r: 255, g: 255, b: 255 })
  })

  it("rejects malformed colors", () => {
    expect(hexToRgb("")).toBeNull()
    expect(hexToRgb("#12")).toBeNull()
    expect(hexToRgb("#12345")).toBeNull()
    expect(hexToRgb("#1234567")).toBeNull()
    expect(hexToRgb("#GGGGGG")).toBeNull()
    expect(hexToRgb("blue")).toBeNull()
    expect(hexToRgb("#12345 ")).toBeNull()
  })
})

describe("rgbToHex", () => {
  it("formats and clamps channels", () => {
    expect(rgbToHex({ r: 255, g: 136, b: 0 })).toBe("#ff8800")
    expect(rgbToHex({ r: 0, g: 170, b: 255 })).toBe("#00aaff")
    expect(rgbToHex({ r: 300, g: -4, b: 12.6 })).toBe("#ff000d")
  })
})

describe("rgbToHsl", () => {
  it("matches reference conversions", () => {
    // #ff0000 -> hsl(0, 100%, 50%)
    expect(rgbToHsl({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, l: 50 })
    // #00ff00 -> hsl(120, 100%, 50%)
    expect(rgbToHsl({ r: 0, g: 255, b: 0 })).toEqual({ h: 120, s: 100, l: 50 })
    // #000080 -> hsl(240, 100%, 25%)
    expect(rgbToHsl({ r: 0, g: 0, b: 128 })).toEqual({ h: 240, s: 100, l: 25 })
    // #808080 -> hsl(0, 0%, 50%)
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
  })

  it("reports hue 0 for greys", () => {
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl({ r: 0, g: 0, b: 0 })).toEqual({ h: 0, s: 0, l: 0 })
  })

  it("rounds exact half hue and saturation values up", () => {
    // 207.5 exactly, but the formula lands at 207.49999999999997; CSS says
    // the hue is 207.5, so half-up gives 208.
    expect(rgbToHsl({ r: 0, g: 39, b: 72 }).h).toBe(208)
    // 87.5% exactly, stored as 87.49999999999999.
    expect(rgbToHsl({ r: 7, g: 7, b: 105 }).s).toBe(88)
  })

  it("normalizes a rounded hue of 360 to 0", () => {
    // #ff0001 has an exact hue of 359.7647…, which rounds to 360; the tool's
    // H input is 0–359, so the readout must wrap.
    expect(rgbToHsl({ r: 255, g: 0, b: 1 }).h).toBe(0)
  })
})

describe("hslToRgb", () => {
  it("round-trips reference colors", () => {
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(hslToRgb({ h: 120, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 0 })
    expect(hslToRgb({ h: 240, s: 100, l: 25 })).toEqual({ r: 0, g: 0, b: 128 })
    expect(hslToRgb({ h: 300, s: 0, l: 50 })).toEqual({ r: 128, g: 128, b: 128 })
  })

  it("wraps negative and overflowing hues", () => {
    expect(hslToRgb({ h: -180, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 255 })
    expect(hslToRgb({ h: 540, s: 100, l: 50 })).toEqual({ r: 0, g: 255, b: 255 })
  })

  it("rounds exact half channels the way CSS does", () => {
    // hsl(210,100%,50%) is rgb(0,128,255); the raw green channel is
    // 127.49999999999989.
    expect(hslToRgb({ h: 210, s: 100, l: 50 })).toEqual({ r: 0, g: 128, b: 255 })
    // hsl(0,75%,60%) is rgb(230,77,77); green/blue land at 76.49999999999996.
    expect(hslToRgb({ h: 0, s: 75, l: 60 })).toEqual({ r: 230, g: 77, b: 77 })
  })
})

describe("hslToHex", () => {
  it("converts directly", () => {
    expect(hslToHex({ h: 180, s: 100, l: 50 })).toBe("#00ffff")
    expect(hslToHex({ h: 0, s: 0, l: 100 })).toBe("#ffffff")
  })
})

describe("contrast", () => {
  it("gives black on white the maximum ratio", () => {
    expect(getContrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBeCloseTo(21, 5)
    expect(getContrastRatio({ r: 255, g: 255, b: 255 }, { r: 0, g: 0, b: 0 })).toBeCloseTo(21, 5)
  })

  it("is order-independent", () => {
    expect(getContrastRatio({ r: 255, g: 136, b: 0 }, { r: 17, g: 17, b: 17 })).toBeCloseTo(
      getContrastRatio({ r: 17, g: 17, b: 17 }, { r: 255, g: 136, b: 0 }),
      10,
    )
  })

  it("matches published WCAG reference values", () => {
    const evaluate = (a: string, b: string) => {
      const verdict = evaluateContrast(a, b)
      if (verdict === null) throw new Error(`unparsable color ${a} / ${b}`)
      return verdict
    }
    // #777777 on white is the canonical "just fails AA normal text" example.
    const greyOnWhite = evaluate("#777777", "#ffffff")
    expect(greyOnWhite.ratio).toBeGreaterThan(4.4)
    expect(greyOnWhite.ratio).toBeLessThan(4.6)
    expect(greyOnWhite.passesNormalAA).toBe(false)
    expect(greyOnWhite.passesLargeAA).toBe(true)
    expect(greyOnWhite.passesNormalAAA).toBe(false)

    const greyOnBlack = evaluate("#777777", "#000000")
    expect(greyOnBlack.ratio).toBeGreaterThan(4.6)
    expect(greyOnBlack.ratio).toBeLessThan(4.8)
    expect(greyOnBlack.passesNormalAA).toBe(true)
    expect(greyOnBlack.passesLargeAA).toBe(true)

    const whiteOnBlack = evaluate("#ffffff", "#000000")
    expect(whiteOnBlack.ratio).toBeCloseTo(21, 5)
    expect(whiteOnBlack.passesNormalAAA).toBe(true)

    // #757575 (ratio 4.608) is the canonical lightest grey that still passes
    // AA on white; #767677 at 4.538 still passes, and #777777 at 4.478 fails.
    expect(evaluate("#757575", "#ffffff").passesNormalAA).toBe(true)
    expect(evaluate("#767677", "#ffffff").passesNormalAA).toBe(true)
    expect(evaluate("#777777", "#ffffff").passesNormalAA).toBe(false)
  })

  it("returns null for unparsable colors", () => {
    expect(evaluateContrast("#zzz", "#ffffff")).toBeNull()
    expect(evaluateContrast("#ffffff", "")).toBeNull()
  })
})

describe("buildHarmonyPalette", () => {
  it("shifts red by the documented amounts", () => {
    const palette = buildHarmonyPalette("#ff0000")
    expect(palette).not.toBeNull()
    if (palette === null) throw new Error("unreachable")
    expect(palette.complementary).toBe("#00ffff")
    expect(palette.analogous).toEqual(["#ff8000", "#ff0080"])
    expect(palette.triadic).toEqual(["#00ff00", "#0000ff"])
    // Split-complementary of 0deg is 150deg and 210deg. hsl(210,100%,50%)
    // is rgb(0,128,255): the green channel's exact .5 rounds up to 128.
    expect(palette.splitComplementary).toEqual(["#00ff80", "#0080ff"])
  })

  it("keeps greys grey", () => {
    const palette = buildHarmonyPalette("#808080")
    if (palette === null) throw new Error("unreachable")
    expect(palette.complementary).toBe("#808080")
    expect(palette.analogous).toEqual(["#808080", "#808080"])
  })

  it("rejects malformed colors", () => {
    expect(buildHarmonyPalette("#12")).toBeNull()
  })
})
