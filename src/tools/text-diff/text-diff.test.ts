import { describe, expect, it } from "vitest"
import {
  checkDiffSide,
  diffText,
  markLines,
  maximumSideLength,
  maximumSideLineCount,
} from "./text-diff"

describe("checkDiffSide", () => {
  it("flags character and line overruns", () => {
    expect(checkDiffSide("short")).toEqual({ overChars: false, overLines: false })
    expect(checkDiffSide("x".repeat(maximumSideLength + 1)).overChars).toBe(true)
    expect(checkDiffSide(`${"l\n".repeat(maximumSideLineCount)}l`).overLines).toBe(true)
    expect(checkDiffSide("").overLines).toBe(false)
  })
})

describe("diffText", () => {
  it("reports unchanged text with zero changes", () => {
    const result = diffText("same\nlines", "same\nlines")
    expect(result.parts).toHaveLength(1)
    expect(result.parts[0]?.type).toBe("unchanged")
    expect(result.addedLines).toBe(0)
    expect(result.removedLines).toBe(0)
    expect(result.unchangedLines).toBe(2)
  })

  it("counts added and removed lines explicitly", () => {
    const result = diffText("a\nb\nc", "a\nx\nc\nnew")
    // jsdiff's diffLines groups whole unaligned hunks, so "b\nc" is one
    // removed block and "x\nc\nnew" one added block.
    expect(result.addedLines).toBe(3)
    expect(result.removedLines).toBe(2)
    expect(result.unchangedLines).toBe(1)
    const added = result.parts.find((part) => part.type === "added")
    const removed = result.parts.find((part) => part.type === "removed")
    expect(added?.value).toContain("x")
    expect(added?.value).toContain("new")
    expect(removed?.value).toContain("b")
  })

  it("keeps counts correct when a part is the whole text", () => {
    const result = diffText("one", "two")
    expect(result.addedLines).toBe(1)
    expect(result.removedLines).toBe(1)
    expect(result.unchangedLines).toBe(0)
  })

  it("handles multi-line added blocks as one part", () => {
    const result = diffText("", "one\ntwo\nthree")
    expect(result.addedLines).toBe(3)
    expect(result.parts[0]?.lines).toBe(3)
  })

  it("treats empty inputs as zero-change comparisons", () => {
    expect(diffText("", "")).toEqual({
      parts: [],
      addedLines: 0,
      removedLines: 0,
      unchangedLines: 0,
    })
  })

  it("separates changed from trailing unchanged context", () => {
    const result = diffText("keep\nold\nkeep2", "keep\nnew\nkeep2")
    expect(result.parts.map((part) => part.type)).toEqual([
      "unchanged",
      "removed",
      "added",
      "unchanged",
    ])
  })
})

describe("markLines", () => {
  it("marks each line without duplicating the trailing empty element", () => {
    expect(markLines("a\nb\n", "+")).toBe("+ a\n+ b")
    expect(markLines("a", "-")).toBe("- a")
    expect(markLines("", " ")).toBe("")
  })
})
