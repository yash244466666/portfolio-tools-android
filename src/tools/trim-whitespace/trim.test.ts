import { describe, expect, it } from "vitest"
import { defaultTrimOptions, maximumTrimChars, trimWhitespace } from "./trim"

describe("trimWhitespace", () => {
  it("trims leading and trailing whitespace per line by default", () => {
    expect(trimWhitespace("  a  \n\tb\t\nc", defaultTrimOptions)).toEqual({
      output: "a\nb\nc",
      beforeChars: 11,
      afterChars: 5,
    })
  })

  it("keeps inner single spacing and collapses space runs only on request", () => {
    const text = "a  b\tc   d"
    expect(trimWhitespace(text, defaultTrimOptions).output).toBe(text)
    expect(
      trimWhitespace(text, {
        ...defaultTrimOptions,
        trimLeading: false,
        trimTrailing: false,
        collapseSpaces: true,
      }).output,
    ).toBe("a b\tc d")
  })

  it("removes blank and whitespace-only lines on request", () => {
    const text = "a\n  \nb\n\nc"
    expect(trimWhitespace(text, { ...defaultTrimOptions, removeBlankLines: true }).output).toBe(
      "a\nb\nc",
    )
    // With default options the whitespace-only line is trimmed but kept.
    expect(trimWhitespace(text, defaultTrimOptions).output).toBe("a\n\nb\n\nc")
  })

  it("counts saved characters and exposes the limit", () => {
    const result = trimWhitespace("  x  \n y", defaultTrimOptions)
    expect(result.beforeChars - result.afterChars).toBe(5)
    expect(maximumTrimChars).toBe(1_000_000)
  })
})
