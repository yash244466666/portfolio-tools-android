/**
 * Pure random selection for the Random Picker.
 *
 * Every draw comes from the platform RandomService byte stream. Indices use
 * rejection sampling on the smallest byte width that covers the bound, so a
 * list of three or a range of ten never favors earlier values. No Math.random
 * is used anywhere.
 *
 * Original work for this repository; no upstream code is copied.
 */

export const maximumItems = 1000
export const maximumListChars = 20_000
export const maximumItemChars = 200
/** Inclusive integer ranges may span at most 2^32 - 1 values. */
export const maximumRangeSpan = 4_294_967_295

export interface RandomByteSource {
  bytes(length: number): Uint8Array
}

export type ParsedList = { status: "ok"; items: string[] } | { status: "error"; message: string }

/**
 * One item per line. Empty lines are ignored, duplicates stay as separate
 * entries, and at least two items are required for a meaningful draw.
 */
export function parseList(text: string): ParsedList {
  if (text.length > maximumListChars) {
    return {
      status: "error",
      message: `The list is limited to ${maximumListChars.toLocaleString("en-US")} characters.`,
    }
  }
  const rawLines = text.split(/\r?\n/u)
  const items: string[] = []
  for (const [index, raw] of rawLines.entries()) {
    const item = raw.trim()
    if (item === "") continue
    if (item.length > maximumItemChars) {
      return {
        status: "error",
        message: `Line ${index + 1} exceeds ${maximumItemChars} characters.`,
      }
    }
    items.push(item)
  }
  if (items.length > maximumItems) {
    return { status: "error", message: `Use at most ${maximumItems} items.` }
  }
  if (items.length < 2) {
    return { status: "error", message: "Add at least two items, one per line." }
  }
  return { status: "ok", items }
}

/**
 * Uniform integer in [0, bound) by rejection sampling. Bound 1..2^32.
 * Values at or above the largest multiple of the bound are redrawn, so the
 * modulo cannot bias the result.
 */
export function randomBelow(bound: number, random: RandomByteSource): number {
  if (!Number.isSafeInteger(bound) || bound < 1 || bound > 4_294_967_296) {
    throw new RangeError("The random bound must be an integer between 1 and 2^32.")
  }
  const byteWidth = bound <= 0x100 ? 1 : bound <= 0x10000 ? 2 : bound <= 0x1000000 ? 3 : 4
  const range = 2 ** (8 * byteWidth)
  const limit = Math.floor(range / bound) * bound
  for (;;) {
    const bytes = random.bytes(byteWidth)
    if (bytes.length !== byteWidth) {
      throw new Error("The secure random source returned the wrong number of bytes.")
    }
    let value = 0
    for (const byte of bytes) value = value * 256 + byte
    if (value < limit) return value % bound
  }
}

export function pickFromList(items: readonly string[], random: RandomByteSource): string {
  if (items.length === 0) throw new RangeError("Cannot pick from an empty list.")
  return items[randomBelow(items.length, random)] ?? ""
}

export function flipCoin(random: RandomByteSource): "Heads" | "Tails" {
  return randomBelow(2, random) === 0 ? "Heads" : "Tails"
}

export function parseIntegerInput(value: string): number | null {
  const trimmed = value.trim()
  if (!/^-?\d+$/u.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) ? parsed : null
}

export type ParsedRange =
  { status: "ok"; minimum: number; maximum: number } | { status: "error"; message: string }

/** Parses an inclusive integer range and enforces the sampling bound. */
export function parseRange(minimumRaw: string, maximumRaw: string): ParsedRange {
  const minimum = parseIntegerInput(minimumRaw)
  const maximum = parseIntegerInput(maximumRaw)
  if (minimum === null || maximum === null) {
    return { status: "error", message: "Enter whole numbers for the minimum and maximum." }
  }
  if (minimum > maximum) {
    return { status: "error", message: "The minimum must not be greater than the maximum." }
  }
  if (maximum - minimum > maximumRangeSpan) {
    return {
      status: "error",
      message: "The range is too large; use a span of at most 4,294,967,295.",
    }
  }
  return { status: "ok", minimum, maximum }
}

/** Inclusive random integer in [minimum, maximum]. */
export function randomInteger(minimum: number, maximum: number, random: RandomByteSource): number {
  if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || minimum > maximum) {
    throw new RangeError("Invalid random integer range.")
  }
  const span = maximum - minimum
  if (span > maximumRangeSpan) {
    throw new RangeError("Random integer range is too large.")
  }
  return minimum + randomBelow(span + 1, random)
}
