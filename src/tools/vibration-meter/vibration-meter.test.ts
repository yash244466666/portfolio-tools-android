import { describe, expect, it } from "vitest"
import {
  formatAcceleration,
  magnitudeOf,
  vibrationLabel,
  vibrationReading,
} from "./vibration-meter"

const base = 1_700_000_000_000

describe("magnitudeOf", () => {
  it("computes the vector magnitude and rejects malformed vectors", () => {
    expect(magnitudeOf([3, 4, 0])).toBe(5)
    expect(magnitudeOf([0, 0, 0])).toBe(0)
    expect(magnitudeOf([1, 2])).toBeNull()
    expect(magnitudeOf([1, 2, Number.NaN])).toBeNull()
  })
})

describe("vibrationReading", () => {
  it("computes RMS and peak over the latest one-second window", () => {
    const reading = vibrationReading([
      { timestampMs: base, values: [3, 0, 0] },
      { timestampMs: base + 500, values: [4, 0, 0] },
      { timestampMs: base + 2_000, values: [100, 0, 0] },
    ])
    expect(reading?.rms).toBeCloseTo(100, 6)
    expect(reading?.peak).toBe(100)
    expect(reading?.sampleCount).toBe(1)
  })

  it("ignores samples outside the window and reports null with no valid data", () => {
    const reading = vibrationReading([
      { timestampMs: base, values: [3, 0, 0] },
      { timestampMs: base + 100, values: [4, 0, 0] },
      { timestampMs: base + 3_000, values: [0, 0, 0] },
    ])
    expect(reading?.rms).toBe(0)
    expect(reading?.sampleCount).toBe(1)
    expect(vibrationReading([])).toBeNull()
    expect(vibrationReading([{ timestampMs: base, values: [1, 2] }])).toBeNull()
  })

  it("labels the measured level and formats acceleration", () => {
    expect(vibrationLabel(0)).toBe("Quiet")
    expect(vibrationLabel(0.05)).toBe("Noticeable")
    expect(vibrationLabel(0.5)).toBe("Strong")
    expect(formatAcceleration(1.234)).toBe("1.23 m/s²")
  })
})
