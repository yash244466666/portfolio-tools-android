import { computeTip, formatTipAmount, parseAmount } from "./tip"

describe("parseAmount", () => {
  it("accepts plain decimal amounts only", () => {
    expect(parseAmount("24.50")).toBe(24.5)
    expect(parseAmount(" 30 ")).toBe(30)
    expect(parseAmount(".99")).toBe(0.99)
    expect(parseAmount("1,200")).toBeNull()
    expect(parseAmount("24.5x")).toBeNull()
    expect(parseAmount("-5")).toBe(-5)
    expect(parseAmount("")).toBeNull()
  })
})

describe("computeTip", () => {
  it("computes the canonical 18 percent split example", () => {
    const result = computeTip(50, 18, 1)
    expect(result?.tip).toBe(9)
    expect(result?.total).toBe(59)
    expect(result?.perPerson).toBe(59)
    expect(result?.tipPerPerson).toBe(9)
  })

  it("splits the bill and tip across people", () => {
    const result = computeTip(100, 20, 3)
    expect(result?.tip).toBe(20)
    expect(result?.total).toBe(120)
    expect(result?.perPerson).toBe(40)
    expect(result?.tipPerPerson).toBeCloseTo(6.67)
  })

  it("rounds to cents without the classic binary-float drift", () => {
    const result = computeTip(0.1, 15, 1)
    expect(result?.tip).toBe(0.02)
    expect(result?.total).toBe(0.12)
  })

  it("handles a zero percent tip", () => {
    const result = computeTip(25, 0, 4)
    expect(result?.tip).toBe(0)
    expect(result?.perPerson).toBe(6.25)
  })

  it("rounds an exact half-cent per-person split up", () => {
    // 16.90 at 45% is 7.605; the 24.505 total split 13 ways is exactly
    // 188.5 cents, which must round to 1.89 rather than 1.88.
    const result = computeTip(16.9, 45, 13)
    expect(result?.total).toBe(24.51)
    expect(result?.perPerson).toBe(1.89)
  })

  it("rejects non-positive bills and out-of-range options", () => {
    expect(computeTip(0, 18, 1)).toBeNull()
    expect(computeTip(-5, 18, 1)).toBeNull()
    expect(computeTip(50, -1, 1)).toBeNull()
    expect(computeTip(50, 101, 1)).toBeNull()
    expect(computeTip(50, 18, 0)).toBeNull()
    expect(computeTip(50, 18, 101)).toBeNull()
    expect(computeTip(50, 12.5, 1)).toBeNull()
  })
})

describe("formatTipAmount", () => {
  it("always shows two decimals", () => {
    expect(formatTipAmount(9)).toBe("9.00")
    expect(formatTipAmount(6.666667)).toBe("6.67")
  })
})
