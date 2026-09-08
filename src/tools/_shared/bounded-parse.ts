/**
 * Shared bounded-parse policy for the tool suites: one strict decimal
 * grammar, one range policy, and one result shape that carries whether the
 * input was clamped so the UI can disclose effective values. Original work
 * for this repository.
 *
 * Policy: decimal input matching /^-?\d+(?:\.\d+)?$/ only (no hex, exponent,
 * leading plus, empty, or whitespace-only strings); out-of-range input
 * clamps into [minimum, maximum] by default, or is rejected when the caller
 * passes outOfRange: "reject" (used for percents, which the UI promises are
 * 0-100, and for quantities whose zero case is meaningless).
 */

const strictDecimalPattern = /^-?\d+(?:\.\d+)?$/

export interface BoundedParseOptions {
  minimum: number
  maximum: number
  /** Clamp out-of-range values (default) or reject them outright. */
  outOfRange?: "clamp" | "reject"
}

export interface BoundedParseResult {
  /** The effective value, inside [minimum, maximum]. */
  value: number
  /** True when the raw input was out of range and was clamped. */
  clamped: boolean
}

/**
 * Parses one strict decimal with the shared bounded policy. Returns null for
 * empty, malformed (hex/exponent/plus-sign), or rejected out-of-range input.
 */
export function parseBoundedDecimal(
  raw: string,
  options: BoundedParseOptions,
): BoundedParseResult | null {
  const trimmed = raw.trim()
  if (!strictDecimalPattern.test(trimmed)) return null
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  if (parsed < options.minimum || parsed > options.maximum) {
    if (options.outOfRange === "reject") return null
    return {
      value: Math.min(options.maximum, Math.max(options.minimum, parsed)),
      clamped: true,
    }
  }
  return { value: parsed, clamped: false }
}

/** Formats a disclosed effective value without float noise. */
export function formatEffectiveValue(value: number): string {
  return String(Math.round(value * 1e6) / 1e6)
}
