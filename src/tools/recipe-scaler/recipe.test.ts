import { describe, expect, it } from "vitest"
import {
  formatScaleFactor,
  maximumIngredientLineChars,
  maximumIngredients,
  maximumRecipeChars,
  parseQuantity,
  scaleRecipe,
} from "./recipe"

function scale(originalServings: string, desiredServings: string, text: string) {
  return scaleRecipe({ originalServings, desiredServings, text })
}

describe("parseQuantity", () => {
  it("parses whole numbers, decimals, fractions, mixed numbers, and vulgar fractions", () => {
    expect(parseQuantity("2")).toBe(2)
    expect(parseQuantity("1.5")).toBe(1.5)
    expect(parseQuantity(".5")).toBe(0.5)
    expect(parseQuantity("1/2")).toBe(0.5)
    expect(parseQuantity("1 1/2")).toBe(1.5)
    expect(parseQuantity("½")).toBe(0.5)
    expect(parseQuantity("1½")).toBe(1.5)
    expect(parseQuantity("2 ⅓")).toBeCloseTo(2.333333, 5)
  })

  it("rejects ranges, malformed input, negatives, zero denominators, and oversized values", () => {
    expect(parseQuantity("2-3")).toBeNull()
    expect(parseQuantity("1/0")).toBeNull()
    expect(parseQuantity("-2")).toBeNull()
    expect(parseQuantity("2..5")).toBeNull()
    expect(parseQuantity("2cups")).toBeNull()
    expect(parseQuantity("1000001")).toBeNull()
    expect(parseQuantity("")).toBeNull()
  })
})

describe("scaleRecipe", () => {
  it("scales quantities, units, ranges, and countable items", () => {
    const result = scale(
      "4",
      "8",
      [
        "2 cups flour",
        "1 1/2 tsp salt",
        "1/2 cup sugar",
        "2-3 cloves garlic",
        "2 eggs",
        "salt to taste",
        "For the sauce",
      ].join("\n"),
    )
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.factor).toBe(2)
    expect(result.lines.map((line) => line.scaled)).toEqual([
      "4 cups flour",
      "3 tsp salt",
      "1 cup sugar",
      "4–6 cloves garlic",
      "4 eggs",
      "salt to taste",
      "For the sauce",
    ])
    expect(result.unscaledCount).toBe(2)
  })

  it("keeps the original text untouched when the serving count does not change", () => {
    const result = scale("4", "4", "1 1/2 cups milk\n2 ⅓ tbsp sugar")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.factor).toBe(1)
    expect(result.lines.map((line) => line.scaled)).toEqual(["1 1/2 cups milk", "2 ⅓ tbsp sugar"])
  })

  it("uses decimals for metric units and fractions for kitchen units", () => {
    const result = scale("2", "3", "100 g flour\n1/3 cup oil\n1/4 tsp salt\n1 1/8 cups water")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.lines.map((line) => line.scaled)).toEqual([
      "150 g flour",
      "1/2 cup oil",
      "3/8 tsp salt",
      "1 11/16 cups water",
    ])
  })

  it("scales vulgar fractions, mixed ranges, and unitless counts", () => {
    const result = scale("1", "1.5", "1½ cups milk\n1 1/2-2 tsp vanilla\n3 large eggs")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.lines.map((line) => line.scaled)).toEqual([
      "2 1/4 cups milk",
      "2 1/4–3 tsp vanilla",
      "4 1/2 large eggs",
    ])
  })

  it("rounds exact metric half-hundredths up", () => {
    // 0.67 g at 1.5 servings is exactly 1.005 g.
    const result = scale("2", "3", "0.67 g salt")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.lines[0]?.scaled).toBe("1.01 g salt")
  })

  it("formats tiny metric values honestly and leaves blank lines out", () => {
    const result = scale("10", "1", "0.05 g saffron\n\n")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0]?.scaled).toBe("<0.01 g saffron")
  })

  it("reports malformed quantified lines with their line number", () => {
    const malformed = scale("2", "4", "2 cups flour\n2..5 cups sugar")
    expect(malformed).toEqual({
      status: "error",
      message:
        "Line 2: the leading quantity is not a supported whole number, decimal, or fraction.",
    })
    const zeroDenominator = scale("2", "4", "1/0 cups sugar")
    expect(zeroDenominator.status).toBe("error")
  })

  it("rejects invalid servings, out-of-range factors, and bounded input", () => {
    expect(scale("", "4", "1 cup flour").status).toBe("error")
    expect(scale("0", "4", "1 cup flour").status).toBe("error")
    expect(scale("2", "0.01", "1 cup flour").status).toBe("error")
    expect(scale("1", "1000", "1 cup flour").status).toBe("error")
    expect(scale("2", "4", `${"a".repeat(maximumIngredientLineChars + 1)}`).status).toBe("error")
    expect(
      scale("2", "4", Array.from({ length: maximumIngredients + 1 }, () => "1 cup x").join("\n"))
        .status,
    ).toBe("error")
    expect(scale("2", "4", "x".repeat(maximumRecipeChars + 1)).status).toBe("error")
  })

  it("returns an empty result for an empty ingredient list", () => {
    const result = scale("4", "6", "")
    expect(result.status).toBe("ok")
    if (result.status !== "ok") return
    expect(result.lines).toEqual([])
    expect(result.factor).toBe(1.5)
  })
})

describe("formatScaleFactor", () => {
  it("trims float noise", () => {
    expect(formatScaleFactor(1)).toBe("1")
    expect(formatScaleFactor(1.5)).toBe("1.5")
    expect(formatScaleFactor(2 / 3)).toBe("0.667")
  })
})
