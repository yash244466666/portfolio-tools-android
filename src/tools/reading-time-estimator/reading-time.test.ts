import { describe, expect, it } from "vitest"
import {
  budgetSlots,
  countWords,
  defaultWordsPerMinute,
  evaluateBudgets,
  formatReadingTime,
  maximumInputCharacters,
  maximumWordsPerMinute,
  minimumWordsPerMinute,
  parseBudgetCap,
  parseWordsPerMinute,
  readingSeconds,
  splitMinutesSeconds,
} from "./reading-time"

describe("countWords", () => {
  it("counts words on Unicode boundaries", () => {
    expect(countWords("one two three")).toBe(3)
    expect(countWords("café 東京 don't")).toBe(3)
    expect(countWords("")).toBe(0)
    expect(countWords("!!! ...")).toBe(0)
    expect(countWords("  spaced   out  ")).toBe(2)
  })
})

describe("parseWordsPerMinute", () => {
  it("clamps into 100-500 and rejects junk", () => {
    expect(parseWordsPerMinute("200")).toBe(200)
    expect(parseWordsPerMinute("50")).toBe(minimumWordsPerMinute)
    expect(parseWordsPerMinute("900")).toBe(maximumWordsPerMinute)
    expect(parseWordsPerMinute("abc")).toBeNull()
    expect(parseWordsPerMinute("")).toBeNull()
    expect(parseWordsPerMinute("1e2")).toBeNull()
  })
})

describe("parseBudgetCap", () => {
  it("clamps into 1-1,000,000, reports the clamp, and rejects junk", () => {
    expect(parseBudgetCap("160")).toEqual({ value: 160, clamped: false })
    expect(parseBudgetCap("0")).toEqual({ value: 1, clamped: true })
    expect(parseBudgetCap("9999999")).toEqual({ value: 1_000_000, clamped: true })
    expect(parseBudgetCap("")).toBeNull()
  })
})

describe("reading time", () => {
  it("computes whole seconds from words and rate", () => {
    // 200 words at 200 wpm = 60 s.
    expect(readingSeconds(200, 200)).toBe(60)
    // 100 words at 200 wpm = 30 s.
    expect(readingSeconds(100, 200)).toBe(30)
    expect(readingSeconds(0, 200)).toBe(0)
  })

  it("splits into minutes and seconds", () => {
    expect(splitMinutesSeconds(270)).toEqual({
      minutes: 4,
      seconds: 30,
      totalSeconds: 270,
    })
    expect(splitMinutesSeconds(45).minutes).toBe(0)
  })

  it("formats with a minute-under form", () => {
    expect(formatReadingTime(splitMinutesSeconds(270))).toBe("4 min 30 s")
    expect(formatReadingTime(splitMinutesSeconds(45))).toBe("45 s")
    expect(formatReadingTime(splitMinutesSeconds(0))).toBe("0 s")
  })

  it("covers the default estimator path end to end", () => {
    const words = countWords("word ".repeat(400).trim())
    expect(words).toBe(400)
    const seconds = readingSeconds(words, defaultWordsPerMinute)
    expect(splitMinutesSeconds(seconds).minutes).toBe(2)
  })
})

describe("evaluateBudgets", () => {
  it("reports fit and over-by per editable cap", () => {
    const outcomes = evaluateBudgets(320, [
      { key: "seo", label: "SEO description", cap: 160 },
      { key: "post", label: "Post", cap: 3000 },
    ])
    expect(outcomes[0]).toEqual({
      key: "seo",
      label: "SEO description",
      cap: 160,
      fits: false,
      overBy: 160,
    })
    expect(outcomes[1]?.fits).toBe(true)
    expect(outcomes[1]?.overBy).toBe(0)
  })

  it("treats an exact cap as a fit", () => {
    const outcomes = evaluateBudgets(160, [{ key: "seo", label: "SEO", cap: 160 }])
    expect(outcomes[0]?.fits).toBe(true)
  })

  it("exposes the three default budget slots with editable caps", () => {
    expect(budgetSlots.map((slot) => slot.key)).toEqual(["seo", "summary", "post"])
    expect(budgetSlots.every((slot) => slot.defaultCap > 0)).toBe(true)
  })

  it("keeps the standard input cap", () => {
    expect(maximumInputCharacters).toBe(100_000)
  })
})
