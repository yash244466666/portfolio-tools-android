/**
 * Pure number-base conversion for the Number Base Converter.
 *
 * Values are arbitrary-precision BigInt, so magnitudes beyond Number.MAX_SAFE_INTEGER
 * convert exactly (upstream silently lost precision and accepted partial parses such
 * as `parseInt("F1x", 16)`); that divergence is recorded in
 * `docs/SOURCE_PROVENANCE.md`. Nothing here touches React or platform services.
 */

export const minimumRadix = 2
export const maximumRadix = 36
/** Input bound; digits beyond it are rejected instead of being parsed. */
export const maximumDigits = 256

/** The fixed radix rows shown by default, mirroring the common programmer bases. */
export const basePresets: readonly { radix: number; label: string }[] = [
  { radix: 10, label: "Decimal" },
  { radix: 2, label: "Binary" },
  { radix: 8, label: "Octal" },
  { radix: 16, label: "Hexadecimal" },
  { radix: 32, label: "Base 32" },
  { radix: 36, label: "Base 36" },
]

const digitPattern = /[0-9a-zA-Z]/

function digitValue(character: string): number {
  const upper = character.toUpperCase()
  const code = upper.charCodeAt(0)
  if (code >= 48 && code <= 57) return code - 48
  if (code >= 65 && code <= 90) return code - 65 + 10
  return -1
}

export interface ParseResult {
  status: "ok"
  value: bigint
}

export interface ParseFailure {
  status: "empty" | "invalid-digit" | "too-long" | "invalid-radix"
}

/**
 * Parses a strict integer in the given radix. The whole input must be valid
 * digits of that radix — no partial parses, no leading/trailing junk, no sign.
 */
export function parseInBase(input: string, radix: number): ParseResult | ParseFailure {
  if (!Number.isInteger(radix) || radix < minimumRadix || radix > maximumRadix) {
    return { status: "invalid-radix" }
  }
  const text = input.trim()
  if (text.length === 0) return { status: "empty" }
  const negative = text.startsWith("-")
  const digits = negative ? text.slice(1) : text
  if (digits.length === 0) return { status: "invalid-digit" }
  if (digits.length > maximumDigits) return { status: "too-long" }

  let value = 0n
  for (const character of digits) {
    if (!digitPattern.test(character)) return { status: "invalid-digit" }
    const digit = digitValue(character)
    if (digit < 0 || digit >= radix) return { status: "invalid-digit" }
    value = value * BigInt(radix) + BigInt(digit)
  }
  return { status: "ok", value: negative ? -value : value }
}

/** Formats a BigInt in the given radix, uppercase (e.g. FF; sign preserved). */
export function formatInBase(value: bigint, radix: number): string {
  if (!Number.isInteger(radix) || radix < minimumRadix || radix > maximumRadix) {
    throw new RangeError(`radix must be ${minimumRadix}-${maximumRadix}`)
  }
  return value.toString(radix).toUpperCase()
}
