import { describe, expect, it } from "vitest"
import {
  bmiCategory,
  bmiCategoryLabel,
  computeBmiImperial,
  computeBmiMetric,
  formatBmi,
  kgToLb,
  lbToKg,
  maximumImperialTotalInches,
  maximumMetricHeightCm,
  maximumMetricWeightKg,
  minimumImperialTotalInches,
  parseMeasurement,
  totalInches,
} from "./bmi"

describe("parseMeasurement", () => {
  it("clamps into the documented range and reports the clamp", () => {
    expect(parseMeasurement("70", 1, 500)).toEqual({ value: 70, clamped: false })
    expect(parseMeasurement("0", 1, 500)).toEqual({ value: 1, clamped: true })
    expect(parseMeasurement("99999", 1, 500)).toEqual({
      value: maximumMetricWeightKg,
      clamped: true,
    })
    expect(parseMeasurement("99999", 50, 250)).toEqual({
      value: maximumMetricHeightCm,
      clamped: true,
    })
  })

  it("rejects junk with the shared strict grammar", () => {
    expect(parseMeasurement("tall", 50, 250)).toBeNull()
    expect(parseMeasurement("", 50, 250)).toBeNull()
    expect(parseMeasurement("0x1F", 50, 250)).toBeNull()
    expect(parseMeasurement("1e2", 50, 250)).toBeNull()
    expect(parseMeasurement("+70", 1, 500)).toBeNull()
  })
})

describe("imperial height helpers", () => {
  it("totals feet and inches and flags the supported window", () => {
    expect(totalInches(5, 9)).toBe(69)
    expect(totalInches(0, 0)).toBe(0)
    expect(totalInches(-1, 9)).toBeNull()
    expect(minimumImperialTotalInches).toBe(20)
    expect(maximumImperialTotalInches).toBe(98)
  })

  it("computes imperial BMI only inside the supported height window", () => {
    expect(computeBmiImperial(160, 5, 0)).not.toBeNull()
    // 0 ft 0 in has no meaningful BMI.
    expect(computeBmiImperial(160, 0, 0)).toBeNull()
  })
})

describe("weight conversion on system switch", () => {
  it("round-trips kg and lb within rounding tolerance", () => {
    expect(kgToLb(70)).toBe(154.32)
    expect(lbToKg(154.32)).toBeCloseTo(70, 1)
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

  it("rejects zero weights and zero heights", () => {
    expect(computeBmiImperial(0, 5, 9)).toBeNull()
    expect(computeBmiImperial(160, 0, 0)).toBeNull()
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

  it("rounds an exact half up instead of down at the float boundary", () => {
    // 40.32 / 1.6^2 is exactly 15.75 in decimal but 15.749999999999996 as a
    // double, so an unguarded Math.round returned 15.7.
    expect(formatBmi(computeBmiMetric(40.32, 160)!)).toBe("15.8")
    expect(formatBmi(computeBmiMetric(48, 160)!)).toBe("18.8")
    expect(formatBmi(computeBmiMetric(67.2, 160)!)).toBe("26.3")
  })

  it("leaves values that are not on a half boundary unchanged", () => {
    expect(formatBmi(computeBmiMetric(70, 175)!)).toBe("22.9")
    expect(formatBmi(computeBmiMetric(60, 170)!)).toBe("20.8")
  })
})
