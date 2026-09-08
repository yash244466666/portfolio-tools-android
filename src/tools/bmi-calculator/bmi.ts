/**
 * Pure BMI computation for the BMI Calculator. Original work for this
 * repository; no upstream code is copied. Categories follow the WHO adult
 * BMI bands and are shown as text labels only — the result is an estimate,
 * not medical advice.
 */

export const minimumMetricWeightKg = 1
export const maximumMetricWeightKg = 500
export const minimumMetricHeightCm = 50
export const maximumMetricHeightCm = 250
export const minimumImperialWeightLb = 2
export const maximumImperialWeightLb = 1100
export const minimumImperialHeightInches = 20
export const maximumImperialHeightInches = 98

const kilogramsPerPound = 0.45359237
const metersPerInch = 0.0254

export type BmiSystem = "metric" | "imperial"

/**
 * Parses a bounded positive measurement. Returns null for non-finite input;
 * values outside the documented clamps clamp into them.
 */
export function parseMeasurement(value: string, minimum: number, maximum: number): number | null {
  const trimmed = value.trim()
  if (trimmed === "") return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  return Math.min(maximum, Math.max(minimum, parsed))
}

/**
 * BMI from kilograms and centimeters; one decimal. Returns null when the
 * height or weight cannot produce a meaningful value.
 */
export function computeBmiMetric(weightKg: number, heightCm: number): number | null {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return null
  if (!Number.isFinite(heightCm) || heightCm <= 0) return null
  const meters = heightCm / 100
  return roundToOneDecimal(weightKg / (meters * meters))
}

/** BMI from pounds plus separate feet and inches; one decimal. */
export function computeBmiImperial(
  weightLb: number,
  heightFeet: number,
  heightInches: number,
): number | null {
  if (!Number.isFinite(weightLb) || weightLb <= 0) return null
  const totalInches = heightFeet * 12 + heightInches
  if (!Number.isFinite(totalInches) || totalInches <= 0) return null
  const kg = weightLb * kilogramsPerPound
  const meters = totalInches * metersPerInch
  return roundToOneDecimal(kg / (meters * meters))
}

export type BmiCategory = "underweight" | "normal" | "overweight" | "obese"

/**
 * WHO adult bands: under 18.5, 18.5-24.9, 25-29.9, 30 and above. Text labels
 * only — never a color cue.
 */
export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight"
  if (bmi < 25) return "normal"
  if (bmi < 30) return "overweight"
  return "obese"
}

/** Honest, non-medical text labels for each band. */
export function bmiCategoryLabel(category: BmiCategory): string {
  switch (category) {
    case "underweight":
      return "Below 18.5 — underweight band (WHO adult range)"
    case "normal":
      return "18.5 to 24.9 — normal band (WHO adult range)"
    case "overweight":
      return "25 to 29.9 — overweight band (WHO adult range)"
    case "obese":
      return "30 and above — obese band (WHO adult range)"
  }
}

/** Formats the one-decimal BMI value without float noise. */
export function formatBmi(bmi: number): string {
  return roundToOneDecimal(bmi).toFixed(1)
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10
}
