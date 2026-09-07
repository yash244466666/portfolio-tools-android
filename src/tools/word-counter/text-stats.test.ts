import { describe, expect, it } from "vitest"
import { computeTextStats, maximumCounterChars, readingWordsPerMinute } from "./text-stats"

describe("computeTextStats", () => {
  it("returns all zeros for empty text", () => {
    expect(computeTextStats("")).toEqual({
      words: 0,
      characters: 0,
      charactersWithoutSpaces: 0,
      sentences: 0,
      paragraphs: 0,
      readingTimeLabel: "0 min",
    })
  })

  it("counts words, sentences, and paragraphs", () => {
    const stats = computeTextStats("Hello world. Second sentence!\n\nNew paragraph?")
    expect(stats.words).toBe(6)
    expect(stats.sentences).toBe(3)
    expect(stats.paragraphs).toBe(2)
  })

  it("counts characters as code points, not UTF-16 units", () => {
    // Regression: the upstream implementation counted UTF-16 units, so emoji
    // counted as two characters.
    expect(computeTextStats("a👍b").characters).toBe(3)
    expect(computeTextStats("a👍b").charactersWithoutSpaces).toBe(3)
    expect(computeTextStats("héllo").characters).toBe(5)
  })

  it("excludes whitespace from the without-spaces count", () => {
    const stats = computeTextStats("a b\nc")
    expect(stats.characters).toBe(5)
    expect(stats.charactersWithoutSpaces).toBe(3)
  })

  it("labels reading time under and over the per-minute rate", () => {
    expect(computeTextStats("one two").readingTimeLabel).toBe("< 1 min")
    const words = Array.from({ length: readingWordsPerMinute * 2 }, () => "word").join(" ")
    expect(computeTextStats(words).readingTimeLabel).toBe("2 min")
    expect(maximumCounterChars).toBe(1_000_000)
  })

  it("counts whitespace-only text as zero words", () => {
    const stats = computeTextStats("   \n\t ")
    expect(stats.words).toBe(0)
    expect(stats.charactersWithoutSpaces).toBe(0)
  })
})
