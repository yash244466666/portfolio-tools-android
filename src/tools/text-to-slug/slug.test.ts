import { describe, expect, it } from "vitest"
import { maximumSlugLength, slugSeparators, textToSlug } from "./slug"

const defaults = {
  separator: "-" as const,
  lowercase: true,
  removeStopWords: false,
  maximumLength: 0,
}

describe("textToSlug", () => {
  it("follows the standard pipeline with visible steps", () => {
    const result = textToSlug("Hello, World! This is a Test", defaults)
    expect(result.slug).toBe("hello-world-this-is-a-test")
    expect(result.steps.map((step) => step.label)).toEqual([
      "Original",
      "Remove diacritics",
      "Replace non-alphanumeric",
      "Trim separators",
      "Lowercase",
    ])
  })

  it("keeps original casing when lowercase is off", () => {
    const result = textToSlug("Hello World", { ...defaults, lowercase: false })
    expect(result.slug).toBe("Hello-World")
  })

  it("supports the underscore and dot separators", () => {
    expect(textToSlug("a b!c", { ...defaults, separator: "_" }).slug).toBe("a_b_c")
    expect(textToSlug("a b!c", { ...defaults, separator: "." }).slug).toBe("a.b.c")
    expect(slugSeparators.map((option) => option.id)).toEqual(["-", "_", "."])
  })

  it("strips diacritics through decomposition", () => {
    expect(textToSlug("Café Crème", defaults).slug).toBe("cafe-creme")
    // ß has no decomposition and is not ASCII, so it falls out at the separator step.
    expect(textToSlug("Grüße", defaults).slug).toBe("gru-e")
  })

  it("removes stop words only when enabled", () => {
    const withStop = textToSlug("The quick brown fox and the dog", {
      ...defaults,
      removeStopWords: true,
    })
    expect(withStop.slug).toBe("quick-brown-fox-dog")
    expect(textToSlug("The quick brown fox", defaults).slug).toBe("the-quick-brown-fox")
  })

  it("truncates on a word boundary without trailing separators", () => {
    const result = textToSlug("alpha beta gamma delta", { ...defaults, maximumLength: 16 })
    // "alpha-beta-gamma" is 16 characters; the next separator sits at 16 so the
    // dangling part is dropped.
    expect(result.slug).toBe("alpha-beta")
    expect(result.slug.length).toBeLessThanOrEqual(16)
    expect(result.steps.some((step) => step.label === "Truncate to 16")).toBe(true)
    expect(maximumSlugLength).toBe(200)
  })

  it("trims separator runs at the edges", () => {
    expect(textToSlug("  --hello--world--  ", defaults).slug).toBe("hello-world")
    expect(textToSlug("!!!", defaults).slug).toBe("")
    expect(textToSlug("", defaults).slug).toBe("")
  })

  it("documents the non-Latin behavior honestly", () => {
    // Non-Latin scripts have no ASCII decomposition, so they are removed; the
    // UI discloses this rather than pretending transliteration happens.
    expect(textToSlug("নমস্কার বিশ্ব", defaults).slug).toBe("")
    expect(textToSlug("Hello বাংলা world", defaults).slug).toBe("hello-world")
  })

  it("handles numbers and mixed input", () => {
    expect(textToSlug("Top 10 Tips (2026)", defaults).slug).toBe("top-10-tips-2026")
    expect(textToSlug("user@example.com", defaults).slug).toBe("user-example-com")
  })
})
