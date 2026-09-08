/**
 * Pure discount-and-tax computation for the Discount and Tax Calculator.
 *
 * All money is carried as integer cents and every derived amount is rounded
 * to whole cents exactly once, so no float arithmetic ever reaches the
 * display: the only numbers shown are exact 2-decimal renderings of integer
 * cents. Percent amounts go through the shared exact integer path
 * (`percentOfCentsHalfUp`), because a float product can lose the half cent
 * (250.00 at 0.29% is exactly 72.5 cents). Original work for this
 * repository; no upstream code is copied.
 */
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"
import { percentOfCentsHalfUp } from "@/tools/_shared/money"

export const minimumPrice = 0
export const maximumPrice = 10_000_000

/** Parses a price string into clamped whole cents (0 - 10,000,000). */
export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const parsed = parseBoundedDecimal(trimmed, { minimum: minimumPrice, maximum: maximumPrice })
  if (!parsed) return null
  return Math.round(parsed.value * 100)
}

/** Formats integer cents as an exact 2-decimal string; no floats displayed. */
export function formatCents(cents: number): string {
  const negative = cents < 0
  const absolute = Math.abs(Math.round(cents))
  const units = Math.floor(absolute / 100)
  const remainder = absolute % 100
  return `${negative ? "-" : ""}${units}.${String(remainder).padStart(2, "0")}`
}

/**
 * Parses a percent with the shared policy: percents are promised to be
 * 0-100, so out-of-range input is rejected, never silently clamped.
 */
export function parsePercent(value: string): number | null {
  const parsed = parseBoundedDecimal(value, {
    minimum: 0,
    maximum: 100,
    outOfRange: "reject",
  })
  return parsed ? parsed.value : null
}

export type DiscountMode = "percent" | "flat"

export interface DiscountTaxInput {
  /** Whole-cents original price. */
  priceCents: number
  mode: DiscountMode
  /** Discount percent (0-100) when mode is "percent". */
  discountPercent?: number
  /** Whole-cents flat discount when mode is "flat". */
  discountCents?: number
  /** Tax percent (0-100), applied after the discount. */
  taxPercent: number
}

export interface DiscountTaxResult {
  /** Whole-cents amounts, each rounded once. */
  savedCents: number
  subtotalCents: number
  taxCents: number
  totalCents: number
}

/**
 * Computes the discount steps and the tax applied after the discount. The
 * flat discount never exceeds the price, so the subtotal never goes
 * negative.
 */
export function computeDiscountTax(input: DiscountTaxInput): DiscountTaxResult | null {
  const { priceCents, mode, taxPercent } = input
  if (!Number.isFinite(priceCents) || priceCents < 0) return null
  if (!Number.isFinite(taxPercent) || taxPercent < 0 || taxPercent > 100) return null

  let savedCents: number
  if (mode === "percent") {
    const percent = input.discountPercent
    if (percent === undefined || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      return null
    }
    savedCents = percentOfCentsHalfUp(priceCents, percent)
  } else {
    const flat = input.discountCents
    if (flat === undefined || !Number.isFinite(flat) || flat < 0) return null
    savedCents = Math.min(flat, priceCents)
  }

  const subtotalCents = priceCents - savedCents
  const taxCents = percentOfCentsHalfUp(subtotalCents, taxPercent)
  return {
    savedCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  }
}
