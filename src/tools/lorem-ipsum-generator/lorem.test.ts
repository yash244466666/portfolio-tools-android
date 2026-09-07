import { describe, expect, it } from "vitest"
import {
  clampLoremCount,
  generateLoremIpsum,
  loremUnitBounds,
  loremUnitLabels,
  loremUnits,
  loremWords,
  loremWordCount,
} from "./lorem"

/** Deterministic PRNG (mulberry32) so vector expectations hold. */
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state |= 0
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe("dataset invariants", () => {
  it("keeps the 123-word upstream list without duplicates", () => {
    expect(loremWordCount).toBe(123)
    expect(new Set(loremWords).size).toBe(loremWordCount)
  })

  it("exposes three labeled units with documented bounds", () => {
    expect(loremUnits).toEqual(["paragraphs", "sentences", "words"])
    expect(loremUnitLabels.words).toBe("Words")
    expect(loremUnitBounds.paragraphs).toEqual({ min: 1, max: 10 })
    expect(loremUnitBounds.sentences).toEqual({ min: 1, max: 50 })
    expect(loremUnitBounds.words).toEqual({ min: 1, max: 500 })
  })
})

describe("clampLoremCount", () => {
  it("clamps NaN, zero, negatives, and over-limits per unit", () => {
    expect(clampLoremCount(Number.NaN, "words")).toBe(1)
    expect(clampLoremCount(0, "sentences")).toBe(1)
    expect(clampLoremCount(-5, "paragraphs")).toBe(1)
    expect(clampLoremCount(501, "words")).toBe(500)
    expect(clampLoremCount(11, "paragraphs")).toBe(10)
    expect(clampLoremCount(2.9, "words")).toBe(2)
    expect(clampLoremCount(5, "sentences")).toBe(5)
  })
})

describe("generateLoremIpsum", () => {
  it("produces the requested word count", () => {
    const output = generateLoremIpsum(7, "words", seededRandom(1))
    expect(output.split(" ")).toHaveLength(7)
    for (const word of output.split(" ")) {
      expect(loremWords).toContain(word)
    }
  })

  it("produces sentence-shaped output ending with periods and capital starts", () => {
    const output = generateLoremIpsum(3, "sentences", seededRandom(2))
    // Each sentence ends with one period; the text before it is the sentence body.
    const bodies = output.split(".")
    expect(bodies).toHaveLength(4) // 3 sentence bodies plus the trailing empty string
    for (const body of bodies.slice(0, 3)) {
      expect(body.trimStart().charAt(0)).toMatch(/[A-Z]/)
    }
    expect(output.endsWith(".")).toBe(true)
  })

  it("produces paragraph blocks separated by blank lines", () => {
    const output = generateLoremIpsum(3, "paragraphs", seededRandom(3))
    const paragraphs = output.split("\n\n")
    expect(paragraphs).toHaveLength(3)
    for (const paragraph of paragraphs) {
      expect(paragraph.split(" ").length).toBeGreaterThanOrEqual(3)
    }
  })

  it("is deterministic for the same seed and unit", () => {
    expect(generateLoremIpsum(5, "sentences", seededRandom(42))).toBe(
      generateLoremIpsum(5, "sentences", seededRandom(42)),
    )
  })

  it("clamps over-limit requests to the unit bound", () => {
    expect(generateLoremIpsum(1000, "words", seededRandom(3)).split(" ")).toHaveLength(500)
    expect(generateLoremIpsum(99, "paragraphs", seededRandom(4)).split("\n\n")).toHaveLength(10)
  })
})
