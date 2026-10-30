import { describe, expect, it } from "vitest"
import { formatCents as formatMoney } from "@/tools/_shared/money"
import {
  computeTripCost,
  formatLitres,
  efficiencyToOppositeMode,
  parseDistanceKm,
  parseEfficiency,
  parseFuelPrice,
  parsePassengers,
} from "./fuel-trip"

describe("parsing", () => {
  it("clamps the distance into 0.1-100,000 km", () => {
    expect(parseDistanceKm("150")).toEqual({ value: 150, clamped: false })
    expect(parseDistanceKm("0.05")).toEqual({ value: 0.1, clamped: true })
    expect(parseDistanceKm("200000")).toEqual({ value: 100_000, clamped: true })
    expect(parseDistanceKm("")).toBeNull()
  })

  it("applies mode-specific efficiency bounds", () => {
    expect(parseEfficiency("6.5", "km-per-litre")).toEqual({ value: 6.5, clamped: false })
    expect(parseEfficiency("60", "km-per-litre")).toEqual({ value: 50, clamped: true })
    expect(parseEfficiency("7.5", "litres-per-100km")).toEqual({ value: 7.5, clamped: false })
    expect(parseEfficiency("200", "litres-per-100km")).toEqual({ value: 100, clamped: true })
    expect(parseEfficiency("", "km-per-litre")).toBeNull()
  })

  it("clamps the fuel price and validates whole passenger counts", () => {
    expect(parseFuelPrice("1.85")).toEqual({ value: 1.85, clamped: false })
    expect(parseFuelPrice("2000")).toEqual({ value: 1000, clamped: true })
    expect(parseFuelPrice("1.999")).toBeNull()
    // Integrality is validated on the raw value before clamping, so both
    // fractional inputs reject instead of one silently rounding.
    expect(parsePassengers("3")).toEqual({ value: 3, clamped: false })
    expect(parsePassengers("2.5")).toBeNull()
    expect(parsePassengers("0.5")).toBeNull()
    expect(parsePassengers("0")).toEqual({ value: 1, clamped: true })
  })
})

describe("efficiency conversion", () => {
  it("converts both ways with known vectors", () => {
    // 5 l/100km is 20 km/l.
    expect(efficiencyToOppositeMode(20, "km-per-litre")).toBe(5)
    expect(efficiencyToOppositeMode(5, "litres-per-100km")).toBe(20)
    // 6.5 km/l = 15.385 l/100km.
    expect(efficiencyToOppositeMode(6.5, "km-per-litre")).toBe(15.385)
    expect(efficiencyToOppositeMode(15.385, "litres-per-100km")).toBe(6.5)
  })

  it("clamps the converted value into the destination bounds", () => {
    // 0.1 km/l would convert to 1000 l/100km, far above the 100 bound.
    expect(efficiencyToOppositeMode(0.1, "km-per-litre")).toBe(100)
    // 1000 l/100km would convert to 0.1 km/l, at the floor already.
    expect(efficiencyToOppositeMode(1000, "litres-per-100km")).toBe(0.1)
  })

  it("rejects non-positive efficiencies", () => {
    expect(efficiencyToOppositeMode(0, "km-per-litre")).toBeNull()
    expect(efficiencyToOppositeMode(-1, "litres-per-100km")).toBeNull()
  })
})

describe("computeTripCost", () => {
  it("computes litres, total, and an even split", () => {
    // 150 km at 6.5 km/l = 23.077 l at 1.85/l = 42.69 total; 3 passengers.
    const result = computeTripCost({
      distanceKm: 150,
      efficiency: 6.5,
      mode: "km-per-litre",
      fuelPricePerLitre: 1.85,
      passengers: 3,
    })
    expect(formatLitres(result?.litres ?? 0)).toBe("23.077 l")
    expect(formatMoney(result?.totalCostCents ?? 0)).toBe("42.69")
    expect(formatMoney(result?.perPassengerCents ?? 0)).toBe("14.23")
  })

  it("doubles the distance for a round trip", () => {
    const oneWay = computeTripCost({
      distanceKm: 100,
      efficiency: 5,
      mode: "litres-per-100km",
      fuelPricePerLitre: 2,
      passengers: 1,
    })
    const roundTrip = computeTripCost({
      distanceKm: 200,
      efficiency: 5,
      mode: "litres-per-100km",
      fuelPricePerLitre: 2,
      passengers: 1,
    })
    // 5 l/100km over 100 km = 5 l = 10.00; doubled = 20.00.
    expect(formatMoney(oneWay?.totalCostCents ?? 0)).toBe("10.00")
    expect(formatMoney(roundTrip?.totalCostCents ?? 0)).toBe("20.00")
  })

  it("rounds an exact half-cent total up", () => {
    // 11 km at 5.2 km/l at 1.17/l is exactly 2.475, i.e. 247.5 cents.
    const result = computeTripCost({
      distanceKm: 11,
      efficiency: 5.2,
      mode: "km-per-litre",
      fuelPricePerLitre: 1.17,
      passengers: 1,
    })
    expect(result?.totalCostCents).toBe(248)
  })

  it("works in the litres-per-100km mode", () => {
    // 200 km at 7.5 l/100km = 15 l at 1.80/l = 27.00.
    const result = computeTripCost({
      distanceKm: 200,
      efficiency: 7.5,
      mode: "litres-per-100km",
      fuelPricePerLitre: 1.8,
      passengers: 2,
    })
    expect(formatLitres(result?.litres ?? 0)).toBe("15.000 l")
    expect(formatMoney(result?.totalCostCents ?? 0)).toBe("27.00")
    expect(formatMoney(result?.perPassengerCents ?? 0)).toBe("13.50")
  })

  it("rounds the per-passenger split half-up independently", () => {
    // 25.00 over 3 passengers: 8.34 each (the split may not sum exactly).
    const result = computeTripCost({
      distanceKm: 250,
      efficiency: 5,
      mode: "litres-per-100km",
      fuelPricePerLitre: 2,
      passengers: 3,
    })
    expect(formatMoney(result?.totalCostCents ?? 0)).toBe("25.00")
    expect(formatMoney(result?.perPassengerCents ?? 0)).toBe("8.33")
  })

  it("rejects invalid distances, efficiencies, and passengers", () => {
    expect(
      computeTripCost({
        distanceKm: 0,
        efficiency: 5,
        mode: "litres-per-100km",
        fuelPricePerLitre: 2,
        passengers: 1,
      }),
    ).toBeNull()
    expect(
      computeTripCost({
        distanceKm: 100,
        efficiency: 0,
        mode: "km-per-litre",
        fuelPricePerLitre: 2,
        passengers: 1,
      }),
    ).toBeNull()
    expect(
      computeTripCost({
        distanceKm: 100,
        efficiency: 5,
        mode: "litres-per-100km",
        fuelPricePerLitre: 2,
        passengers: 0,
      }),
    ).toBeNull()
  })
})

describe("formatting", () => {
  it("renders litres with 3 decimals and money with 2", () => {
    expect(formatLitres(23.0769)).toBe("23.077 l")
    expect(formatMoney(4269)).toBe("42.69")
    expect(formatMoney(5)).toBe("0.05")
  })

  it("rounds the total to cents from the unrounded volume", () => {
    // 100 km at 7 km/l is 14.285714… l, not the displayed 14.286 l. Rounding the
    // volume first and then costing it produced 1785.75 instead of 1785.71.
    const result = computeTripCost({
      distanceKm: 100,
      efficiency: 7,
      mode: "km-per-litre",
      fuelPricePerLitre: 125,
      passengers: 1,
    })
    expect(result?.litres).toBe(14.286)
    expect(result?.totalCostCents).toBe(178571)

    const longer = computeTripCost({
      distanceKm: 333,
      efficiency: 11,
      mode: "km-per-litre",
      fuelPricePerLitre: 125,
      passengers: 1,
    })
    expect(longer?.totalCostCents).toBe(378409)
  })
})
