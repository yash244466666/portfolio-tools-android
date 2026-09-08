import { describe, expect, it } from "vitest"
import {
  buildNeumorphismCss,
  darken,
  lighten,
  neumorphismDistanceBounds,
  neumorphismIntensityBounds,
  neumorphismRadiusBounds,
  neumorphismSizeBounds,
  parseNeumorphismHexColor,
} from "./neumorphism"

const flatInput = {
  size: 150,
  radius: 30,
  distance: 8,
  intensity: 30,
  baseColor: "#2a2a2a",
  shape: "flat" as const,
}

describe("hex parsing and tone shifting", () => {
  it("parses six-digit hex colors", () => {
    expect(parseNeumorphismHexColor("#2a2a2a")).toEqual({ r: 42, g: 42, b: 42 })
    expect(parseNeumorphismHexColor("FFFFFF")).toEqual({ r: 255, g: 255, b: 255 })
    expect(parseNeumorphismHexColor("#12345")).toBeNull()
  })

  it("lightens and darkens with clamped channels", () => {
    expect(lighten("#2a2a2a", 30)).toBe("rgb(72, 72, 72)")
    expect(darken("#2a2a2a", 30)).toBe("rgb(12, 12, 12)")
    expect(lighten("#ffffff", 30)).toBe("rgb(255, 255, 255)")
    expect(darken("#000000", 30)).toBe("rgb(0, 0, 0)")
    expect(lighten("nope", 10)).toBeNull()
  })
})

describe("neumorphism declaration", () => {
  it("emits the flat variant with raised twin shadows", () => {
    expect(buildNeumorphismCss(flatInput)).toBe(
      `.neumorphic {
  width: 150px;
  height: 150px;
  border-radius: 30%;
  background: #2a2a2a;
  box-shadow: 8px 8px 16px rgb(12, 12, 12), -8px -8px 16px rgb(72, 72, 72);
}`,
    )
  })

  it("emits the convex gradient with raised shadows", () => {
    expect(buildNeumorphismCss({ ...flatInput, shape: "convex" })).toBe(
      `.neumorphic {
  width: 150px;
  height: 150px;
  border-radius: 30%;
  background: #2a2a2a;
  background: linear-gradient(145deg, rgb(54, 54, 54), rgb(30, 30, 30));
  box-shadow: 8px 8px 16px rgb(12, 12, 12), -8px -8px 16px rgb(72, 72, 72);
}`,
    )
  })

  it("emits the concave gradient with inset shadows", () => {
    const css = buildNeumorphismCss({ ...flatInput, shape: "concave" })
    expect(css).toContain("background: linear-gradient(145deg, rgb(30, 30, 30), rgb(54, 54, 54));")
    expect(css).toContain(
      "box-shadow: inset 8px 8px 16px rgb(12, 12, 12), inset -8px -8px 16px rgb(72, 72, 72);",
    )
  })

  it("emits the pressed variant with inset shadows only", () => {
    const css = buildNeumorphismCss({ ...flatInput, shape: "pressed" })
    expect(css).not.toContain("linear-gradient")
    expect(css).toContain(
      "box-shadow: inset 8px 8px 16px rgb(12, 12, 12), inset -8px -8px 16px rgb(72, 72, 72);",
    )
  })

  it("suppresses the CSS for invalid colors", () => {
    expect(buildNeumorphismCss({ ...flatInput, baseColor: "not-a-color" })).toBeNull()
  })

  it("keeps the slider bounds documented", () => {
    expect(neumorphismSizeBounds).toEqual({ min: 80, max: 250 })
    expect(neumorphismRadiusBounds).toEqual({ min: 0, max: 50 })
    expect(neumorphismDistanceBounds).toEqual({ min: 2, max: 30 })
    expect(neumorphismIntensityBounds).toEqual({ min: 5, max: 60 })
  })
})
