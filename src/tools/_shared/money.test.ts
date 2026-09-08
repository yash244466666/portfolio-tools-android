import { describe, expect, it } from "vitest"
import { percentOfCentsHalfUp, roundToCents } from "./money"

describe("roundToCents (shared half-up)", () => {
  it("keeps true half cases up despite float error", () => {
    expect(roundToCents(1.005)).toBe(1.01)
    expect(roundToCents(2.675)).toBe(2.68)
  })

  it("never flips genuine sub-half remainders", () => {
    expect(roundToCents(2.67499)).toBe(2.67)
    expect(roundToCents(72.4949999 / 100)).toBe(0.72)
  })

  it("handles negatives, zero, and junk", () => {
    expect(roundToCents(-2.005)).toBe(-2.01)
    expect(roundToCents(0)).toBe(0)
    expect(roundToCents(Number.NaN)).toBe(0)
  })
})

describe("percentOfCentsHalfUp (exact integer path)", () => {
  it("keeps the lost half cent the float path dropped", () => {
    // 250.00 at 0.29% is exactly 72.5 cents -> 73 (the float product lands
    // on 72.4999… and must not round down).
    expect(percentOfCentsHalfUp(25000, 0.29)).toBe(73)
    // 550.00 at 0.29% is exactly 159.5 cents -> 160.
    expect(percentOfCentsHalfUp(55000, 0.29)).toBe(160)
  })

  it("matches simple exact cases", () => {
    expect(percentOfCentsHalfUp(10000, 25)).toBe(2500)
    expect(percentOfCentsHalfUp(999, 15)).toBe(150)
    expect(percentOfCentsHalfUp(10000, 0)).toBe(0)
    expect(percentOfCentsHalfUp(10000, 100)).toBe(10000)
  })

  it("rejects negative and non-finite input", () => {
    expect(percentOfCentsHalfUp(-100, 10)).toBe(0)
    expect(percentOfCentsHalfUp(100, Number.NaN)).toBe(0)
  })
})
