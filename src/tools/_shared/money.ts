/**
 * Shared money rounding for the tool suites: the one half-up-to-cents
 * implementation, plus an exact integer path for percent-of-cents. Original
 * work for this repository.
 */

/**
 * Rounds to whole cents, half-up, with a relative-epsilon nudge because the
 * decimal-to-float conversion can land several ulps below the half boundary
 * (1.005 * 100 is 100.4999… in IEEE doubles; a tip split of exactly 188.5
 * cents evaluates to 188.49999999999994). A single `Number.EPSILON` is about
 * one ulp and does not cover the measured 4–5 ulp error, so the nudge is
 * eight ulps. At the largest amount these tools accept (1e11 cents) that is
 * ~1.8e-4 of a cent, while the smallest genuine sub-half decimal remainder
 * for their cent-quantized inputs is 0.01 cent, so only true ties flip up.
 */
export function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100 * (1 + 8 * Number.EPSILON)) / 100
}

/**
 * Exact percent-of-cents with half-up rounding, computed over integers so a
 * float product can never lose the half cent: 250.00 at 0.29% is exactly
 * 72.5 cents and must round to 73, never 72.
 *
 * The percent is scaled to millionths of a percent (six decimal places of
 * percent precision) and the multiplication/division run in BigInt.
 */
export function percentOfCentsHalfUp(priceCents: number, percent: number): number {
  if (!Number.isFinite(priceCents) || priceCents < 0) return 0
  if (!Number.isFinite(percent) || percent < 0) return 0
  const percentMillionths = BigInt(Math.round(percent * 1_000_000))
  const product = BigInt(Math.round(priceCents)) * percentMillionths
  // percent/100 in millionths is 10_000 per whole percent… precisely:
  // cents = priceCents * (percent / 100), with percent scaled by 1e6, so the
  // divisor is 100 * 1e6 = 1e8.
  const denominator = 100_000_000n
  const half = denominator / 2n
  return Number((product + half) / denominator)
}

/** Formats whole cents as an exact 2-decimal string; no floats displayed. */
export function formatCents(cents: number): string {
  const negative = cents < 0
  const absolute = Math.abs(Math.round(cents))
  const units = Math.floor(absolute / 100)
  const remainder = absolute % 100
  return `${negative ? "-" : ""}${units}.${String(remainder).padStart(2, "0")}`
}
