import { describe, expect, it } from "vitest"
import {
  formatSvgBytes,
  minifySvg,
  minifySvgDocument,
  maximumSvgLength,
  prettyPrintSvg,
  svgSavingsPercent,
  validateSvg,
} from "./svg"

const sample = [
  "<!-- comment -->",
  '<svg   xmlns="http://www.w3.org/2000/svg"   width="10"   height="10">',
  "  <text>hello   world</text>",
  '  <rect   x="1"   y="2" />',
  "</svg>",
].join("\n")

describe("validateSvg", () => {
  it("accepts a well-formed svg element", () => {
    expect(validateSvg('<svg xmlns="http://www.w3.org/2000/svg" />')).toEqual({
      ok: true,
      message: "Valid SVG.",
    })
  })

  it("rejects blank input", () => {
    expect(validateSvg("   ").message).toBe("Paste an SVG first.")
  })

  it("rejects markup that is not well-formed XML", () => {
    expect(validateSvg("<svg><text>unclosed</svg>").message).toBe("The SVG is not well-formed XML.")
  })

  it("rejects well-formed XML without an svg element", () => {
    expect(validateSvg("<note />").message).toBe(
      "The pasted markup does not contain an <svg> element.",
    )
  })

  it("rejects input beyond the length limit", () => {
    const oversize = `<svg>${"x".repeat(maximumSvgLength)}</svg>`
    expect(validateSvg(oversize).message).toBe(
      `The SVG is limited to ${maximumSvgLength.toLocaleString("en-US")} characters.`,
    )
  })
})

describe("minifySvgDocument", () => {
  it("removes comments and inter-tag whitespace only", () => {
    expect(minifySvgDocument(sample)).toBe(
      '<svg   xmlns="http://www.w3.org/2000/svg"   width="10"   height="10">' +
        '<text>hello   world</text><rect   x="1"   y="2" /></svg>',
    )
  })

  it("never rewrites text nodes that contain whitespace or separators", () => {
    const kept = minifySvgDocument("<svg><text>a = b  c</text></svg>")
    expect(kept).toBe("<svg><text>a = b  c</text></svg>")
  })
})

describe("minifySvg and prettyPrintSvg", () => {
  it("reject invalid input without producing output", () => {
    expect(minifySvg("")).toEqual({ output: "", message: "Paste an SVG first." })
    expect(prettyPrintSvg("<svg><text>unclosed</svg>").output).toBe("")
  })

  it("pretty-prints through the shared XML formatter", () => {
    const result = prettyPrintSvg(sample)
    expect(result.output).toContain("<text>hello   world</text>")
    expect(result.output).not.toContain("<!-- comment -->")
    expect(result.output.startsWith("<svg")).toBe(true)
  })
})

describe("size helpers", () => {
  it("formats bytes and kilobytes", () => {
    expect(formatSvgBytes("abc")).toBe("3 B")
    expect(formatSvgBytes("x".repeat(2048))).toBe("2.0 KB")
  })

  it("computes savings and never returns a negative percentage", () => {
    expect(svgSavingsPercent("a b c", "abc")).toBe(40)
    expect(svgSavingsPercent("abc", "abc")).toBe(0)
    expect(svgSavingsPercent("ab", "abcdef")).toBe(0)
    expect(svgSavingsPercent("", "x")).toBe(0)
  })
})
