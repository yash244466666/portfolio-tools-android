/**
 * Pure unit-price comparison for the Unit Price Comparer. Quantities
 * normalize onto one base unit per measure (volume -> ml, mass -> g,
 * length -> m, count -> pc) and items rank cheapest per base unit within
 * their own measure family — an ml price and a gram price are not
 * comparable, so families never mix in a ranking. Ties break
 * deterministically by input order. Original work for this repository; no
 * upstream code is copied.
 */
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"

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

/** Parses a price with the shared bounded policy (clamped, disclosed).
 *  Prices keep their domain rule of at most 2 decimals. */
export function parsePrice(value: string): number | null {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) return null
  return parseBoundedDecimal(value, { minimum: minimumPrice, maximum: maximumPrice })?.value ?? null
}

/** True when the raw price was clamped into the supported range. */
export function priceClamped(value: string): boolean {
  const parsed = parseBoundedDecimal(value, { minimum: minimumPrice, maximum: maximumPrice })
  return parsed?.clamped ?? false
}

/**
 * Parses a quantity with the shared bounded policy. Zero is meaningless for
 * a per-unit price, so sub-minimum input rejects instead of clamping.
 */
export function parseQuantity(value: string): number | null {
  const parsed = parseBoundedDecimal(value, {
    minimum: minimumQuantity,
    maximum: maximumQuantity,
    outOfRange: "reject",
  })
  return parsed?.value ?? null
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
  /** 1-based cheapest rank within the item's own measure family. */
  rank: number
}

/**
 * Normalizes complete items and ranks them cheapest per base unit within
 * each measure family (ml, g, m, pc — never mixed, because families are not
 * comparable). Ties break deterministically by input order, so the same
 * inputs always produce the same table. Incomplete items are ignored.
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
      family: baseUnitFor(item.unit),
      baseQuantity: item.quantity * factor,
      pricePerBaseUnit: roundTo4(item.price / (item.quantity * factor)),
    }
  })

  // Family first (stable groups), then cheapest per base unit; stable sort
  // keeps input order inside a tie.
  const families: Array<"ml" | "g" | "m" | "pc"> = ["ml", "g", "m", "pc"]
  const sorted = [...withBase].sort((left, right) => {
    const familyOrder = families.indexOf(left.family) - families.indexOf(right.family)
    if (familyOrder !== 0) return familyOrder
    return left.pricePerBaseUnit - right.pricePerBaseUnit
  })

  let previousFamily: string | null = null
  let previousRank = 0
  let previousPrice = Number.NaN
  let positionInFamily = 0
  return sorted.map((item) => {
    if (item.family !== previousFamily) {
      previousFamily = item.family
      positionInFamily = 0
      previousRank = 0
      previousPrice = Number.NaN
    }
    positionInFamily += 1
    // Exact per-unit ties share the previous rank (competition ranking).
    const rank = previousPrice === item.pricePerBaseUnit ? previousRank : positionInFamily
    previousRank = rank
    previousPrice = item.pricePerBaseUnit
    return {
      label: item.label,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit,
      baseQuantity: item.baseQuantity,
      pricePerBaseUnit: item.pricePerBaseUnit,
      rank,
    }
  })
}

/** Formats a per-base-unit price as a currency-free 4-decimal string. */
export function formatUnitPrice(value: number): string {
  return value.toFixed(4)
}

function roundTo4(value: number): number {
  // Four decimals, half-up, with a relative-epsilon nudge because the quotient
  // can land just below the boundary in IEEE doubles: 0.15 / 1000 is
  // 0.00014999999999999999, so a true half rounded down to 0.0001 instead of up
  // to 0.0002. Same guard as `roundToCents` in `_shared/money.ts`. This matters
  // more here than in a display-only field, because `pricePerBaseUnit` is both
  // what the row shows and the key `rankUnitPrices` sorts and ties on, so a miss
  // reaches the ranking.
  return Math.round(value * 10000 * (1 + Number.EPSILON)) / 10000
}
