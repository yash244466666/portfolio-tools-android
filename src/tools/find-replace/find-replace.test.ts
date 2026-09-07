import { describe, expect, it } from "vitest"
import {
  applyReplacements,
  buildFlags,
  buildRegexPattern,
  escapeRegexLiteral,
  findLiteralMatches,
  matchesFromRegexResult,
} from "./find-replace"

describe("escapeRegexLiteral", () => {
  it("escapes every metacharacter", () => {
    expect(escapeRegexLiteral("a.b*c?")).toBe("a\\.b\\*c\\?")
    expect(escapeRegexLiteral("${x}[y](z)")).toBe("\\$\\{x\\}\\[y\\]\\(z\\)")
    expect(escapeRegexLiteral("plain")).toBe("plain")
  })
})

describe("buildRegexPattern", () => {
  it("wraps with whole-word lookarounds when requested", () => {
    expect(buildRegexPattern("a+", false)).toBe("a+")
    expect(buildRegexPattern("a+", true)).toBe("(?<=^|\\W)a+(?=$|\\W)")
  })
})

describe("buildFlags", () => {
  it("enables case-insensitivity only when requested", () => {
    expect(buildFlags(true)).toBe("g")
    expect(buildFlags(false)).toBe("gi")
  })
})

describe("findLiteralMatches", () => {
  it("finds every literal occurrence with indices into the original text", () => {
    expect(findLiteralMatches("banana", "an", false, false)).toEqual([
      { index: 1, text: "an" },
      { index: 3, text: "an" },
    ])
  })

  it("is case-insensitive by default and preserves the original casing", () => {
    const matches = findLiteralMatches("Cat cat CAT", "cat", false, false)
    expect(matches.map((match) => match.text)).toEqual(["Cat", "cat", "CAT"])
  })

  it("respects case sensitivity when requested", () => {
    expect(findLiteralMatches("Cat cat CAT", "cat", true, false)).toEqual([
      { index: 4, text: "cat" },
    ])
  })

  it("honours whole-word boundaries", () => {
    expect(findLiteralMatches("cat catalog cat", "cat", false, true)).toEqual([
      { index: 0, text: "cat" },
      { index: 12, text: "cat" },
    ])
    expect(findLiteralMatches("cats cat", "cat", false, true)).toEqual([{ index: 5, text: "cat" }])
  })

  it("returns nothing for an empty needle or haystack", () => {
    expect(findLiteralMatches("", "a", false, false)).toEqual([])
    expect(findLiteralMatches("abc", "", false, false)).toEqual([])
  })
})

describe("applyReplacements", () => {
  it("splices replacements from the end so indices stay valid", () => {
    const matches = findLiteralMatches("banana", "an", false, false)
    expect(applyReplacements("banana", matches, "X")).toEqual({ output: "bXXa", matchCount: 2 })
  })

  it("supports replacement text longer than the match", () => {
    expect(applyReplacements("ab", [{ index: 0, text: "a" }], "long")).toEqual({
      output: "longb",
      matchCount: 1,
    })
  })

  it("returns the source unchanged when nothing matched", () => {
    expect(applyReplacements("abc", [], "x")).toEqual({ output: "abc", matchCount: 0 })
  })
})

describe("matchesFromRegexResult", () => {
  it("re-slices match text from the original input", () => {
    expect(
      matchesFromRegexResult("Hello hello", [
        { index: 0, text: "Hello" },
        { index: 6, text: "hello" },
      ]),
    ).toEqual([
      { index: 0, text: "Hello" },
      { index: 6, text: "hello" },
    ])
  })
})
