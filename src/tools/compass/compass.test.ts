import { describe, expect, it } from "vitest"
import { accuracyLabel, cardinalFromHeading, computeCompass, formatHeading } from "./compass"

const gravity = [0, 0, 9.81] as const
const northField = [0, 20, -40] as const

describe("computeCompass", () => {
  it("returns 0° when the phone top points north", () => {
    const reading = computeCompass(northField, gravity)
    expect(reading?.headingDeg).toBeCloseTo(0, 6)
    expect(reading?.cardinal).toBe("N")
  })

  it("returns 90/180/270 for the other cardinal orientations", () => {
    expect(computeCompass([-20, 0, -40], gravity)?.headingDeg).toBeCloseTo(90, 6)
    expect(computeCompass([0, -20, -40], gravity)?.headingDeg).toBeCloseTo(180, 6)
    expect(computeCompass([20, 0, -40], gravity)?.headingDeg).toBeCloseTo(270, 6)
  })

  it("reports strength, interference, accuracy, and formatting", () => {
    const reading = computeCompass(northField, gravity, 2)
    expect(reading?.magneticStrength).toBeCloseTo(Math.hypot(0, 20, -40), 6)
    expect(reading?.interference).toBe(false)
    expect(reading?.accuracy).toBe(2)
    expect(formatHeading(reading!)).toBe("0° N")
    expect(accuracyLabel(2)).toBe("Medium")
    expect(accuracyLabel(0)).toBe("Unreliable")
  })

  it("flags a field far outside the usual range", () => {
    expect(computeCompass([0, 10, -5], gravity)?.interference).toBe(true)
    expect(computeCompass([0, 200, -20], gravity)?.interference).toBe(true)
  })

  it("rejects malformed and unusable vectors", () => {
    expect(computeCompass([0, 0], gravity)).toBeNull()
    expect(computeCompass([0, 0, 0], gravity)).toBeNull()
    expect(computeCompass([0, 0, 1], gravity)).toBeNull()
    expect(computeCompass(northField, [0, 0, 0])).toBeNull()
    expect(computeCompass([0, 0, Number.NaN], gravity)).toBeNull()
  })
})

describe("cardinalFromHeading", () => {
  it("wraps and buckets at 45° intervals", () => {
    expect(cardinalFromHeading(0)).toBe("N")
    expect(cardinalFromHeading(22.4)).toBe("N")
    expect(cardinalFromHeading(22.5)).toBe("NE")
    expect(cardinalFromHeading(359.9)).toBe("N")
    expect(cardinalFromHeading(-90)).toBe("W")
  })
})
