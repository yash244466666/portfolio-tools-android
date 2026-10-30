import { describe, expect, it } from "vitest"
import { clamp01, fractionOf, normalizeHeading, shortestAngleDelta } from "./motion-math"

describe("motion math", () => {
  it("clamps and normalizes values", () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(2)).toBe(1)
    expect(clamp01(Number.NaN)).toBe(0)
    expect(normalizeHeading(-90)).toBe(270)
    expect(normalizeHeading(450)).toBe(90)
  })

  it("takes the shortest signed rotation across north", () => {
    expect(shortestAngleDelta(350, 10)).toBe(20)
    expect(shortestAngleDelta(10, 350)).toBe(-20)
    expect(shortestAngleDelta(0, 180)).toBe(180)
    expect(shortestAngleDelta(90, 270)).toBe(180)
    expect(shortestAngleDelta(0, 90)).toBe(90)
  })

  it("maps a value into a bounded fraction", () => {
    expect(fractionOf(5, 0, 10)).toBe(0.5)
    expect(fractionOf(-5, 0, 10)).toBe(0)
    expect(fractionOf(15, 0, 10)).toBe(1)
    expect(fractionOf(5, 10, 10)).toBe(0)
  })
})
