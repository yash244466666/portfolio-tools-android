import { describe, expect, it } from "vitest"
import { calibratedTilt, formatAngle, isLevel, levelLabel, tiltFromAcceleration } from "./level"

describe("tiltFromAcceleration", () => {
  it("reports zero tilt when the phone lies flat", () => {
    const reading = tiltFromAcceleration([0, 0, 9.81])
    expect(reading?.rollDeg).toBeCloseTo(0, 6)
    expect(reading?.pitchDeg).toBeCloseTo(0, 6)
    expect(reading?.tiltDeg).toBeCloseTo(0, 6)
  })

  it("reports 90 degrees on either in-plane axis", () => {
    const right = tiltFromAcceleration([9.81, 0, 0])
    expect(right?.rollDeg).toBeCloseTo(90, 6)
    expect(right?.tiltDeg).toBeCloseTo(90, 6)
    const top = tiltFromAcceleration([0, 9.81, 0])
    expect(top?.pitchDeg).toBeCloseTo(90, 6)
    expect(top?.tiltDeg).toBeCloseTo(90, 6)
  })

  it("reports 45 degrees for a diagonal gravity vector", () => {
    const reading = tiltFromAcceleration([6.9367, 0, 6.9367])
    expect(reading?.tiltDeg).toBeCloseTo(45, 3)
    expect(reading?.rollDeg).toBeCloseTo(45, 3)
  })

  it("treats face-down as flat and rejects invalid magnitudes", () => {
    expect(tiltFromAcceleration([0, 0, -9.81])?.tiltDeg).toBeCloseTo(0, 6)
    expect(tiltFromAcceleration([0, 0, 0])).toBeNull()
    expect(tiltFromAcceleration([0, 0, 200])).toBeNull()
    expect(tiltFromAcceleration([0, 0, Number.NaN])).toBeNull()
    expect(tiltFromAcceleration([0, 0])).toBeNull()
  })
})

describe("calibration and level state", () => {
  it("subtracts a tilted zero vector", () => {
    const reading = tiltFromAcceleration([6.9367, 0, 6.9367])
    expect(reading).not.toBeNull()
    if (!reading) return
    const relative = calibratedTilt(reading, { x: 6.9367, y: 0, z: 6.9367 })
    expect(relative?.tiltDeg).toBeCloseTo(0, 3)
    expect(relative?.rollDeg).toBeCloseTo(0, 3)
    expect(relative?.pitchDeg).toBeCloseTo(0, 3)
  })

  it("flags level only inside the tolerance", () => {
    expect(isLevel({ rollDeg: 0.4, pitchDeg: -0.7 })).toBe(true)
    expect(isLevel({ rollDeg: 1.2, pitchDeg: 0 })).toBe(false)
    expect(levelLabel({ rollDeg: 0, pitchDeg: 2 })).toBe("Tilted")
    expect(levelLabel({ rollDeg: 0.2, pitchDeg: 0.2 })).toBe("Level")
    expect(formatAngle(12.345)).toBe("12.3°")
  })

  it("returns null for an unusable zero vector", () => {
    const reading = tiltFromAcceleration([0, 0, 9.81])
    if (!reading) return
    expect(calibratedTilt(reading, { x: 0, y: 0, z: 0 })).toBeNull()
  })
})
