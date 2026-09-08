/**
 * Pure unit-price comparison for the Unit Price Comparer. Quantities
 * normalize onto one base unit per measure (volume -> ml, mass -> g,
 * length -> m, count -> pc) and items rank cheapest per base unit first,
 * with deterministic tie-breaking by input order. Original work for this
 * repository; no upstream code is copied.
 */

export const maximumItems = 4
export const minimumPrice = 0
/** Prices clamp into a sane bounded range. */
export const maximumPrice = 1_000_000
export const minimumQuantity = 0.0001
export const maximumQuantity = 1_000_000

export type MeasureUnit = "ml" | "l" | "g" | "kg" | "m" | "pc"

export const measureUnits: readonly MeasureUnit[] = ["ml", "l", "g", "kg", "m", "pc"]

/** Base unit per measure; every per-unit price normalizes onto it. */
export function baseUnitFor(unit: MeasureUnit): "ml" | "g" | "m" | "pc" {
  switch (unit) {
    case "ml":
    case "l":
      return "ml"
    case "g":
    case "kg":
      return "g"
    case "m":
      return "m"
    case "pc":
      return "pc"
  }
}

/** Factor that converts a quantity of `unit` onto its base unit. */
export function factorToBase(unit: MeasureUnit): number {
  switch (unit) {
    case "l":
    case "kg":
      return 1000
    default:
      return 1
  }
}

/** Parses a price string clamped into 0 - 1,000,000; null when invalid. */
export function parsePrice(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(maximumPrice, Math.max(minimumPrice, parsed))
}

/**
 * Parses a quantity string clamped into (0, 1,000,000]; zero and negatives
 * are invalid because a per-unit price would be undefined.
 */
export function parseQuantity(value: string): number | null {
  const trimmed = value.trim()
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  if (parsed <= 0) return null
  return Math.min(maximumQuantity, Math.max(minimumQuantity, parsed))
}

export interface CompareItem {
  /** Optional free-text label; unnamed items get a positional default. */
  label: string
  price: number
  quantity: number
  unit: MeasureUnit
}

export interface RankedItem {
  label: string
  price: number
  quantity: number
  unit: MeasureUnit
  /** Quantity converted onto the base unit of the measure. */
  baseQuantity: number
  /** Price per base unit (ml/g/m/pc), rounded to 4 decimals for display. */
  pricePerBaseUnit: number
  /** 1-based cheapest rank; shared ranks reflect exact per-unit ties. */
  rank: number
}

/**
 * Normalizes complete items and ranks them cheapest per base unit first.
 * Ties break deterministically by input order, so the same inputs always
 * produce the same table. Incomplete items are ignored.
 */
export function rankUnitPrices(items: CompareItem[]): RankedItem[] {
  const complete = items.filter(
    (item) =>
      Number.isFinite(item.price) &&
      item.price >= minimumPrice &&
      item.price <= maximumPrice &&
      Number.isFinite(item.quantity) &&
      item.quantity > 0,
  )

  const withBase = complete.map((item) => {
    const factor = factorToBase(item.unit)
    return {
      label: item.label,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      baseQuantity: item.quantity * factor,
      pricePerBaseUnit: roundTo4(item.price / (item.quantity * factor)),
    }
  })

  const sorted = [...withBase].sort((left, right) => left.pricePerBaseUnit - right.pricePerBaseUnit)
  let previousRank = 0
  let previousPrice = Number.NaN
  return sorted.map((item, index) => {
    const rank = index > 0 && previousPrice === item.pricePerBaseUnit ? previousRank : index + 1
    previousRank = rank
    previousPrice = item.pricePerBaseUnit
    return { ...item, rank }
  })
}

/** Formats a per-base-unit price as a currency-free 4-decimal string. */
export function formatUnitPrice(value: number): string {
  return value.toFixed(4)
}

function roundTo4(value: number): number {
  return Math.round(value * 10000) / 10000
}
