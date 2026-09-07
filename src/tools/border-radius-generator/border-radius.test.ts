import { describe, expect, it } from "vitest"
import {
  buildBorderRadiusDeclaration,
  buildBorderRadiusPreviewStyle,
  clampBorderRadiusValue,
  defaultBorderRadiusValues,
  getBorderRadiusUnit,
} from "./border-radius"

describe("borderRadiusUnits", () => {
  it("carries the documented maximum per unit", () => {
    expect(getBorderRadiusUnit("px")).toEqual({ id: "px", label: "px", max: 100 })
    expect(getBorderRadiusUnit("%")).toEqual({ id: "%", label: "%", max: 50 })
    expect(getBorderRadiusUnit("rem")).toEqual({ id: "rem", label: "rem", max: 10 })
    expect(getBorderRadiusUnit("em")).toEqual({ id: "px", label: "px", max: 100 })
  })
})

describe("buildBorderRadiusDeclaration", () => {
  it("collapses to the shorthand when all corners match", () => {
    expect(buildBorderRadiusDeclaration(defaultBorderRadiusValues, getBorderRadiusUnit("px"))).toBe(
      "border-radius: 16px;",
    )
  })

  it("emits the four-corner order TL TR BR BL when they differ", () => {
    expect(
      buildBorderRadiusDeclaration(
        { topLeft: 10, topRight: 20, bottomRight: 30, bottomLeft: 40 },
        getBorderRadiusUnit("px"),
      ),
    ).toBe("border-radius: 10px 20px 30px 40px;")
  })

  it("formats other units", () => {
    expect(
      buildBorderRadiusDeclaration(
        { topLeft: 1, topRight: 2, bottomRight: 3, bottomLeft: 4 },
        getBorderRadiusUnit("rem"),
      ),
    ).toBe("border-radius: 1rem 2rem 3rem 4rem;")
    expect(
      buildBorderRadiusDeclaration(
        { topLeft: 25, topRight: 50, bottomRight: 25, bottomLeft: 50 },
        getBorderRadiusUnit("%"),
      ),
    ).toBe("border-radius: 25% 50% 25% 50%;")
  })
})

describe("buildBorderRadiusPreviewStyle", () => {
  it("uses one key when corners match and four keys otherwise", () => {
    expect(
      buildBorderRadiusPreviewStyle(defaultBorderRadiusValues, getBorderRadiusUnit("px")),
    ).toEqual({
      borderRadius: "16px",
    })
    expect(
      buildBorderRadiusPreviewStyle(
        { topLeft: 0, topRight: 10, bottomRight: 0, bottomLeft: 10 },
        getBorderRadiusUnit("px"),
      ),
    ).toEqual({
      borderTopLeftRadius: "0px",
      borderTopRightRadius: "10px",
      borderBottomRightRadius: "0px",
      borderBottomLeftRadius: "10px",
    })
  })
})

describe("clampBorderRadiusValue", () => {
  it("clamps values into the unit range", () => {
    expect(clampBorderRadiusValue(100, getBorderRadiusUnit("px"))).toBe(100)
    expect(clampBorderRadiusValue(100, getBorderRadiusUnit("%"))).toBe(50)
    expect(clampBorderRadiusValue(100, getBorderRadiusUnit("rem"))).toBe(10)
    expect(clampBorderRadiusValue(-5, getBorderRadiusUnit("px"))).toBe(0)
  })
})
