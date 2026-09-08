import { describe, expect, it } from "vitest"
import {
  bmiCategory,
  bmiCategoryLabel,
  computeBmiImperial,
  computeBmiMetric,
  formatBmi,
  maximumMetricHeightCm,
  maximumMetricWeightKg,
  parseMeasurement,
} from "./bmi"

describe("parseMeasurement", () => {
  it("clamps into the documented range and rejects junk", () => {
    expect(parseMeasurement("70", 1, 500)).toBe(70)
    // Sub-minimum input clamps up; the component surfaces the effective value.
    expect(parseMeasurement("0", 1, 500)).toBe(1)
    expect(parseMeasurement("99999", 1, 500)).toBe(maximumMetricWeightKg)
    expect(parseMeasurement("99999", 50, 250)).toBe(maximumMetricHeightCm)
    expect(parseMeasurement("tall", 50, 250)).toBeNull()
    expect(parseMeasurement("", 50, 250)).toBeNull()
  })
})

describe("computeBmiMetric", () => {
  it("computes the textbook value at one decimal", () => {
    // 70 kg, 175 cm -> 22.857 -> 22.9
    expect(computeBmiMetric(70, 175)).toBe(22.9)
    // 50 kg, 150 cm -> 22.222 -> 22.2
    expect(computeBmiMetric(50, 150)).toBe(22.2)
  })

  it("rejects non-positive values", () => {
    expect(computeBmiMetric(0, 175)).toBeNull()
    expect(computeBmiMetric(70, 0)).toBeNull()
    expect(computeBmiMetric(Number.NaN, 175)).toBeNull()
  })
})

describe("computeBmiImperial", () => {
  it("matches the metric computation for the same body", () => {
    // 154.3 lb ~ 70 kg; 5 ft 9 in = 69 in = 175.26 cm
    const imperial = computeBmiImperial(154.3, 5, 9)
    const metric = computeBmiMetric(70, 175.26)
    expect(imperial).toBeCloseTo(metric ?? 0, 1)
  })

  it("accepts inch-only remainder and rejects zero heights", () => {
    expect(computeBmiImperial(160, 5, 0)).not.toBeNull()
    expect(computeBmiImperial(160, 0, 0)).toBeNull()
    expect(computeBmiImperial(0, 5, 9)).toBeNull()
  })
})

describe("categories and formatting", () => {
  it("maps WHO bands with honest text labels", () => {
    expect(bmiCategory(15)).toBe("underweight")
    expect(bmiCategory(18.5)).toBe("normal")
    expect(bmiCategory(24.9)).toBe("normal")
    expect(bmiCategory(25)).toBe("overweight")
    expect(bmiCategory(29.9)).toBe("overweight")
    expect(bmiCategory(30)).toBe("obese")
    expect(bmiCategoryLabel("obese")).toMatch(/30 and above/)
    // Every label states its numeric band, so no color cue is needed.
    for (const label of ["underweight", "normal", "overweight", "obese"] as const) {
      expect(bmiCategoryLabel(label)).toMatch(/\d/)
    }
  })

  it("formats one decimal without float noise", () => {
    expect(formatBmi(22.857142857)).toBe("22.9")
    expect(formatBmi(18)).toBe("18.0")
  })
})
