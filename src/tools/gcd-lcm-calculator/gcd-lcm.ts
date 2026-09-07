export const maximumInputChars = 400
export const maximumDigitsPerNumber = 15
export const maximumNumberCount = 12

export type ParseOutcome = { ok: true; values: bigint[] } | { ok: false; error: string }

const integerPattern = /^[+-]?\d+$/

/**
 * Parses a comma-separated list of integers into BigInt values. The upstream
 * tool silently dropped unparsable entries ("48, abc, 18" became 48 and 18)
 * and used Number arithmetic, whose `a * b` overflows past 2^53. Every entry
 * must parse here, values are bounded to 15 digits, and all arithmetic is
 * exact BigInt.
 */
export function parseIntegerList(input: string): ParseOutcome {
  const trimmed = input.trim()
  if (trimmed === "") {
    return { ok: false, error: "Enter at least two whole numbers separated by commas." }
  }
  if (trimmed.length > maximumInputChars) {
    return { ok: false, error: `Input exceeds the ${maximumInputChars} character limit.` }
  }
  const entries = trimmed.split(",").map((entry) => entry.trim())
  if (entries.length < 2) {
    return { ok: false, error: "Enter at least two whole numbers separated by commas." }
  }
  if (entries.length > maximumNumberCount) {
    return { ok: false, error: `Use at most ${maximumNumberCount} numbers.` }
  }
  const values: bigint[] = []
  for (const entry of entries) {
    if (!integerPattern.test(entry) || entry.replace(/^[+-]/, "").length > maximumDigitsPerNumber) {
      return {
        ok: false,
        error: `Entry ${values.length + 1} is not a whole number of up to ${maximumDigitsPerNumber} digits. Use whole numbers separated by commas.`,
      }
    }
    values.push(BigInt(entry))
  }
  return { ok: true, values }
}

export function gcdList(values: bigint[]): bigint {
  let result = abs(values[0] ?? 0n)
  for (const value of values.slice(1)) {
    result = gcdPair(result, abs(value))
    if (result === 1n) break
  }
  return result
}

/** Least common multiple over the whole list; 0 when any value is 0. */
export function lcmList(values: bigint[]): bigint {
  if (values.some((value) => value === 0n)) return 0n
  let result = abs(values[0] ?? 0n)
  for (const value of values.slice(1)) {
    const divisor = gcdPair(result, abs(value))
    result = (result / divisor) * abs(value)
  }
  return result
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value
}

function gcdPair(a: bigint, b: bigint): bigint {
  while (b !== 0n) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

/** Euclidean algorithm steps for the first two values, as in the upstream tool. */
export function gcdSteps(first: bigint, second: bigint): string[] {
  let a = abs(first)
  let b = abs(second)
  const steps: string[] = []
  while (b !== 0n) {
    const remainder = a % b
    steps.push(`gcd(${a}, ${b}) = gcd(${b}, ${a} mod ${b}) = gcd(${b}, ${remainder})`)
    a = b
    b = remainder
  }
  steps.push(`gcd = ${a}`)
  return steps
}
