import { describe, expect, it } from "vitest"
import {
  computeDiscountTax,
  formatCents,
  maximumPrice,
  parsePercent,
  parsePriceToCents,
  roundToCents,
} from "./discount-tax"

describe("parsePriceToCents", () => {
  it("accepts 2-decimal money and clamps into the 0-10M range", () => {
    expect(parsePriceToCents("19.99")).toBe(1999)
    expect(parsePriceToCents("100")).toBe(10000)
    expect(parsePriceToCents("0")).toBe(0)
    expect(parsePriceToCents("99999999.99")).toBe(maximumPrice * 100)
  })

  it("rejects junk, negatives, and 3-decimal money", () => {
    expect(parsePriceToCents("-5")).toBeNull()
    expect(parsePriceToCents("1.999")).toBeNull()
    expect(parsePriceToCents("abc")).toBeNull()
    expect(parsePriceToCents("")).toBeNull()
    expect(parsePriceToCents("1,000")).toBeNull()
  })
})

describe("roundToCents and formatCents", () => {
  it("rounds half-up exactly once and never shows float noise", () => {
    expect(roundToCents(1999.5)).toBe(2000)
    expect(roundToCents(1999.4999)).toBe(1999)
    expect(formatCents(1500)).toBe("15.00")
    expect(formatCents(5)).toBe("0.05")
    expect(formatCents(1_000_000_05)).toBe("1000000.05")
    expect(formatCents(-250)).toBe("-2.50")
    // The classic float trap stays exact end to end.
    const result = computeDiscountTax({
      priceCents: 1000,
      mode: "percent",
      discountPercent: 10,
      taxPercent: 10,
    })
    expect(result?.subtotalCents).toBe(900)
    expect(result?.taxCents).toBe(90)
    expect(formatCents(result?.totalCents ?? 0)).toBe("9.90")
  })
})

describe("parsePercent", () => {
  it("accepts 0-100 and clamps above 100", () => {
    expect(parsePercent("7.5")).toBe(7.5)
    expect(parsePercent("0")).toBe(0)
    expect(parsePercent("150")).toBe(100)
  })

  it("rejects negatives and junk", () => {
    expect(parsePercent("-1")).toBeNull()
    expect(parsePercent("ten")).toBeNull()
    expect(parsePercent("")).toBeNull()
  })
})

describe("computeDiscountTax", () => {
  it("applies a percent discount and then the tax step by step", () => {
    // 100.00, 25% off, 8% tax: saved 25.00, subtotal 75.00, tax 6.00, total 81.00
    const result = computeDiscountTax({
      priceCents: 10000,
      mode: "percent",
      discountPercent: 25,
      taxPercent: 8,
    })
    expect(result).toEqual({
      savedCents: 2500,
      subtotalCents: 7500,
      taxCents: 600,
      totalCents: 8100,
    })
  })

  it("applies a flat discount capped at the price", () => {
    expect(
      computeDiscountTax({
        priceCents: 5000,
        mode: "flat",
        discountCents: 1200,
        taxPercent: 10,
      }),
    ).toEqual({ savedCents: 1200, subtotalCents: 3800, taxCents: 380, totalCents: 4180 })
    // A flat discount larger than the price saves everything, never less.
    expect(
      computeDiscountTax({
        priceCents: 5000,
        mode: "flat",
        discountCents: 99999,
        taxPercent: 10,
      }),
    ).toEqual({ savedCents: 5000, subtotalCents: 0, taxCents: 0, totalCents: 0 })
  })

  it("handles boundary percents", () => {
    expect(
      computeDiscountTax({
        priceCents: 10000,
        mode: "percent",
        discountPercent: 0,
        taxPercent: 0,
      }),
    ).toEqual({ savedCents: 0, subtotalCents: 10000, taxCents: 0, totalCents: 10000 })
    expect(
      computeDiscountTax({
        priceCents: 10000,
        mode: "percent",
        discountPercent: 100,
        taxPercent: 100,
      }),
    ).toEqual({ savedCents: 10000, subtotalCents: 0, taxCents: 0, totalCents: 0 })
  })

  it("rounds each derived amount to whole cents exactly once", () => {
    // 9.99 at 15% off: saved 1.4985 -> 1.50 (150); subtotal 8.49 (849);
    // 8% tax: 0.6792 -> 68; total 9.17.
    const result = computeDiscountTax({
      priceCents: 999,
      mode: "percent",
      discountPercent: 15,
      taxPercent: 8,
    })
    expect(result).toEqual({
      savedCents: 150,
      subtotalCents: 849,
      taxCents: 68,
      totalCents: 917,
    })
  })

  it("rejects invalid prices, percents, and missing inputs", () => {
    expect(
      computeDiscountTax({ priceCents: -1, mode: "percent", discountPercent: 10, taxPercent: 5 }),
    ).toBeNull()
    expect(
      computeDiscountTax({ priceCents: 100, mode: "percent", discountPercent: 150, taxPercent: 5 }),
    ).toBeNull()
    expect(
      computeDiscountTax({
        priceCents: 100,
        mode: "percent",
        discountPercent: 10,
        taxPercent: 150,
      }),
    ).toBeNull()
    expect(computeDiscountTax({ priceCents: 100, mode: "flat", taxPercent: 5 })).toBeNull()
    expect(
      computeDiscountTax({ priceCents: 100, mode: "flat", discountCents: -5, taxPercent: 5 }),
    ).toBeNull()
  })
})
