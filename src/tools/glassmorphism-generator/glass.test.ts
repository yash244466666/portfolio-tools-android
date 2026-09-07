import { describe, expect, it } from "vitest"
import {
  buildGlassDeclaration,
  formatGlassOpacity,
  glassBlurBounds,
  glassBorderRadiusBounds,
  glassBorderWidthBounds,
  parseGlassHexColor,
} from "./glass"

describe("hex parsing", () => {
  it("parses six-digit hex with or without the hash", () => {
    expect(parseGlassHexColor("#6366f1")).toEqual({ r: 99, g: 102, b: 241 })
    expect(parseGlassHexColor("  ffffff ")).toEqual({ r: 255, g: 255, b: 255 })
  })

  it("rejects anything that is not six hexadecimal digits", () => {
    expect(parseGlassHexColor("fff")).toBeNull()
    expect(parseGlassHexColor("#zzzzzz")).toBeNull()
    expect(parseGlassHexColor("")).toBeNull()
  })
})

describe("opacity formatting", () => {
  it("formats the slider fraction without floating-point noise", () => {
    expect(formatGlassOpacity(0.2)).toBe("0.2")
    expect(formatGlassOpacity(0.25)).toBe("0.25")
    expect(formatGlassOpacity(1)).toBe("1")
    expect(formatGlassOpacity(0)).toBe("0")
  })

  it("clamps out-of-range opacity", () => {
    expect(formatGlassOpacity(5)).toBe("1")
    expect(formatGlassOpacity(-1)).toBe("0")
  })
})

describe("glass declaration", () => {
  it("emits the default declaration with both filter prefixes", () => {
    expect(
      buildGlassDeclaration({
        blur: 10,
        opacity: 0.2,
        bgColor: "#ffffff",
        borderColor: "#ffffff",
        borderWidth: 1,
        borderRadius: 16,
      }),
    ).toBe(
      `.glass {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid #ffffff;
  border-radius: 16px;
}`,
    )
  })

  it("lowercases and trims the border color", () => {
    expect(
      buildGlassDeclaration({
        blur: 0,
        opacity: 1,
        bgColor: "#000000",
        borderColor: "  #F0F0F0 ",
        borderWidth: 0,
        borderRadius: 0,
      }),
    ).toContain("border: 0px solid #f0f0f0;")
  })

  it("suppresses the CSS when either color is invalid", () => {
    expect(
      buildGlassDeclaration({
        blur: 10,
        opacity: 0.2,
        bgColor: "nope",
        borderColor: "#ffffff",
        borderWidth: 1,
        borderRadius: 16,
      }),
    ).toBeNull()
    expect(
      buildGlassDeclaration({
        blur: 10,
        opacity: 0.2,
        bgColor: "#ffffff",
        borderColor: "",
        borderWidth: 1,
        borderRadius: 16,
      }),
    ).toBeNull()
  })

  it("keeps the slider bounds documented", () => {
    expect(glassBlurBounds).toEqual({ min: 0, max: 40 })
    expect(glassBorderWidthBounds).toEqual({ min: 0, max: 5 })
    expect(glassBorderRadiusBounds).toEqual({ min: 0, max: 50 })
  })
})
