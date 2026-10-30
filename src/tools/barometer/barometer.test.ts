import { describe, expect, it } from "vitest"
import {
  altitudeFromPressure,
  formatAltitude,
  formatPressure,
  pressureTrend,
  standardSeaLevelHpa,
} from "./barometer"

describe("altitudeFromPressure", () => {
  it("returns zero at the standard sea-level pressure", () => {
    expect(altitudeFromPressure(standardSeaLevelHpa)).toBeCloseTo(0, 6)
  })

  it("matches the standard-atmosphere estimate", () => {
    expect(altitudeFromPressure(1000)).toBeCloseTo(110.9, 0)
    expect(altitudeFromPressure(900)).toBeCloseTo(988.6, 0)
    expect(altitudeFromPressure(1000, 1000)).toBeCloseTo(0, 6)
  })

  it("rejects out-of-range pressures and references", () => {
    expect(altitudeFromPressure(0)).toBeNull()
    expect(altitudeFromPressure(2000)).toBeNull()
    expect(altitudeFromPressure(1000, 700)).toBeNull()
    expect(altitudeFromPressure(Number.NaN)).toBeNull()
  })

  it("formats pressure and altitude", () => {
    expect(formatPressure(1013.25)).toBe("1013.25 hPa")
    expect(formatAltitude(100)).toBe("100.0 m · 328 ft")
  })
})

describe("pressureTrend", () => {
  const base = 1_700_000_000_000
  it("classifies a sustained change over the session window", () => {
    expect(
      pressureTrend([
        { timestampMs: base, hPa: 1000 },
        { timestampMs: base + 10_000, hPa: 1000.5 },
      ])?.label,
    ).toBe("Rising")
    expect(
      pressureTrend([
        { timestampMs: base, hPa: 1000 },
        { timestampMs: base + 10_000, hPa: 999.5 },
      ])?.label,
    ).toBe("Falling")
    expect(
      pressureTrend([
        { timestampMs: base, hPa: 1000 },
        { timestampMs: base + 10_000, hPa: 1000.1 },
      ])?.label,
    ).toBe("Steady")
  })

  it("requires at least two samples spanning five seconds", () => {
    expect(pressureTrend([])).toBeNull()
    expect(pressureTrend([{ timestampMs: base, hPa: 1000 }])).toBeNull()
    expect(
      pressureTrend([
        { timestampMs: base, hPa: 1000 },
        { timestampMs: base + 1_000, hPa: 1001 },
      ]),
    ).toBeNull()
  })
})
