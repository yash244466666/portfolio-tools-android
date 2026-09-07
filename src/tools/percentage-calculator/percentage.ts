export const maximumInputChars = 100

export type PercentageMode = "percent-of" | "what-percent" | "percent-change"

export const percentageOptions: readonly {
  id: PercentageMode
  label: string
  description: string
}[] = [
  {
    id: "percent-of",
    label: "X % of Y",
    description: "Multiplies a percentage by a value: (X / 100) × Y.",
  },
  {
    id: "what-percent",
    label: "X is ? % of Y",
    description: "Computes X as a percentage of the total Y.",
  },
  {
    id: "percent-change",
    label: "% Change",
    description:
      "Compares a new value against an old value; the old value's magnitude is the denominator.",
  },
]

export function getPercentageOption(mode: string): (typeof percentageOptions)[number] {
  const option = percentageOptions.find((candidate) => candidate.id === mode)
  if (!option) throw new RangeError(`Unknown percentage mode: ${mode}`)
  return option
}

const decimalPattern = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/

/**
 * Strict decimal parsing. The upstream tool used `parseFloat`, which silently
 * parses prefixes ("12abc" becomes 12); a whole-input match is required here
 * so an invalid field is always reported instead of quietly converting part
 * of the text.
 */
export function parseDecimal(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "" || trimmed.length > maximumInputChars) return null
  if (!decimalPattern.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

/**
 * Formats a result with up to 4 decimal places, trimming trailing zeros. The
 * upstream `toFixed(4).replace(/\.?0+$/, "")` collapsed 0 and 0.0000 to an
 * empty string; a zero keeps its "0".
 */
export function formatPercentageNumber(value: number): string {
  if (!Number.isFinite(value)) return "—"
  if (!Number.isInteger(value)) {
    return `${value}`.includes("e")
      ? `${value}`
      : value
          .toFixed(4)
          .replace(/(\.\d*?)0+$/, "$1")
          .replace(/\.$/, "")
  }
  return `${value}`
}

export interface PercentageOutcome {
  /** Null when the inputs are valid but the quotient is mathematically undefined. */
  value: number | null
  /** Shown instead of a misleading placeholder when the result is undefined. */
  undefinedReason: string | null
}

export function computePercentage(mode: PercentageMode, a: number, b: number): PercentageOutcome {
  switch (mode) {
    case "percent-of": {
      const value = (a / 100) * b
      if (!Number.isFinite(value)) {
        return { value: null, undefinedReason: "The result is too large to represent." }
      }
      return { value, undefinedReason: null }
    }
    case "what-percent":
      if (b === 0) {
        return { value: null, undefinedReason: "Undefined: a share of 0 has no percentage." }
      }
      return { value: (a / b) * 100, undefinedReason: null }
    case "percent-change":
      if (b === 0) {
        return { value: null, undefinedReason: "Undefined: change from 0 has no percentage." }
      }
      return { value: ((a - b) / Math.abs(b)) * 100, undefinedReason: null }
  }
}
