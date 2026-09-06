import { describe, expect, it } from "vitest"
import {
  buildHighlightedSegments,
  isValidRegexInputSize,
  maximumInputBytes,
  maximumMatchCount,
  maximumPatternLength,
  runRegex,
} from "./regex"

describe("regex evaluation vectors", () => {
  it("collects global matches with indices and capture groups", () => {
    const result = runRegex({
      pattern: "\\b(\\w+)@(\\w+)\\.com\\b",
      flags: "g",
      input: "Mail a@example.com or b@example.com today.",
    })
    expect(result).toMatchObject({ status: "ok", truncated: false })
    if (result.status !== "ok") return
    expect(result.matches).toHaveLength(2)
    expect(result.matches[0]).toEqual({
      text: "a@example.com",
      index: 5,
      groups: ["a", "example"],
    })
    expect(result.matches[1]?.index).toBe(22)
  })

  it("returns only the first match without the global flag", () => {
    const result = runRegex({ pattern: "\\d+", flags: "", input: "a1 b22 c333" })
    expect(result).toMatchObject({
      status: "ok",
      matches: [{ text: "1", index: 1, groups: [] }],
      truncated: false,
    })
  })

  it("honors case-insensitive, multiline, and dot-all flags", () => {
    expect(runRegex({ pattern: "^second", flags: "im", input: "first\nsecond" })).toMatchObject({
      status: "ok",
      matches: [{ text: "second", index: 6 }],
    })
    expect(runRegex({ pattern: "a.b", flags: "s", input: "a\nb" })).toMatchObject({
      status: "ok",
      matches: [{ text: "a\nb", index: 0 }],
    })
    expect(runRegex({ pattern: "WORLD", flags: "i", input: "hello world" })).toMatchObject({
      status: "ok",
      matches: [{ text: "world" }],
    })
  })

  it("supports unicode property escapes behind the u flag", () => {
    const result = runRegex({ pattern: "\\p{L}+", flags: "gu", input: "a1ß2" })
    expect(result).toMatchObject({
      status: "ok",
      matches: [
        { text: "a", index: 0 },
        { text: "ß", index: 2 },
      ],
    })
  })

  it("terminates zero-width global matches by advancing the cursor", () => {
    const result = runRegex({ pattern: "b*", flags: "g", input: "abc" })
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    // b* matches "" at 0 (before "a"), "b" at 1, "" at 2, "" at 3.
    expect(result.matches.map((match) => [match.text, match.index])).toEqual([
      ["", 0],
      ["b", 1],
      ["", 2],
      ["", 3],
    ])
  })

  it("stops collecting matches at the documented cap", () => {
    const result = runRegex({ pattern: "a", flags: "g", input: "a".repeat(maximumMatchCount + 5) })
    expect(result).toMatchObject({ status: "ok", truncated: true })
    if (result.status !== "ok") return
    expect(Array.isArray(result.matches)).toBe(true)
    expect(result.matches).toHaveLength(maximumMatchCount)
  })
})

describe("regex evaluation limits and failures", () => {
  it("rejects patterns over the length limit before compiling", () => {
    const result = runRegex({
      pattern: "a".repeat(maximumPatternLength + 1),
      flags: "",
      input: "a",
    })
    expect(result.status).toBe("over-limit")
  })

  it("accepts inputs at the byte limit and rejects larger ones", () => {
    expect(maximumInputBytes).toBe(128 * 1024)
    expect(isValidRegexInputSize("a".repeat(maximumInputBytes))).toBe(true)
    expect(isValidRegexInputSize("a".repeat(maximumInputBytes + 1))).toBe(false)
    // Four-byte code points reach the byte limit faster than the character count.
    expect(isValidRegexInputSize("😀".repeat(maximumInputBytes / 4 + 1))).toBe(false)

    const result = runRegex({
      pattern: "a",
      flags: "g",
      input: "😀".repeat(maximumInputBytes / 4 + 1),
    })
    expect(result.status).toBe("over-limit")
  })

  it("reports un-compilable patterns as invalid input", () => {
    const result = runRegex({ pattern: "(", flags: "g", input: "text" })
    expect(result.status).toBe("invalid")
    if (result.status !== "invalid") return
    expect(result.message.length).toBeGreaterThan(0)
    expect(result.message.length).toBeLessThanOrEqual(201)
  })

  it("rejects flags outside the narrow allowlist", () => {
    for (const flags of ["x", "ga", "z"]) {
      const result = runRegex({ pattern: "a", flags, input: "a" })
      expect(result.status).toBe("invalid")
    }
  })

  it("rejects duplicate flags as invalid input", () => {
    const result = runRegex({ pattern: "a", flags: "gg", input: "a" })
    expect(result.status).toBe("invalid")
  })

  it("stops a global scan once the soft time budget expires", () => {
    const result = runRegex(
      { pattern: "a", flags: "g", input: "a".repeat(1000), budgetMs: 0 },
      () => 10_000,
    )
    expect(result.status).toBe("timeout")
  })

  it("does not enforce the budget when no iteration runs", () => {
    const result = runRegex(
      { pattern: "missing", flags: "g", input: "a".repeat(1000), budgetMs: 0 },
      () => 10_000,
    )
    // Zero match iterations means the deadline check never fires; the run completes.
    expect(result.status).toBe("ok")
  })
})

describe("highlight segment building", () => {
  it("alternates plain and highlighted segments around matches", () => {
    const matches = runRegex({ pattern: "\\d+", flags: "g", input: "a12b345c" })
    if (matches.status !== "ok") throw new Error("expected ok")
    const segments = buildHighlightedSegments("a12b345c", matches.matches)
    expect(segments).toEqual([
      { text: "a", highlighted: false },
      { text: "12", highlighted: true },
      { text: "b", highlighted: false },
      { text: "345", highlighted: true },
      { text: "c", highlighted: false },
    ])
  })

  it("handles matches at both ends and no matches at all", () => {
    const atEnds = runRegex({ pattern: "\\d+", flags: "g", input: "1ab2" })
    if (atEnds.status !== "ok") throw new Error("expected ok")
    expect(buildHighlightedSegments("1ab2", atEnds.matches)).toEqual([
      { text: "1", highlighted: true },
      { text: "ab", highlighted: false },
      { text: "2", highlighted: true },
    ])
    expect(buildHighlightedSegments("plain", [])).toEqual([{ text: "plain", highlighted: false }])
    expect(buildHighlightedSegments("", [])).toEqual([])
  })

  it("skips zero-width matches and defensively ignores stale overlaps", () => {
    const zeroWidth = runRegex({ pattern: "b*", flags: "g", input: "ab" })
    if (zeroWidth.status !== "ok") throw new Error("expected ok")
    expect(buildHighlightedSegments("ab", zeroWidth.matches)).toEqual([
      { text: "a", highlighted: false },
      { text: "b", highlighted: true },
    ])

    expect(
      buildHighlightedSegments("abc", [
        { text: "bc", index: 1, groups: [] },
        { text: "b", index: 1, groups: [] },
      ]),
    ).toEqual([
      { text: "a", highlighted: false },
      { text: "bc", highlighted: true },
    ])
  })
})
