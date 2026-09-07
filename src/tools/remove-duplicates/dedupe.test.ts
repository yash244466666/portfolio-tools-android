import { describe, expect, it } from "vitest"
import { dedupe, defaultDedupeOptions, getDedupeOption, maximumDedupeChars } from "./dedupe"

describe("dedupe", () => {
  it("keeps the first occurrence of each line", () => {
    const result = dedupe("b\na\nb\na\nc", "lines", defaultDedupeOptions)
    expect(result.output).toBe("b\na\nc")
    expect(result.total).toBe(5)
    expect(result.removed).toBe(2)
  })

  it("compares case-insensitively while keeping the first casing", () => {
    const result = dedupe("Apple\nAPPLE\nbanana", "lines", {
      ...defaultDedupeOptions,
      caseSensitive: false,
    })
    expect(result.output).toBe("Apple\nbanana")
    expect(result.removed).toBe(1)
    expect(dedupe("Apple\nAPPLE", "lines", defaultDedupeOptions).output).toBe("Apple\nAPPLE")
  })

  it("sorts output with locale comparison when requested", () => {
    const result = dedupe("banana\nApple\ncherry", "lines", {
      ...defaultDedupeOptions,
      sortOutput: true,
    })
    expect(result.output).toBe("Apple\nbanana\ncherry")
  })

  it("dedupes words across whitespace runs", () => {
    const result = dedupe("  the   cat and THE  cat ", "words", {
      ...defaultDedupeOptions,
      caseSensitive: false,
    })
    expect(result.output).toBe("the cat and")
    expect(result.total).toBe(5)
    expect(result.removed).toBe(2)
    expect(dedupe("", "words", defaultDedupeOptions).total).toBe(0)
  })

  it("exposes the limit and rejects unknown modes", () => {
    expect(maximumDedupeChars).toBe(1_000_000)
    expect(() => getDedupeOption("chars")).toThrow(RangeError)
    expect(getDedupeOption("words").id).toBe("words")
  })
})
