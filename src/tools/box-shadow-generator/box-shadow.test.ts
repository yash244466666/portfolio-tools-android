import { describe, expect, it } from "vitest"
import {
  buildBoxShadowCss,
  buildBoxShadowValue,
  defaultBoxShadowInput,
  formatOpacityPercent,
  hexToRgba,
  parseHexColor,
} from "./box-shadow"

describe("parseHexColor", () => {
  it("parses strict #RRGGBB colors with oracle vectors", () => {
    expect(parseHexColor("#000000")).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseHexColor("#FFFFFF")).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseHexColor("#6366f1")).toEqual({ r: 0x63, g: 0x66, b: 0xf1 })
    expect(parseHexColor("#06b6d4")).toEqual({ r: 0x06, g: 0xb6, b: 0xd4 })
  })

  it("rejects malformed colors instead of coercing", () => {
    expect(parseHexColor("")).toBeNull()
    expect(parseHexColor("#6366")).toBeNull()
    expect(parseHexColor("#6366f11")).toBeNull()
    expect(parseHexColor("6366f1")).toBeNull()
    expect(parseHexColor("#6366gg")).toBeNull()
  })
})

describe("hexToRgba", () => {
  it("formats channels and alpha as rgba()", () => {
    expect(hexToRgba("#6366f1", 0.3)).toBe("rgba(99, 102, 241, 0.3)")
    expect(hexToRgba("#000000", 0)).toBe("rgba(0, 0, 0, 0)")
    expect(hexToRgba("#ffffff", 1)).toBe("rgba(255, 255, 255, 1)")
    expect(hexToRgba("#123456", 0.005)).toBe("rgba(18, 52, 86, 0.005)")
  })

  it("returns null for malformed colors", () => {
    expect(hexToRgba("nope", 0.5)).toBeNull()
  })
})

describe("buildBoxShadowCss", () => {
  it("emits offset, blur, spread, and color in CSS order", () => {
    expect(buildBoxShadowCss(defaultBoxShadowInput)).toBe(
      "box-shadow: 4px 4px 12px 0px rgba(99, 102, 241, 0.3);",
    )
    expect(
      buildBoxShadowCss({
        offsetX: -10,
        offsetY: 25,
        blur: 0,
        spread: -5,
        color: "#ff8800",
        opacity: 1,
      }),
    ).toBe("box-shadow: -10px 25px 0px -5px rgba(255, 136, 0, 1);")
  })

  it("returns null when the color is malformed", () => {
    expect(buildBoxShadowCss({ ...defaultBoxShadowInput, color: "#xyz" })).toBeNull()
  })
})

describe("buildBoxShadowValue", () => {
  it("strips the declaration prefix for the inline preview", () => {
    expect(buildBoxShadowValue(defaultBoxShadowInput)).toBe(
      "4px 4px 12px 0px rgba(99, 102, 241, 0.3)",
    )
  })
})

describe("formatOpacityPercent", () => {
  it("rounds to whole percent values", () => {
    expect(formatOpacityPercent(0.3)).toBe("30%")
    expect(formatOpacityPercent(0)).toBe("0%")
    expect(formatOpacityPercent(1)).toBe("100%")
    expect(formatOpacityPercent(0.125)).toBe("13%")
  })
})
