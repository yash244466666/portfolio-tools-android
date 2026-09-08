/**
 * Pure text ⇄ binary/octal/decimal conversion for the Text-Binary Converter,
 * always through UTF-8 bytes (TextEncoder/TextDecoder semantics). Original
 * work for this repository; no upstream code is copied.
 */
import { parseBoundedDecimal } from "@/tools/_shared/bounded-parse"

export type NumberBase = "binary" | "octal" | "decimal"
export type ByteDelimiter = "space" | "newline" | "none"

export const numberBases: readonly NumberBase[] = ["binary", "octal", "decimal"]
export const byteDelimiters: readonly ByteDelimiter[] = ["space", "newline", "none"]

export const delimiterTokens: Record<ByteDelimiter, string> = {
  space: " ",
  newline: "\n",
  none: "",
}

/** Base for each selectable representation. */
export function baseFor(base: NumberBase): number {
  switch (base) {
    case "binary":
      return 2
    case "octal":
      return 8
    case "decimal":
      return 10
  }
}

/** The shared bounded-input cap for text in this tool. */
export const maximumTextCharacters = 10_000

/**
 * Encodes text into per-byte numbers in the chosen base, joined by the
 * chosen delimiter. With the "none" delimiter every token is zero-padded to
 * the base's full byte width so the un-delimited stream chunks unambiguously.
 * Empty input encodes to an empty string.
 */
export function encodeText(text: string, base: NumberBase, delimiter: ByteDelimiter): string {
  const bytes = new TextEncoder().encode(text)
  const radix = baseFor(base)
  const token = delimiterTokens[delimiter]
  const width = Math.ceil(8 / Math.log2(radix))
  return [...bytes]
    .map((byte) => {
      const value = byte.toString(radix)
      return delimiter === "none" ? value.padStart(width, "0") : value
    })
    .join(token)
}

export type DecodeFailure =
  { status: "ok"; text: string; byteCount: number } | { status: "error"; message: string }

/**
 * Decodes per-byte numbers in the chosen base back into UTF-8 text. Parsing
 * is strict: the shared decimal grammar applies to every token after the
 * base-specific prefix split, malformed or out-of-range tokens fail with a
 * typed message, and byte sequences that are not valid UTF-8 fail closed
 * instead of producing replacement characters silently.
 */
export function decodeText(
  input: string,
  base: NumberBase,
  delimiter: ByteDelimiter,
): DecodeFailure {
  const trimmed = input.trim()
  if (trimmed === "") return { status: "error", message: "Enter the encoded values to decode." }

  const radix = baseFor(base)
  const separator =
    delimiter === "none"
      ? new RegExp(`[\\s\\S]{${Math.ceil(8 / Math.log2(radix))}}`, "g")
      : delimiterTokens[delimiter]
  const tokens =
    delimiter === "none"
      ? (trimmed.match(separator) ?? [])
      : trimmed.split(delimiterTokens[delimiter]).filter((token) => token !== "")

  const bytes: number[] = []
  const width = Math.ceil(8 / Math.log2(radix))
  const digitPattern = base === "binary" ? /^[01]+$/ : base === "octal" ? /^[0-7]+$/ : /^\d+$/
  for (const token of tokens) {
    if (base === "decimal") {
      const parsed = parseBoundedDecimal(token, {
        minimum: 0,
        maximum: 255,
        outOfRange: "reject",
      })
      if (!parsed) {
        return { status: "error", message: `"${token.slice(0, 32)}" is not a valid ${base} value.` }
      }
      bytes.push(parsed.value)
      continue
    }
    if (!digitPattern.test(token) || token.length > width) {
      return { status: "error", message: `"${token.slice(0, 32)}" is not a valid ${base} value.` }
    }
    const value = Number.parseInt(token, radix)
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return {
        status: "error",
        message: `"${token.slice(0, 32)}" is outside the 0-255 range for ${base}.`,
      }
    }
    bytes.push(value)
  }

  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes))
    return { status: "ok", text, byteCount: bytes.length }
  } catch {
    return {
      status: "error",
      message: "These bytes are not valid UTF-8, so they cannot be decoded into text.",
    }
  }
}
