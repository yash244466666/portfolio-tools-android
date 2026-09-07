import { describe, expect, it } from "vitest"
import { unicodeCategories, unicodeData } from "./unicode-data"
import { expectedCodePoint, filterUnicodeEntries } from "./unicode-lookup"

describe("Unicode dataset integrity", () => {
  it("contains unique code points in every audited category", () => {
    expect(new Set(unicodeData.map((entry) => entry.codePoint)).size).toBe(unicodeData.length)
    const categories = new Set(unicodeData.map((entry) => entry.category))
    expect([...categories].sort()).toEqual([...unicodeCategories].sort())
  })

  it("derives every code point from its character (independent oracle)", () => {
    for (const entry of unicodeData) {
      expect(entry.char.length).toBeGreaterThan(0)
      expect(entry.codePoint).toBe(expectedCodePoint(entry.char))
      expect(entry.name.length).toBeGreaterThan(0)
    }
  })

  it("matches UCD names for spot-checked characters", () => {
    expect(unicodeData.find((entry) => entry.char === "∞")?.name).toBe("Infinity")
    expect(unicodeData.find((entry) => entry.char === "α")?.name).toBe("Greek Small Letter Alpha")
    expect(unicodeData.find((entry) => entry.char === "€")?.name).toBe("Euro Sign")
    // Regression: U+2625 is Adi Shakti; the upstream dataset mislabeled it
    // "Yin Yang" (U+262F is the actual Yin Yang).
    expect(unicodeData.find((entry) => entry.char === "☥")?.name).toBe("Adi Shakti")
    expect(unicodeData.find((entry) => entry.char === "☯")?.name).toBe("Yin Yang")
  })
})

describe("filterUnicodeEntries", () => {
  it("returns the full dataset for an empty query and the all tab", () => {
    expect(filterUnicodeEntries("", "all")).toEqual(unicodeData)
  })

  it("matches an exact character, a name substring, and a code point", () => {
    expect(filterUnicodeEntries("∞", "all").map((entry) => entry.codePoint)).toEqual(["U+221E"])
    expect(filterUnicodeEntries("infinity", "all")[0]?.codePoint).toBe("U+221E")
    expect(filterUnicodeEntries("U+221E", "Math")[0]?.codePoint).toBe("U+221E")
  })

  it("restricts by category", () => {
    for (const entry of filterUnicodeEntries("", "Greek")) {
      expect(entry.category).toBe("Greek")
    }
    expect(filterUnicodeEntries("", "Greek").length).toBeGreaterThan(0)
  })
})
