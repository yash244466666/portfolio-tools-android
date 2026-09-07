export const romanMax = 3999

export type RomanDirection = "to-roman" | "to-arabic"

const romanValues: readonly [number, string][] = [
  [1000, "M"],
  [900, "CM"],
  [500, "D"],
  [400, "CD"],
  [100, "C"],
  [90, "XC"],
  [50, "L"],
  [40, "XL"],
  [10, "X"],
  [9, "IX"],
  [5, "V"],
  [4, "IV"],
  [1, "I"],
]

const romanDigits: Readonly<Record<string, number>> = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
}

const arabicPattern = /^[+-]?\d+$/
const romanPattern = /^[IVXLCDM]+$/

/** Strict integer parsing; the upstream `parseInt` accepted prefixes like "42abc". */
export function parseArabic(input: string): number | null {
  const trimmed = input.trim()
  if (!arabicPattern.test(trimmed)) return null
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value)) return null
  return value
}

/** Converts 1–3999 to standard subtractive Roman notation; null when out of range. */
export function toRoman(value: number): string | null {
  if (!Number.isInteger(value) || value < 1 || value > romanMax) return null
  let remaining = value
  let result = ""
  for (const [amount, symbol] of romanValues) {
    while (remaining >= amount) {
      result += symbol
      remaining -= amount
    }
  }
  return result
}

/**
 * Parses a Roman numeral with a round-trip check: "IIII" and "IC" sum to a
 * number that does not convert back to the input, so they are rejected the
 * same way the upstream tool rejected them.
 */
export function fromRoman(input: string): number | null {
  const upper = input.trim().toUpperCase()
  if (!romanPattern.test(upper)) return null
  let total = 0
  for (let index = 0; index < upper.length; index += 1) {
    // The pattern above guarantees every character is a Roman digit.
    const current = romanDigits[upper[index] ?? ""] ?? 0
    const next = romanDigits[upper[index + 1] ?? ""]
    if (next !== undefined && current < next) {
      total -= current
    } else {
      total += current
    }
  }
  if (toRoman(total) !== upper) return null
  return total
}

export interface RomanConversion {
  arabic: number
  roman: string
  direction: string
}

/** Converts the current input in the given direction, or null when invalid. */
export function convertRoman(input: string, direction: RomanDirection): RomanConversion | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  if (direction === "to-roman") {
    const arabic = parseArabic(trimmed)
    if (arabic === null || arabic < 1 || arabic > romanMax) return null
    const roman = toRoman(arabic)
    return roman === null ? null : { arabic, roman, direction: "Arabic to Roman" }
  }
  const arabic = fromRoman(trimmed)
  if (arabic === null) return null
  return { arabic, roman: trimmed.trim().toUpperCase(), direction: "Roman to Arabic" }
}

export interface RomanError {
  message: string
}

/** The validation message for the current input, or null when it is valid or empty. */
export function romanInputError(input: string, direction: RomanDirection): string | null {
  const trimmed = input.trim()
  if (trimmed === "") return null
  if (direction === "to-roman") {
    if (parseArabic(trimmed) === null) return "Enter a whole number between 1 and 3999."
    if (parseArabic(trimmed)! < 1 || parseArabic(trimmed)! > romanMax) {
      return "Standard Roman numerals cover 1 to 3999."
    }
    return null
  }
  return fromRoman(trimmed) === null
    ? "Enter a valid Roman numeral using I, V, X, L, C, D, and M."
    : null
}
