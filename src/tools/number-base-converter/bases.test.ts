import { describe, expect, it } from "vitest"
import { formatInBase, maximumDigits, maximumRadix, minimumRadix, parseInBase } from "./bases"

describe("parseInBase", () => {
  it("parses strict digits in each radix without partial parses", () => {
    expect(parseInBase("255", 10)).toEqual({ status: "ok", value: 255n })
    expect(parseInBase("1010", 2)).toEqual({ status: "ok", value: 10n })
    expect(parseInBase("ff", 16)).toEqual({ status: "ok", value: 255n })
    expect(parseInBase("FF", 16)).toEqual({ status: "ok", value: 255n })
    expect(parseInBase("zz", 36)).toEqual({ status: "ok", value: 1295n })
  })

  it("rejects partial parses and junk the upstream parseInt accepted", () => {
    // Regression: parseInt("F1x", 16) silently yielded 241.
    expect(parseInBase("F1x", 16)).toEqual({ status: "invalid-digit" })
    expect(parseInBase(" 12abc", 10)).toEqual({ status: "invalid-digit" })
    expect(parseInBase("1.5", 10)).toEqual({ status: "invalid-digit" })
    expect(parseInBase("8", 8)).toEqual({ status: "invalid-digit" })
    expect(parseInBase("2", 2)).toEqual({ status: "invalid-digit" })
    expect(parseInBase("g", 16)).toEqual({ status: "invalid-digit" })
  })

  it("handles empties, bounds, and signs", () => {
    expect(parseInBase("", 10)).toEqual({ status: "empty" })
    expect(parseInBase("   ", 10)).toEqual({ status: "empty" })
    expect(parseInBase("-", 10)).toEqual({ status: "invalid-digit" })
    expect(parseInBase("-ff", 16)).toEqual({ status: "ok", value: -255n })
    expect(parseInBase("1", 1)).toEqual({ status: "invalid-radix" })
    expect(parseInBase("1", 37)).toEqual({ status: "invalid-radix" })
    expect(parseInBase("1".repeat(maximumDigits + 1), 10)).toEqual({ status: "too-long" })
    expect(parseInBase("1".repeat(maximumDigits), 10).status).toBe("ok")
    expect(maximumRadix).toBe(36)
    expect(minimumRadix).toBe(2)
  })

  it("keeps magnitudes beyond Number.MAX_SAFE_INTEGER exact", () => {
    // Regression: upstream used parseInt, losing precision above 2^53.
    const huge = "9007199254740993" // 2^53 + 1
    const parsed = parseInBase(huge, 10)
    expect(parsed).toEqual({ status: "ok", value: 9007199254740993n })
    expect(formatInBase(9007199254740993n, 16)).toBe("20000000000001")
  })
})

describe("formatInBase", () => {
  it("formats uppercase with the sign preserved", () => {
    expect(formatInBase(255n, 16)).toBe("FF")
    expect(formatInBase(0n, 2)).toBe("0")
    expect(formatInBase(-255n, 16)).toBe("-FF")
    expect(formatInBase(35n, 36)).toBe("Z")
  })

  it("rejects out-of-range radices", () => {
    expect(() => formatInBase(1n, 1)).toThrow(RangeError)
    expect(() => formatInBase(1n, 37)).toThrow(RangeError)
    expect(() => formatInBase(1n, 1.5)).toThrow(RangeError)
  })

  it("round-trips every preset radix", () => {
    for (const radix of [2, 8, 10, 16, 32, 36]) {
      const parsed = parseInBase(formatInBase(123456789n, radix), radix)
      expect(parsed).toEqual({ status: "ok", value: 123456789n })
    }
  })
})
