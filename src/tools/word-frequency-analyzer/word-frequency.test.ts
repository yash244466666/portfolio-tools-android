import { describe, expect, it } from "vitest"
import {
  analyzeWordFrequency,
  clampInput,
  englishStopwords,
  maximumInputCharacters,
  topNOptions,
} from "./word-frequency"

describe("analyzeWordFrequency", () => {
  it("counts words with counts and percentages", () => {
    const result = analyzeWordFrequency("apple banana apple apple", {
      topN: 5,
      caseFold: true,
      removeStopwords: false,
    })
    expect(result.tokenCount).toBe(4)
    expect(result.uniqueWordCount).toBe(2)
    expect(result.entries[0]).toEqual({ word: "apple", count: 3, percentage: 75 })
    expect(result.entries[1]).toEqual({ word: "banana", count: 1, percentage: 25 })
  })

  it("case-folds only when the toggle is on", () => {
    const folded = analyzeWordFrequency("Dog dog DOG cat", {
      topN: 5,
      caseFold: true,
      removeStopwords: false,
    })
    expect(folded.entries[0]).toEqual({ word: "dog", count: 3, percentage: 75 })

    const unfolded = analyzeWordFrequency("Dog dog DOG cat", {
      topN: 5,
      caseFold: false,
      removeStopwords: false,
    })
    expect(unfolded.uniqueWordCount).toBe(4)
    expect(unfolded.tokenCount).toBe(4)
  })

  it("removes stopwords only with the toggle on and reports the removals", () => {
    const withStopwords = analyzeWordFrequency("the cat and the dog", {
      topN: 5,
      caseFold: true,
      removeStopwords: true,
    })
    expect(withStopwords.stopwordsRemoved).toBe(3)
    expect(withStopwords.tokenCount).toBe(2)
    expect(withStopwords.entries.map((entry) => entry.word)).toEqual(["cat", "dog"])

    const kept = analyzeWordFrequency("the cat and the dog", {
      topN: 5,
      caseFold: true,
      removeStopwords: false,
    })
    expect(kept.stopwordsRemoved).toBe(0)
    expect(kept.tokenCount).toBe(5)
  })

  it("tokenizes on Unicode word boundaries across scripts and digits", () => {
    const result = analyzeWordFrequency("café naïve 東京 42 42 don't", {
      topN: 10,
      caseFold: true,
      removeStopwords: false,
    })
    const words = result.entries.map((entry) => entry.word)
    expect(words).toContain("café")
    expect(words).toContain("naïve")
    expect(words).toContain("東京")
    expect(words).toContain("don't")
    const fortyTwo = result.entries.find((entry) => entry.word === "42")
    expect(fortyTwo?.count).toBe(2)
  })

  it("breaks ties alphabetically for a deterministic table", () => {
    const result = analyzeWordFrequency("cherry banana apple", {
      topN: 5,
      caseFold: true,
      removeStopwords: false,
    })
    expect(result.entries.map((entry) => entry.word)).toEqual(["apple", "banana", "cherry"])
  })

  it("handles the empty and punctuation-only inputs", () => {
    const empty = analyzeWordFrequency("", { topN: 5, caseFold: true, removeStopwords: true })
    expect(empty.tokenCount).toBe(0)
    expect(empty.entries).toEqual([])
    const punctuation = analyzeWordFrequency("!!! ... ???", {
      topN: 5,
      caseFold: true,
      removeStopwords: false,
    })
    expect(punctuation.tokenCount).toBe(0)
  })

  it("honors every selectable top-N value", () => {
    const text = Array.from({ length: 60 }, (_, index) => `w${index}`).join(" ")
    for (const topN of topNOptions) {
      const result = analyzeWordFrequency(text, {
        topN,
        caseFold: true,
        removeStopwords: false,
      })
      expect(result.entries).toHaveLength(topN)
    }
  })

  it("caps analysis at the standard 100,000-character input bound", () => {
    expect(maximumInputCharacters).toBe(100_000)
    const longText = `${"a".repeat(maximumInputCharacters)} tail`
    const clamped = clampInput(longText)
    expect(clamped).toHaveLength(maximumInputCharacters)
    expect(clamped.endsWith("tail")).toBe(false)
  })

  it("keeps the stopword set free of content words", () => {
    for (const stopword of englishStopwords) {
      expect(stopword).toBe(stopword.toLocaleLowerCase())
      expect(stopword.length).toBeLessThanOrEqual(5)
    }
  })
})
