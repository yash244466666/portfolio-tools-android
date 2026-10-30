import { describe, expect, it } from "vitest"
import { compareCodepoints, countWords, normalizeToken, tokenizeWords } from "./word-tokenizer"

describe("tokenizeWords", () => {
  it("keeps both apostrophe forms inside one word", () => {
    expect(tokenizeWords("don't don’t", true)).toEqual(["don't", "don’t"])
  })

  it("strips a trailing possessive apostrophe", () => {
    expect(tokenizeWords("dogs' bones", true)).toEqual(["dogs", "bones"])
  })

  it("case-folds with the invariant algorithm (Turkish-safe)", () => {
    // A Turkish host locale maps "I" to "ı" via toLocaleLowerCase; the
    // invariant fold must keep "i".
    expect(normalizeToken("I", true)).toBe("i")
    expect(tokenizeWords("I İ", true)).toEqual(["i", "i̇"])
  })

  it("respects the fold toggle and drops apostrophe-only tokens", () => {
    expect(tokenizeWords("' ' Don't", false)).toEqual(["Don't"])
  })

  it("spans scripts and digits", () => {
    expect(tokenizeWords("café 東京 42", true)).toEqual(["café", "東京", "42"])
  })

  it("keeps combining marks attached and normalizes canonical forms", () => {
    expect(tokenizeWords("naïve", true)).toEqual(["naïve"])
    expect(tokenizeWords("हिन्दी", true)).toEqual(["हिन्दी"])
    expect(tokenizeWords("café", true)).toEqual(["café"])
  })
})

describe("countWords", () => {
  it("counts without materializing and honors the fold", () => {
    expect(countWords("one two three")).toBe(3)
    expect(countWords("Dogs' bones", true)).toBe(2)
    expect(countWords("!!!", true)).toBe(0)
    expect(countWords("— 😀", true)).toBe(0)
    expect(countWords("café au lait", true)).toBe(3)
    expect(countWords("हिन्दी भाषा", true)).toBe(2)
  })
})

describe("compareCodepoints", () => {
  it("orders by code unit, so the order cannot flip with the host locale", () => {
    // Under sv sorting, "ä" sorts before "z"; codepoints put ä (U+00E4) after
    // z (U+007A). The comparator must always pick the codepoint order.
    expect(compareCodepoints("ä", "z")).toBe(1)
    expect(compareCodepoints("z", "ä")).toBe(-1)
    expect(compareCodepoints("a", "a")).toBe(0)
  })
})
