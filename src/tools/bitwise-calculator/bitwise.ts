/**
 * 32-bit integer bitwise arithmetic, matching JavaScript's typed operator
 * semantics: operands and results are signed 32-bit values, `>>` is an
 * arithmetic shift that keeps the sign, and every readout shows the two's
 * complement bit pattern via the unsigned projection (`>>> 0`).
 *
 * Divergence from upstream: invalid text silently became 0 because
 * `parseInt` was applied unchecked. Parsing is strict here, values outside
 * the signed 32-bit range are rejected, and the interface reports the error
 * instead of computing a misleading result from zero.
 */

export const minimumBitwiseValue = -2147483648
export const maximumBitwiseValue = 2147483647

export type BitwiseOperation = "AND" | "OR" | "XOR" | "NOT" | "LSHIFT" | "RSHIFT"

export interface BitwiseOperationDefinition {
  id: BitwiseOperation
  label: string
  symbol: string
  unary: boolean
}

export const bitwiseOperations: readonly BitwiseOperationDefinition[] = [
  { id: "AND", label: "AND", symbol: "&", unary: false },
  { id: "OR", label: "OR", symbol: "|", unary: false },
  { id: "XOR", label: "XOR", symbol: "^", unary: false },
  { id: "NOT", label: "NOT", symbol: "~", unary: true },
  { id: "LSHIFT", label: "Left Shift", symbol: "<<", unary: false },
  { id: "RSHIFT", label: "Right Shift", symbol: ">>", unary: false },
]

export function getBitwiseOperation(id: string): BitwiseOperationDefinition {
  const operation = bitwiseOperations.find((candidate) => candidate.id === id)
  if (!operation) throw new RangeError(`Unknown bitwise operation: ${id}`)
  return operation
}

const integerPattern = /^[+-]?\d+$/

/** Strict signed-decimal parsing within the 32-bit signed integer range. */
export function parseBitwiseValue(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === "" || trimmed.length > 11) return null
  if (!integerPattern.test(trimmed)) return null
  const value = Number(trimmed)
  if (value < minimumBitwiseValue || value > maximumBitwiseValue) return null
  return value
}

/**
 * Binary representation padded to `bits`, truncated from the left when the
 * two's complement pattern is longer (upstream parity).
 */
export function toBinaryBits(value: number, bits: number): string {
  if (!Number.isInteger(value)) return ""
  const unsigned = value < 0 ? value >>> 0 : value
  const binary = unsigned.toString(2)
  if (bits <= binary.length) return binary.slice(-bits)
  return binary.padStart(bits, "0")
}

/** Uppercase hexadecimal readout of the two's complement pattern. */
export function toHex32(value: number): string {
  if (!Number.isInteger(value)) return "0x0"
  return `0x${(value >>> 0).toString(16).toUpperCase()}`
}

/** Signed 32-bit operation result; `b` is ignored for unary operations. */
export function computeBitwiseResult(
  operation: BitwiseOperation,
  valueA: number,
  valueB: number,
): number {
  switch (operation) {
    case "AND":
      return valueA & valueB
    case "OR":
      return valueA | valueB
    case "XOR":
      return valueA ^ valueB
    case "NOT":
      return ~valueA
    case "LSHIFT":
      return valueA << valueB
    case "RSHIFT":
      return valueA >> valueB
  }
}

export const bitwiseDisplayBitsOptions = [8, 16, 32] as const
