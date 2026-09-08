import { describe, expect, it } from "vitest"
import type { CompareItem } from "./unit-price"
import {
  baseUnitFor,
  factorToBase,
  formatUnitPrice,
  maximumItems,
  parsePrice,
  parseQuantity,
  rankUnitPrices,
} from "./unit-price"

describe("units and normalization", () => {
  it("maps each unit onto one base unit with the right factor", () => {
    expect(baseUnitFor("l")).toBe("ml")
    expect(baseUnitFor("kg")).toBe("g")
    expect(baseUnitFor("m")).toBe("m")
    expect(baseUnitFor("pc")).toBe("pc")
    expect(factorToBase("l")).toBe(1000)
    expect(factorToBase("kg")).toBe(1000)
    expect(factorToBase("ml")).toBe(1)
    expect(factorToBase("g")).toBe(1)
  })
})

describe("parsing", () => {
  it("accepts bounded prices and rejects junk", () => {
    expect(parsePrice("3.49")).toBe(3.49)
    expect(parsePrice("0")).toBe(0)
    expect(parsePrice("-1")).toBeNull()
    expect(parsePrice("3.999")).toBeNull()
    expect(parsePrice("")).toBeNull()
  })

  it("requires a positive quantity and clamps the magnitude", () => {
    expect(parseQuantity("0.5")).toBe(0.5)
    expect(parseQuantity("0")).toBeNull()
    expect(parseQuantity("-2")).toBeNull()
    expect(parseQuantity("5000000")).toBe(1_000_000)
    expect(parseQuantity("3.")).toBeNull()
  })
})

describe("rankUnitPrices", () => {
  it("ranks cheapest per base unit first across mixed units", () => {
    // 1.5 l for 4.50 -> 3.00 per l -> 0.003 per ml; 500 ml for 2.00 ->
    // 0.004 per ml. The liter bottle is cheaper per ml.
    const ranked = rankUnitPrices([
      { label: "Bottle", price: 4.5, quantity: 1.5, unit: "l" },
      { label: "Carton", price: 2, quantity: 500, unit: "ml" },
    ])
    expect(ranked.map((item) => item.label)).toEqual(["Bottle", "Carton"])
    expect(ranked[0]?.baseQuantity).toBe(1500)
    expect(ranked[0]?.rank).toBe(1)
  })

  it("ignores incomplete items so partial rows never rank", () => {
    const ranked = rankUnitPrices([
      { label: "Complete", price: 5, quantity: 1, unit: "kg" },
      { label: "Missing price", price: Number.NaN, quantity: 2, unit: "kg" },
      { label: "Zero quantity", price: 5, quantity: 0, unit: "kg" },
    ])
    expect(ranked).toHaveLength(1)
    expect(ranked[0]?.label).toBe("Complete")
    expect(ranked[0]?.baseQuantity).toBe(1000)
  })

  it("breaks ties deterministically by input order", () => {
    const items = [
      { label: "First", price: 2, quantity: 1, unit: "kg" },
      { label: "Second", price: 4, quantity: 2, unit: "kg" },
      { label: "Third", price: 6, quantity: 3, unit: "kg" },
    ] satisfies CompareItem[]
    const ranked = rankUnitPrices(items)
    expect(ranked.map((item) => item.rank)).toEqual([1, 1, 1])
    expect(ranked.map((item) => item.label)).toEqual(["First", "Second", "Third"])
    // Reversing the inputs keeps per-unit prices equal and keeps ranks tied,
    // with the same deterministic order-by-input behavior.
    const reversed = rankUnitPrices([...items].reverse())
    expect(reversed.map((item) => item.rank)).toEqual([1, 1, 1])
    expect(reversed.map((item) => item.label)).toEqual(["Third", "Second", "First"])
  })

  it("keeps different measures separately comparable per base unit", () => {
    // 2.00 per kg vs 0.0025 per g is the same per-unit price after
    // normalization; here 1 kg for 3.00 -> 0.003/g loses to 500 g for 1.00.
    const ranked = rankUnitPrices([
      { label: "Big bag", price: 3, quantity: 1, unit: "kg" },
      { label: "Small bag", price: 1, quantity: 500, unit: "g" },
    ])
    expect(ranked[0]?.label).toBe("Small bag")
    expect(formatUnitPrice(ranked[0]?.pricePerBaseUnit ?? 0)).toBe("0.0020")
    expect(formatUnitPrice(ranked[1]?.pricePerBaseUnit ?? 0)).toBe("0.0030")
  })

  it("caps the batch at four items by contract", () => {
    expect(maximumItems).toBe(4)
  })
})
