export const presetTips: readonly number[] = [10, 15, 18, 20, 25]
export const maximumTipPercent = 100
/** The quick slider covers the common 0–50% range; any 0–100% value validates. */
export const sliderMaxTipPercent = 50
export const maximumSplitCount = 100
export const maximumAmountChars = 100

const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)?$/

/** Strict decimal parsing; whole-input matches only, so "12.5x" is invalid. */
export function parseAmount(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "" || trimmed.length > maximumAmountChars) return null
  if (!decimalPattern.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export interface TipResult {
  tip: number
  total: number
  perPerson: number
  tipPerPerson: number
}

function roundToCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Computes tip, total, and per-person amounts rounded to two decimals. All
 * amounts are plain numbers without a currency symbol; the interface labels
 * them rather than assuming one currency.
 */
export function computeTip(bill: number, tipPercent: number, splitCount: number): TipResult | null {
  if (!Number.isFinite(bill) || bill <= 0) return null
  if (!Number.isInteger(tipPercent) || tipPercent < 0 || tipPercent > maximumTipPercent) {
    return null
  }
  if (!Number.isInteger(splitCount) || splitCount < 1 || splitCount > maximumSplitCount) {
    return null
  }

  const exactTip = (bill * tipPercent) / 100
  const exactTotal = bill + exactTip
  return {
    tip: roundToCents(exactTip),
    total: roundToCents(exactTotal),
    perPerson: roundToCents(exactTotal / splitCount),
    tipPerPerson: roundToCents(exactTip / splitCount),
  }
}

/** Two-decimal display for an amount that has already been rounded to cents. */
export function formatTipAmount(value: number): string {
  return value.toFixed(2)
}
