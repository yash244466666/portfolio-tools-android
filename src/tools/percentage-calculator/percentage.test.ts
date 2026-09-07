import {
  computePercentage,
  formatPercentageNumber,
  getPercentageOption,
  parseDecimal,
} from "./percentage"

describe("parseDecimal", () => {
  it("accepts whole, decimal, signed, and exponential values", () => {
    expect(parseDecimal("42")).toBe(42)
    expect(parseDecimal(" -3.5 ")).toBe(-3.5)
    expect(parseDecimal(".5")).toBe(0.5)
    expect(parseDecimal("2e3")).toBe(2000)
  })

  it("rejects partial parses the upstream parseFloat accepted", () => {
    expect(parseDecimal("12abc")).toBeNull()
    expect(parseDecimal("1,200")).toBeNull()
    expect(parseDecimal("")).toBeNull()
    expect(parseDecimal("Infinity")).toBeNull()
  })
})

describe("computePercentage", () => {
  it("computes X percent of Y", () => {
    expect(computePercentage("percent-of", 25, 200).value).toBe(50)
    expect(computePercentage("percent-of", 150, 40).value).toBe(60)
    expect(computePercentage("percent-of", 0, 40).value).toBe(0)
  })

  it("computes X as a percentage of Y", () => {
    expect(computePercentage("what-percent", 45, 180).value).toBe(25)
    expect(computePercentage("what-percent", 3, 8).value).toBeCloseTo(37.5)
  })

  it("reports undefined instead of a silent placeholder for a zero total", () => {
    const zeroShare = computePercentage("what-percent", 5, 0)
    expect(zeroShare.value).toBeNull()
    expect(zeroShare.undefinedReason).toMatch(/Undefined/)

    const zeroOld = computePercentage("percent-change", 5, 0)
    expect(zeroOld.value).toBeNull()
    expect(zeroOld.undefinedReason).toMatch(/Undefined/)

    expect(computePercentage("percent-change", 10, 8).value).toBeCloseTo(25)
  })

  it("computes percent change with the old value magnitude as denominator", () => {
    expect(computePercentage("percent-change", 12, 8).value).toBeCloseTo(50)
    expect(computePercentage("percent-change", 4, 8).value).toBeCloseTo(-50)
    expect(computePercentage("percent-change", 6, -4).value).toBeCloseTo(250)
  })
})

describe("formatPercentageNumber", () => {
  it("trims trailing decimal zeros but keeps zero and integers", () => {
    expect(formatPercentageNumber(37.5)).toBe("37.5")
    expect(formatPercentageNumber(0.1 + 0.2)).toBe("0.3")
    expect(formatPercentageNumber(0)).toBe("0")
    expect(formatPercentageNumber(100)).toBe("100")
  })
})

describe("getPercentageOption", () => {
  it("returns the matching option and throws on unknown modes", () => {
    expect(getPercentageOption("what-percent").label).toBe("X is ? % of Y")
    expect(() => getPercentageOption("nope")).toThrow(RangeError)
  })
})
