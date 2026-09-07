import { describe, expect, it } from "vitest"
import {
  buildTriangleCss,
  buildTrianglePreviewStyle,
  getTriangleDirection,
  triangleDirections,
} from "./triangle"

describe("triangleDirections", () => {
  it("offers the four CSS border-triangle directions", () => {
    expect(triangleDirections.map((option) => option.id)).toEqual(["up", "down", "left", "right"])
    expect(getTriangleDirection("down")).toBe("down")
    expect(getTriangleDirection("diagonal")).toBe("up")
  })
})

describe("buildTriangleCss", () => {
  it("points up with transparent sides and a bottom border", () => {
    expect(buildTriangleCss("up", 100, 100, "#6366f1")).toBe(
      "width: 0;\nheight: 0;\nborder-left: 50px solid transparent;\nborder-right: 50px solid transparent;\nborder-bottom: 100px solid #6366f1;",
    )
  })

  it("points down with the color on the top border", () => {
    expect(buildTriangleCss("down", 60, 80, "#00ff00")).toBe(
      "width: 0;\nheight: 0;\nborder-left: 30px solid transparent;\nborder-right: 30px solid transparent;\nborder-top: 80px solid #00ff00;",
    )
  })

  it("points left with the color on the right border", () => {
    expect(buildTriangleCss("left", 40, 20, "#123456")).toBe(
      "width: 0;\nheight: 0;\nborder-top: 10px solid transparent;\nborder-bottom: 10px solid transparent;\nborder-right: 40px solid #123456;",
    )
  })

  it("points right with the color on the left border", () => {
    expect(buildTriangleCss("right", 30, 50, "#abc")).toBe(
      "width: 0;\nheight: 0;\nborder-top: 25px solid transparent;\nborder-bottom: 25px solid transparent;\nborder-left: 30px solid #abc;",
    )
  })

  it("keeps fractional half sizes from odd widths", () => {
    const css = buildTriangleCss("up", 33, 50, "#ffffff")
    expect(css).toContain("border-left: 16.5px solid transparent")
  })
})

describe("buildTrianglePreviewStyle", () => {
  it("mirrors the CSS borders as inline styles", () => {
    expect(buildTrianglePreviewStyle("left", 40, 20, "#123456")).toEqual({
      width: 0,
      height: 0,
      borderTop: "10px solid transparent",
      borderBottom: "10px solid transparent",
      borderRight: "40px solid #123456",
    })
  })
})
