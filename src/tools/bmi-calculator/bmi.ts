/**
 * Pure BMI computation for the BMI Calculator. Original work for this
 * repository; no upstream code is copied. Categories follow the WHO adult
 * BMI bands and are shown as text labels only — the result is an estimate,
 * not medical advice.
 */
import { parseBoundedDecimal, type BoundedParseResult } from "@/tools/_shared/bounded-parse"

export const minimumMetricWeightKg = 1
export const maximumMetricWeightKg = 500
export const minimumMetricHeightCm = 50
export const maximumMetricHeightCm = 250
export const minimumImperialWeightLb = 2
export const maximumImperialWeightLb = 1100
/** The supported total-height window for imperial input, in inches. */
export const minimumImperialTotalInches = 20
export const maximumImperialTotalInches = 98

const kilogramsPerPound = 0.45359237
const metersPerInch = 0.0254

export type BmiSystem = "metric" | "imperial"

/**
 * Parses a bounded measurement with the shared policy: strict decimal
 * grammar, clamped into the documented range, with the clamp disclosed by
 * the caller. Zero and below the minimum are clamped values the UI
 * discloses — except weight, which uses a reject policy in the component
 * because a zero-weight BMI is meaningless.
 */
export function parseMeasurement(
  value: string,
  minimum: number,
  maximum: number,
): BoundedParseResult | null {
  return parseBoundedDecimal(value, { minimum, maximum })
}

/** Converts a metric kg weight into the imperial lb field on system switch. */
export function kgToLb(weightKg: number): number {
  return Math.round((weightKg / kilogramsPerPound) * 100) / 100
}

/** Converts an imperial lb weight into the metric kg field on system switch. */
export function lbToKg(weightLb: number): number {
  return Math.round(weightLb * kilogramsPerPound * 100) / 100
}

/** Total inches from a feet + inches pair; both parts are non-negative. */
export function totalInches(heightFeet: number, heightInches: number): number | null {
  if (!Number.isFinite(heightFeet) || heightFeet < 0) return null
  if (!Number.isFinite(heightInches) || heightInches < 0) return null
  return heightFeet * 12 + heightInches
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
  const total = totalInches(heightFeet, heightInches)
  if (total === null || total <= 0) return null
  const kg = weightLb * kilogramsPerPound
  const meters = total * metersPerInch
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
  // One decimal, half-up, with a relative-epsilon nudge: a decimal-to-float
  // conversion can land several ulps below the boundary (40.32 kg at 1.60 m
  // is 15.749999999999996, and 164.28 kg at 0.592 m is 4687.499999999998
  // after scaling), which would round a true half down. Sixteen ulps covers
  // the measured error and is still far below any genuine sub-half remainder
  // at the tool's bounded inputs. Same guard as `roundToCents` in
  // `_shared/money.ts`.
  return Math.round(value * 10 * (1 + 16 * Number.EPSILON)) / 10
}
