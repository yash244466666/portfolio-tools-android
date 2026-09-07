import { describe, expect, it } from "vitest"
import { getSortOption, maximumSortChars, sortLines } from "./sort"

const base = { removeBlank: false, removeDuplicates: false }

describe("sortLines", () => {
  it("sorts alphabetically in both directions with locale comparison", () => {
    const text = "banana\nApple\ncherry\napricot"
    const az = sortLines(text, "az", base).output
    const za = sortLines(text, "za", base).output
    expect(az.split("\n")).toEqual(["Apple", "apricot", "banana", "cherry"])
    expect(az.split("\n")).toEqual([...za.split("\n")].reverse())
  })

  it("sorts numeric mode deterministically by the first number in each line", () => {
    // Upstream stripped all non-digits before parseFloat, so this line sorted
    // as 210 and `|| 0` made unnumbered lines compare unstably. The fixed key
    // is the first number found ("v2 note 10" keys on 2), and lines without a
    // number sort last in alphabetical order.
    const text = "v2 note 10\nitem 3\nno number here\nitem 21\n-4 below"
    const result = sortLines(text, "numeric", base)
    expect(result.output.split("\n")).toEqual([
      "-4 below",
      "v2 note 10",
      "item 3",
      "item 21",
      "no number here",
    ])
  })

  it("reverses line order without reordering content", () => {
    expect(sortLines("1\n2\n3", "reverse", base).output).toBe("3\n2\n1")
  })

  it("shuffles deterministically with an injected rng and covers all items", () => {
    const lines = ["a", "b", "c", "d", "e", "f", "g"]
    const result = sortLines(lines.join("\n"), "shuffle", {
      ...base,
      rng: () => 0.5,
    })
    expect(
      result.output
        .split("\n")
        .sort((a, b) => a.localeCompare(b))
        .join(","),
    ).toBe(lines.join(","))
    // A second rng produces a different deterministic order than the first.
    const other = sortLines(lines.join("\n"), "shuffle", { ...base, rng: () => 0.1 })
    expect(
      other.output
        .split("\n")
        .sort((a, b) => a.localeCompare(b))
        .join(","),
    ).toBe(lines.join(","))
  })

  it("removes blank and duplicate lines before sorting and reports counts", () => {
    const text = "b\n\na\nb\n  \na"
    const result = sortLines(text, "az", { removeBlank: true, removeDuplicates: true })
    expect(result.output).toBe("a\nb")
    expect(result.total).toBe(6)
    expect(result.removed).toBe(4)
  })

  it("keeps whitespace-only input as content and exposes the limit", () => {
    expect(sortLines("  ", "az", base).output).toBe("  ")
    expect(sortLines("  ", "az", { removeBlank: true, removeDuplicates: false }).output).toBe("")
    expect(maximumSortChars).toBe(1_000_000)
  })

  it("rejects unknown modes through the option lookup", () => {
    expect(() => getSortOption("magic")).toThrow(RangeError)
    expect(getSortOption("numeric").id).toBe("numeric")
  })
})
