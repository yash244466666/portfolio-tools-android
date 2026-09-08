/**
 * Pure discount-and-tax computation for the Discount and Tax Calculator.
 *
 * All money is carried as integer cents and every derived amount is rounded
 * to whole cents exactly once with half-up rounding, so no float arithmetic
 * ever reaches the display: the only numbers shown are exact 2-decimal
 * renderings of integer cents. Original work for this repository; no
 * upstream code is copied.
 */

export const minimumPrice = 0
export const maximumPrice = 10_000_000

/** Parses a price string into clamped whole cents (0 - 10,000,000). */
export function parsePriceToCents(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  const cents = Math.round(parsed * 100)
  return Math.min(maximumPrice * 100, Math.max(minimumPrice * 100, cents))
}

/**
 * Single money-rounding point: half-up to whole cents. Every derived amount
 * passes through this function exactly once.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5)
}

/** Formats integer cents as an exact 2-decimal string; no floats displayed. */
export function formatCents(cents: number): string {
  const negative = cents < 0
  const absolute = Math.abs(Math.round(cents))
  const units = Math.floor(absolute / 100)
  const remainder = absolute % 100
  return `${negative ? "-" : ""}${units}.${String(remainder).padStart(2, "0")}`
}

/** Parses a percent string clamped into 0-100; null when invalid. */
export function parsePercent(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(100, parsed)
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
 * Computes the discount steps and the tax applied after the discount.
 * The flat discount never exceeds the price, so the subtotal never goes
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
    savedCents = roundToCents((priceCents * percent) / 100)
  } else {
    const flat = input.discountCents
    if (flat === undefined || !Number.isFinite(flat) || flat < 0) return null
    savedCents = Math.min(flat, priceCents)
  }

  const subtotalCents = priceCents - savedCents
  const taxCents = roundToCents((subtotalCents * taxPercent) / 100)
  return {
    savedCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
  }
}
