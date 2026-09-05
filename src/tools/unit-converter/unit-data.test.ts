import { convertUnit, formatConvertedValue } from "@/tools/unit-converter/unit-data"

describe("unit conversion", () => {
  it("converts exact metric length values", () => {
    expect(convertUnit(1, "kilometer", "meter", "length")).toBe(1000)
  })

  it("converts temperature through the shared Celsius base", () => {
    expect(convertUnit(32, "fahrenheit", "celsius", "temperature")).toBeCloseTo(0, 10)
    expect(convertUnit(100, "celsius", "fahrenheit", "temperature")).toBeCloseTo(212, 10)
  })

  it("uses binary multiples for digital data", () => {
    expect(convertUnit(1, "megabyte", "byte", "data")).toBe(1_048_576)
  })

  it("rejects unknown units and non-finite input", () => {
    expect(convertUnit(1, "unknown", "meter", "length")).toBeNaN()
    expect(formatConvertedValue(Number.POSITIVE_INFINITY)).toBe("")
  })
})
