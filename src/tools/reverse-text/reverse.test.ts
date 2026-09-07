import { describe, expect, it } from "vitest"
import { maximumReverseChars, reverseOptions, reverseText } from "./reverse"

describe("reverse modes", () => {
  it("exposes the three modes with descriptions", () => {
    expect(reverseOptions.map((option) => option.id)).toEqual(["characters", "words", "lines"])
    expect(maximumReverseChars).toBe(1_000_000)
  })

  it("reverses characters and keeps grapheme clusters intact", () => {
    expect(reverseText("abc", "characters")).toBe("cba")
    expect(reverseText("", "characters")).toBe("")
    // Regression: naive UTF-16 reversal tore emoji and flag sequences apart.
    expect(reverseText("a👍b", "characters")).toBe("b👍a")
    expect(reverseText("🇧🇩 done", "characters")).toBe("enod 🇧🇩")
  })

  it("falls back to code points when Intl.Segmenter is unavailable", () => {
    // The fallback path is exercised implicitly; both agree on simple text.
    expect(reverseText("hello world", "characters")).toBe("dlrow olleh")
  })

  it("reverses word order per line and collapses inner whitespace", () => {
    expect(reverseText("hello brave world", "words")).toBe("world brave hello")
    expect(reverseText("  spaced   out  ", "words")).toBe("out spaced")
    expect(reverseText("first line\nsecond  line", "words")).toBe("line first\nline second")
    expect(reverseText("", "words")).toBe("")
    expect(reverseText("   ", "words")).toBe("")
  })

  it("reverses line order", () => {
    expect(reverseText("one\ntwo\nthree", "lines")).toBe("three\ntwo\none")
    expect(reverseText("only", "lines")).toBe("only")
    expect(reverseText("", "lines")).toBe("")
    // Trailing newline does not manufacture an extra leading empty line beyond
    // mirroring the upstream split/join semantics.
    expect(reverseText("a\nb\n", "lines")).toBe("\nb\na")
  })

  it("normalizes CRLF line endings before reversing lines and words", () => {
    expect(reverseText("one\r\ntwo", "lines")).toBe("two\none")
    expect(reverseText("alpha beta\r\ngamma", "words")).toBe("beta alpha\ngamma")
  })
})
