import { buildGradient, buildGradientDeclaration, normalizeGradientColor } from "./gradient"

describe("normalizeGradientColor", () => {
  it("canonicalizes hex input", () => {
    expect(normalizeGradientColor("#6366F1")).toBe("#6366f1")
    expect(normalizeGradientColor("6366f1")).toBe("#6366f1")
    expect(normalizeGradientColor("#0af")).toBe("#00aaff")
    expect(normalizeGradientColor(" #fff ")).toBe("#ffffff")
  })

  it("rejects malformed colors", () => {
    expect(normalizeGradientColor("")).toBeNull()
    expect(normalizeGradientColor("#12")).toBeNull()
    expect(normalizeGradientColor("blue")).toBeNull()
    expect(normalizeGradientColor("#12345")).toBeNull()
    expect(normalizeGradientColor("#1234567")).toBeNull()
  })
})

describe("buildGradient", () => {
  it("builds a linear gradient with the angle", () => {
    expect(buildGradient({ type: "linear", angle: 135, colors: ["#6366f1", "#06b6d4"] })).toEqual({
      css: "linear-gradient(135deg, #6366f1, #06b6d4)",
      message: "",
    })
  })

  it("builds radial and conic gradients", () => {
    const colors = ["#ff0000", "#0000ff"]
    expect(buildGradient({ type: "radial", angle: 0, colors }).css).toBe(
      "radial-gradient(circle, #ff0000, #0000ff)",
    )
    expect(buildGradient({ type: "conic", angle: 90, colors }).css).toBe(
      "conic-gradient(from 90deg, #ff0000, #0000ff)",
    )
  })

  it("keeps three stops and skips blank entries", () => {
    expect(
      buildGradient({ type: "linear", angle: 0, colors: ["#ff0000", "  ", "#0000ff"] }).css,
    ).toBe("linear-gradient(0deg, #ff0000, #0000ff)")
    expect(
      buildGradient({ type: "linear", angle: 0, colors: ["#ff0000", "#00ff00", "#0000ff"] }).css,
    ).toBe("linear-gradient(0deg, #ff0000, #00ff00, #0000ff)")
  })

  it("requires at least two colors", () => {
    expect(buildGradient({ type: "linear", angle: 135, colors: ["#6366f1", ""] }).message).toBe(
      "Add at least two colors.",
    )
    expect(buildGradient({ type: "linear", angle: 135, colors: [] }).css).toBeNull()
  })

  it("rejects malformed colors without emitting CSS", () => {
    const result = buildGradient({ type: "linear", angle: 135, colors: ["#6366f1", "blue"] })
    expect(result.css).toBeNull()
    expect(result.message).toContain("six-digit hex")
  })

  it("clamps the angle into the documented range", () => {
    expect(
      buildGradient({ type: "linear", angle: -20, colors: ["#ff0000", "#0000ff"] }).css,
    ).toContain("linear-gradient(0deg")
    expect(
      buildGradient({ type: "linear", angle: 500, colors: ["#ff0000", "#0000ff"] }).css,
    ).toContain("linear-gradient(360deg")
  })
})

describe("buildGradientDeclaration", () => {
  it("wraps the gradient in a background declaration", () => {
    expect(buildGradientDeclaration("linear-gradient(135deg, #6366f1, #06b6d4)")).toBe(
      "background: linear-gradient(135deg, #6366f1, #06b6d4);",
    )
    expect(buildGradientDeclaration(null)).toBe("")
  })
})
