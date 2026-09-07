import { allEmojis, emojiCategories, filterEmojiCategories } from "./emoji-data"

describe("emoji catalog", () => {
  it("has non-empty categories with unique emoji", () => {
    expect(emojiCategories.length).toBeGreaterThan(0)
    const seen = new Set<string>()
    for (const category of emojiCategories) {
      expect(category.emojis.length).toBeGreaterThan(0)
      for (const entry of category.emojis) {
        expect(seen.has(entry.emoji)).toBe(false)
        seen.add(entry.emoji)
        expect(entry.name.length).toBeGreaterThan(0)
      }
    }
  })

  it("collects every entry into allEmojis", () => {
    const total = emojiCategories.reduce((sum, category) => sum + category.emojis.length, 0)
    expect(allEmojis.length).toBe(total)
  })
})

describe("filterEmojiCategories", () => {
  it("returns every category for empty search and no active category", () => {
    expect(filterEmojiCategories("", null).length).toBe(emojiCategories.length)
  })

  it("scopes to the active category when no search is present", () => {
    const filtered = filterEmojiCategories("", "Tech")
    expect(filtered.length).toBe(1)
    expect(filtered[0]?.name).toBe("Tech")
  })

  it("ignores an active category that does not exist", () => {
    expect(filterEmojiCategories("", "Nope")).toEqual([])
  })

  it("matches names case-insensitively", () => {
    const filtered = filterEmojiCategories("THUMBS", null)
    expect(filtered.length).toBe(1)
    expect(filtered[0]?.emojis.map((entry) => entry.emoji)).toContain("👍")
  })

  it("matches the emoji characters themselves", () => {
    const filtered = filterEmojiCategories("🔥", null)
    expect(filtered.length).toBe(1)
    expect(filtered[0]?.emojis.map((entry) => entry.name)).toContain("fire")
  })

  it("keeps only categories with matches", () => {
    const filtered = filterEmojiCategories("smile", null)
    expect(filtered.length).toBe(1)
    expect(filtered[0]?.name).toBe("Smileys")
  })

  it("trims surrounding whitespace in the search", () => {
    expect(filterEmojiCategories("  fire  ", null)[0]?.emojis[0]?.name).toBe("fire")
  })

  it("returns nothing for an unmatched search", () => {
    expect(filterEmojiCategories("zzzzz", null)).toEqual([])
  })

  it("combines search with the active category", () => {
    const filtered = filterEmojiCategories("heart", "Hearts")
    expect(filtered.length).toBe(1)
    expect(filtered[0]?.emojis.length).toBeGreaterThan(5)
    // "heart eyes" lives in Smileys, so scoping to Hearts excludes it.
    expect(filtered[0]?.emojis.map((entry) => entry.name)).not.toContain("heart eyes")
  })
})
