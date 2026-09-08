/**
 * Pure fuel and trip cost computation for the Fuel and Trip Cost
 * Calculator. Original work for this repository; no upstream code is
 * copied.
 *
 * Money discipline: litres stay a bounded decimal (3 places) and every
 * cost amount rounds to whole cents exactly once through the shared
 * half-up rounding, so displayed totals and splits never show float noise.
 */
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"
import { roundToCents } from "@/tools/_shared/money"

export const minimumDistanceKm = 0.1
export const maximumDistanceKm = 100_000
/** Efficiency bounds for the km/l mode. */
export const minimumKmPerLitre = 0.1
export const maximumKmPerLitre = 50
/** Efficiency bounds for the l/100km mode. */
export const minimumLitresPer100Km = 0.1
export const maximumLitresPer100Km = 100
export const maximumFuelPricePerLitre = 1_000
export const minimumPassengers = 1
export const maximumPassengers = 99

export type EfficiencyMode = "km-per-litre" | "litres-per-100km"

/** Parses the trip distance, clamped into 0.1 - 100,000 km. */
export function parseDistanceKm(value: string): number | null {
  return (
    parseBoundedDecimal(value, {
      minimum: minimumDistanceKm,
      maximum: maximumDistanceKm,
    })?.value ?? null
  )
}

/**
 * Parses the fuel efficiency in the active mode: 0.1-50 km/l, or
 * 0.1-100 l/100km. Clamped with the flag disclosed by the caller.
 */
export function parseEfficiency(
  value: string,
  mode: EfficiencyMode,
): { value: number; clamped: boolean } | null {
  return mode === "km-per-litre"
    ? parseBoundedDecimal(value, { minimum: minimumKmPerLitre, maximum: maximumKmPerLitre })
    : parseBoundedDecimal(value, {
        minimum: minimumLitresPer100Km,
        maximum: maximumLitresPer100Km,
      })
}

/** Parses the fuel price per litre, clamped into 0 - 1,000 (2-decimal money). */
export function parseFuelPrice(value: string): number | null {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value.trim())) return null
  return (
    parseBoundedDecimal(value, { minimum: 0, maximum: maximumFuelPricePerLitre })?.value ?? null
  )
}

/** Parses the passenger count, clamped into 1 - 99 (whole numbers only). */
export function parsePassengers(value: string): number | null {
  const parsed = parseBoundedDecimal(value, {
    minimum: minimumPassengers,
    maximum: maximumPassengers,
  })
  if (!parsed || !Number.isInteger(parsed.value)) return null
  return parsed.value
}

/** Converts km/l to l/100km (0.1-50 km/l maps onto 100,000 - 10 l/100km). */
export function kmPerLitreToLitresPer100Km(kmPerLitre: number): number | null {
  if (!Number.isFinite(kmPerLitre) || kmPerLitre <= 0) return null
  return Math.round((100 / kmPerLitre) * 1000) / 1000
}

/** Converts l/100km to km/l (both directions of the same ratio). */
export function litresPer100KmToKmPerLitre(litresPer100Km: number): number | null {
  if (!Number.isFinite(litresPer100Km) || litresPer100Km <= 0) return null
  return Math.round((100 / litresPer100Km) * 1000) / 1000
}

export interface TripInput {
  /** Trip distance in kilometres (doubled for round trips by the caller). */
  distanceKm: number
  efficiency: number
  mode: EfficiencyMode
  /** Fuel price per litre, in currency units. */
  fuelPricePerLitre: number
  passengers: number
}

export interface TripCost {
  /** Fuel needed for the trip, in litres (3 decimals). */
  litres: number
  /** Whole cents of total fuel cost. */
  totalCostCents: number
  /** Whole cents per passenger (half-up; splits may not sum exactly). */
  perPassengerCents: number
  passengers: number
}

/**
 * Computes litres needed, total cost, and the per-passenger split. The
 * per-passenger amount rounds independently (half-up), so the disclosed
 * split can differ from an even division by a cent.
 */
export function computeTripCost(input: TripInput): TripCost | null {
  const { distanceKm, efficiency, mode, fuelPricePerLitre, passengers } = input
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null
  if (!Number.isFinite(fuelPricePerLitre) || fuelPricePerLitre < 0) return null
  if (!Number.isInteger(passengers) || passengers <= 0) return null

  let litresPerKm: number
  if (mode === "km-per-litre") {
    if (!Number.isFinite(efficiency) || efficiency <= 0) return null
    litresPerKm = 1 / efficiency
  } else {
    if (!Number.isFinite(efficiency) || efficiency <= 0) return null
    litresPerKm = efficiency / 100
  }

  const litres = Math.round(distanceKm * litresPerKm * 1000) / 1000
  // Total cost: litres x price per litre, rounded to cents exactly once.
  const totalCostCents = Math.round(
    (roundToCents(litres * fuelPricePerLitre) + Number.EPSILON) * 100,
  )
  return {
    litres,
    totalCostCents,
    perPassengerCents: Math.round(totalCostCents / passengers + Number.EPSILON * totalCostCents),
    passengers,
  }
}

/** Formats litres with 3 decimals for display. */
export function formatLitres(litres: number): string {
  return `${(Math.round(litres * 1000) / 1000).toFixed(3)} l`
}
