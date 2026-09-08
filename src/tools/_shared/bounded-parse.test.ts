import { describe, expect, it } from "vitest"
import { formatEffectiveValue, parseBoundedDecimal } from "./bounded-parse"

describe("parseBoundedDecimal", () => {
  it("accepts the strict decimal grammar", () => {
    expect(parseBoundedDecimal("12.5", { minimum: 0, maximum: 100 })).toEqual({
      value: 12.5,
      clamped: false,
    })
    expect(parseBoundedDecimal(" 8 ", { minimum: 0, maximum: 100 })).toEqual({
      value: 8,
      clamped: false,
    })
    expect(parseBoundedDecimal("-3", { minimum: -10, maximum: 10 })).toEqual({
      value: -3,
      clamped: false,
    })
  })

  it("rejects hex, exponent, plus signs, empty, and junk", () => {
    expect(parseBoundedDecimal("0x10", { minimum: 0, maximum: 100 })).toBeNull()
    expect(parseBoundedDecimal("1e3", { minimum: 0, maximum: 100 })).toBeNull()
    expect(parseBoundedDecimal("+5", { minimum: 0, maximum: 100 })).toBeNull()
    expect(parseBoundedDecimal("", { minimum: 0, maximum: 100 })).toBeNull()
    expect(parseBoundedDecimal("wide", { minimum: 0, maximum: 100 })).toBeNull()
  })

  it("clamps out-of-range values and reports the clamp", () => {
    expect(parseBoundedDecimal("150", { minimum: 0, maximum: 100 })).toEqual({
      value: 100,
      clamped: true,
    })
    expect(parseBoundedDecimal("-1", { minimum: 1, maximum: 100 })).toEqual({
      value: 1,
      clamped: true,
    })
  })

  it("rejects out-of-range values when the policy is reject", () => {
    expect(
      parseBoundedDecimal("150", { minimum: 0, maximum: 100, outOfRange: "reject" }),
    ).toBeNull()
    expect(parseBoundedDecimal("100", { minimum: 0, maximum: 100, outOfRange: "reject" })).toEqual({
      value: 100,
      clamped: false,
    })
  })

  it("formats disclosed effective values without float noise", () => {
    expect(formatEffectiveValue(16)).toBe("16")
    expect(formatEffectiveValue(20.5)).toBe("20.5")
  })
})
